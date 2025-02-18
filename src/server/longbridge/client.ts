import { Config, QuoteContext, SecurityQuote } from 'longport';
import { KLine, KDJResult } from './types';
import { StockData } from '../../types/stock';
import redis from '../../lib/redis';

const CACHE_EXPIRY = 60; // 缓存过期时间（秒）
const CACHE_PREFIX = {
  QUOTES: '1min:stock:quotes:',
  KLINE: '1min:stock:kline:',
  KDJ: '1min:stock:kdj:',
  STATIC_INFO: '1min:stock:static:',
};

// K线周期定义
const KLINE_PERIOD = {
  DAY: 14, // Period.Day
  WEEK: 15, // Period.Week
} as const;

export class LongBridgeClient {
  private config: Config;
  private quoteContext: QuoteContext | null = null;

  constructor() {
    this.config = Config.fromEnv();
  }

  private async getQuoteContext() {
    if (!this.quoteContext) {
      this.quoteContext = await QuoteContext.new(this.config);
    }
    return this.quoteContext;
  }

  private async fetchStockStaticInfo(symbol: string) {
    const ctx = await this.getQuoteContext();
    const staticInfo = await ctx.staticInfo([symbol]);
    if (staticInfo && staticInfo.length > 0) {
      const info = staticInfo[0];
      // 缓存静态信息
      redis.setex(
        CACHE_PREFIX.STATIC_INFO + symbol,
        CACHE_EXPIRY,
        JSON.stringify(info),
      );
      return info;
    }
    return null;
  }

  private async getStockStaticInfo(symbol: string) {
    try {
      // 尝试从缓存获取数据
      const cached = await redis.get(CACHE_PREFIX.STATIC_INFO + symbol);
      if (cached) {
        return JSON.parse(cached);
      }
      // 如果没有缓存数据，从 API 获取
      return await this.fetchStockStaticInfo(symbol);
    } catch (error) {
      console.error('Error fetching stock static info:', error);
      return await this.fetchStockStaticInfo(symbol);
    }
  }

