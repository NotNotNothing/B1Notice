import { Config, QuoteContext, SecurityQuote } from 'longport';
import { KLine, KDJResult } from './types';
import { StockData } from '../../types/stock';
import redis from '../../lib/redis';

const CACHE_EXPIRY = 60; // 缓存过期时间（秒）
const CACHE_PREFIX = {
  QUOTES: 'stock:quotes:',
  KLINE: 'stock:kline:',
  KDJ: 'stock:kdj:',
  STATIC_INFO: 'stock:static:',
};

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
    const kdjPromises = symbols.map((symbol) => this.calculateKDJ(symbol));
    const staticInfoPromises = symbols.map((symbol) =>
      this.getStockStaticInfo(symbol),
    );

    const [kdjResults, staticInfoResults] = await Promise.all([
      Promise.all(kdjPromises),
      Promise.all(staticInfoPromises),
    ]);

    return quotes.map((quote: SecurityQuote, index) => {
      const lastDone = Number(quote.lastDone);
      const prevClose = Number(quote.prevClose);
      const change = lastDone - prevClose;
      const changePercent = (change / prevClose) * 100;
      const staticInfo = staticInfoResults[index];

      const stockData: StockData = {
        symbol: symbols[index],
        name: quote.symbol,
        nameCn: staticInfo?.nameCn || '',
        price: lastDone,
        changePercent,
        volume: Number(quote.volume),
        marketCap: Number(quote.postMarketQuote),
        lastUpdate: new Date().toISOString(),
        kdj: {
          k: kdjResults[index][kdjResults[index].length - 1].k,
          d: kdjResults[index][kdjResults[index].length - 1].d,
          j: kdjResults[index][kdjResults[index].length - 1].j,
        },
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
  ): Promise<KLine[]> {
    const ctx = await this.getQuoteContext();
    const response = await ctx.candlesticks(symbol, 14, count, 0);

    const kLineData = response.map((candle) => ({
      close: candle.close.toNumber(),
      high: candle.high.toNumber(),
      low: candle.low.toNumber(),
      timestamp: candle.timestamp.getTime(),
    }));

    // 尝试缓存数据
    const cacheKey = `${CACHE_PREFIX.KLINE}${symbol}:${count}`;
    redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(kLineData));

    return kLineData;
  }

  async getKLineData(symbol: string, count: number = 100): Promise<KLine[]> {
    try {
      // 尝试从缓存获取数据
      const cacheKey = `${CACHE_PREFIX.KLINE}${symbol}:${count}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 如果没有缓存数据，从 API 获取
      return await this.fetchKLineData(symbol, count);
    } catch (error) {
      console.error('Error fetching K-line data:', error);
      // 如果发生错误，直接从 API 获取数据
      return await this.fetchKLineData(symbol, count);
    }
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

  async calculateKDJ(symbol: string, period: number = 9): Promise<KDJResult[]> {
    try {
      const kLineData = await this.getKLineData(symbol);
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

      const quote = await this.quoteContext.securityQuote([symbol]);
      if (!quote || quote.length === 0) return null;

      const securityQuote = quote[0];
      return {
        price: securityQuote.price,
        volume: securityQuote.volume,
        changeRate: securityQuote.changeRate,
      };
    } catch (error) {
      console.error(`获取行情数据失败: ${error}`);
      return null;
    }
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