  private async fetchStockQuotes(symbols: string[]): Promise<StockData[]> {
    const ctx = await this.getQuoteContext();
    const quotes = await ctx.quote(symbols);
    // 日线和周线都使用9个周期计算KDJ，只是基础数据不同
    const kdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, 9, KLINE_PERIOD.DAY),
    ); // 日线KDJ
    const weeklyKdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, 9, KLINE_PERIOD.WEEK),
    ); // 周线KDJ
    const staticInfoPromises = symbols.map((symbol) =>
      this.getStockStaticInfo(symbol),
    );

    const [kdjResults, weeklyKdjResults, staticInfoResults] = await Promise.all(
      [
        Promise.all(kdjPromises),
        Promise.all(weeklyKdjPromises),
        Promise.all(staticInfoPromises),
      ],
    );

    return quotes.map((quote: SecurityQuote, index) => {
      const lastDone = Number(quote.lastDone);
      const prevClose = Number(quote.prevClose);
      const change = lastDone - prevClose;
      const changePercent = (change / prevClose) * 100;
      const staticInfo = staticInfoResults[index];

      const stockData: StockData = {
        id: `${symbols[index]}_${new Date().toISOString()}`,
        symbol: symbols[index],
        name: quote.symbol,
        nameCn: staticInfo?.nameCn || '',
        market: symbols[index].split('.')[1] || 'UNKNOWN',
        price: lastDone,
        changePercent,
        volume: Number(quote.volume),
        marketCap: Number(quote.postMarketQuote),
        updatedAt: new Date().toISOString(),
        kdj: kdjResults[index]?.length
          ? {
              k: kdjResults[index][kdjResults[index].length - 1].k,
              d: kdjResults[index][kdjResults[index].length - 1].d,
              j: kdjResults[index][kdjResults[index].length - 1].j,
            }
          : undefined,
        weeklyKdj: weeklyKdjResults[index]?.length
          ? {
              k: weeklyKdjResults[index][weeklyKdjResults[index].length - 1].k,
              d: weeklyKdjResults[index][weeklyKdjResults[index].length - 1].d,
              j: weeklyKdjResults[index][weeklyKdjResults[index].length - 1].j,
            }
          : undefined,
      };

      // 尝试缓存数据
      redis.setex(
        CACHE_PREFIX.QUOTES + stockData.symbol,
        CACHE_EXPIRY,
        JSON.stringify(stockData),
      );

      return stockData;
    });
  }

  async getStockQuotes(symbols: string[]): Promise<StockData[]> {
    try {
      // 尝试从缓存获取数据
      const cachedData = await Promise.all(
        symbols.map(async (symbol) => {
          const cached = await redis.get(CACHE_PREFIX.QUOTES + symbol);
          return cached ? JSON.parse(cached) : null;
        }),
      );

      // 如果所有数据都在缓存中，直接返回
      if (cachedData.every((data) => data !== null)) {
        return cachedData as StockData[];
      }

      // 如果有部分数据在缓存中
      if (cachedData.some((data) => data !== null)) {
        const uncachedSymbols = symbols.filter(
          (symbol, index) => !cachedData[index],
        );
        const freshData = await this.fetchStockQuotes(uncachedSymbols);

        // 合并缓存数据和新数据
        return symbols.map((symbol, index) => {
          const cached = cachedData[index];
          if (cached) return cached;
          return freshData.find((data) => data.symbol === symbol)!;
        });
      }

      // 如果没有缓存数据，直接获取所有数据
      return await this.fetchStockQuotes(symbols);
    } catch (error) {
      console.error('Error fetching stock quotes:', error);
      // 如果发生错误，尝试直接从 API 获取数据
      return await this.fetchStockQuotes(symbols);
    }
  }

  private async fetchKLineData(
    symbol: string,
    count: number = 100,
    period: number = KLINE_PERIOD.DAY,
  ): Promise<KLine[]> {
    const ctx = await this.getQuoteContext();

    // 直接使用传入的period参数，不需要特殊处理count
    const response = await ctx.candlesticks(symbol, period, count, 0);
    console.log(
      `[K线数据] 获取到${symbol}的K线数据，周期: ${
        period === KLINE_PERIOD.WEEK ? '周线' : '日线'
      }, 数量: ${response.length}`,
    );

    const kLineData = response.map((candle) => ({
      close: candle.close.toNumber(),
      high: candle.high.toNumber(),
      low: candle.low.toNumber(),
      timestamp: candle.timestamp.getTime(),
    }));

    // 对于周线数据，打印一些示例数据用于验证
    if (period === KLINE_PERIOD.WEEK) {
      console.log(`[周线数据] ${symbol} 最近5周数据示例:`);
      kLineData.slice(-5).forEach((data, idx) => {
        const date = new Date(data.timestamp);
        console.log(
          `[周线数据] [${idx}] 时间: ${date.toISOString()}, 收盘: ${
            data.close
          }, 最高: ${data.high}, 最低: ${data.low}`,
        );
      });
    }

    // 尝试缓存数据
    const cacheKey = `${CACHE_PREFIX.KLINE}${symbol}:${count}:${period}`;
    redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(kLineData));

    return kLineData;
  }

  async getKLineData(
    symbol: string,
    count: number = 100,
    period: number = KLINE_PERIOD.DAY, // 默认日线
  ): Promise<KLine[]> {
    try {
      // 尝试从缓存获取数据
      const cacheKey = `${CACHE_PREFIX.KLINE}${symbol}:${count}:${period}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 如果没有缓存数据，从 API 获取
      return await this.fetchKLineData(symbol, count, period);
    } catch (error) {
      console.error('Error fetching K-line data:', error);
      // 如果发生错误，直接从 API 获取数据
      return await this.fetchKLineData(symbol, count, period);
    }
  }

  private calculateSMA(
    data: number[],
    period: number,
    weight: number,
  ): number[] {
    const result: number[] = [];
    let sma = data[0]; // 第一个值作为初始值
    result.push(sma);

    for (let i = 1; i < data.length; i++) {
      // SMA = (前一日SMA × (N-1) + 今日数值) / N
      sma = (sma * (period - weight) + data[i] * weight) / period;
      result.push(sma);
    }

    return result;
  }

  private calculateRSV(kLines: KLine[], period: number = 9): number[] {
    return kLines.map((_, index) => {
      if (index < period - 1) return 50;

      const periodData = kLines.slice(index - period + 1, index + 1);
      const highestHigh = Math.max(...periodData.map((d) => d.high));
      const lowestLow = Math.min(...periodData.map((d) => d.low));
      const currentClose = kLines[index].close;

      if (highestHigh === lowestLow) return 50;
      return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    });
  }

  async calculateKDJ(
    symbol: string,
    period: number = 9,
    klinePeriod: number = KLINE_PERIOD.DAY,
  ): Promise<KDJResult[]> {
    try {
      const kLineData = await this.getKLineData(symbol, undefined, klinePeriod);
      const rsv = this.calculateRSV(kLineData, period);

      const result: KDJResult[] = [];
      let k = 50;
      let d = 50;

      for (let i = 0; i < rsv.length; i++) {
        k = (2 / 3) * k + (1 / 3) * rsv[i];
        d = (2 / 3) * d + (1 / 3) * k;
        const j = 3 * k - 2 * d;

        result.push({
          k: parseFloat(k.toFixed(2)),
          d: parseFloat(d.toFixed(2)),
          j: parseFloat(j.toFixed(2)),
          timestamp: kLineData[i].timestamp,
        });
      }

      return result;
    } catch (error) {
      console.error('Error calculating KDJ:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<{
    price: number;
    volume: number;
    changeRate: number;
  } | null> {
    try {
      if (!this.quoteContext) {
        this.quoteContext = await QuoteContext.new(this.config);
      }

      if (!this.quoteContext) {
        throw new Error('Failed to create QuoteContext');
      }

      const quote = await this.quoteContext.quote([symbol]);
      if (!quote || quote.length === 0) return null;

      const securityQuote = quote[0];
      const lastDone = Number(securityQuote.lastDone);
      const prevClose = Number(securityQuote.prevClose);
      return {
        price: lastDone,
        volume: Number(securityQuote.volume),
        changeRate: ((lastDone - prevClose) / prevClose) * 100,
      };
    } catch (error) {
      console.error(`获取行情数据失败: ${error}`);
      return null;
    }
  }

  async getStockInfo(symbol: string) {
    return this.getStockStaticInfo(symbol);
  }

  private async fetchWeeklyKLineData(
    symbol: string,
    count: number = 100,
  ): Promise<KLine[]> {
    const ctx = await this.getQuoteContext();
    // 使用周期类型 6 表示周K线
    const response = await ctx.candlesticks(symbol, 6, count, 0);

    const kLineData = response.map((candle) => ({
      close: candle.close.toNumber(),
      high: candle.high.toNumber(),
      low: candle.low.toNumber(),
      timestamp: candle.timestamp.getTime(),
    }));

    // 缓存周K线数据
    const cacheKey = `${CACHE_PREFIX.KLINE}weekly:${symbol}:${count}`;
    redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(kLineData));

    return kLineData;
  }

  async getWeeklyKLineData(
    symbol: string,
    count: number = 100,
  ): Promise<KLine[]> {
    try {
      // 尝试从缓存获取数据
      const cacheKey = `${CACHE_PREFIX.KLINE}weekly:${symbol}:${count}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 如果没有缓存数据，从 API 获取
      return await this.fetchWeeklyKLineData(symbol, count);
    } catch (error) {
      console.error('Error fetching weekly K-line data:', error);
      return await this.fetchWeeklyKLineData(symbol, count);
    }
  }

  async calculateWeeklyKDJ(
    symbol: string,
    period: number = 9,
  ): Promise<KDJResult[]> {
    // 直接复用通用计算方法，指定周线周期
    return this.calculateKDJ(symbol, period, KLINE_PERIOD.WEEK);
  }
}

// 单例模式
let client: LongBridgeClient | null = null;

export function getLongBridgeClient() {
  if (!client) {
    client = new LongBridgeClient();
  }
  return client;
}
