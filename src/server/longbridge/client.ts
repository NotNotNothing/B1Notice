import { Config, QuoteContext, SecurityQuote } from 'longport';
import { KLine, KDJResult } from './types';
import { StockData } from '../../types/stock';

// K线周期定义
export const KLINE_PERIOD = {
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

  private async getStockStaticInfo(symbol: string) {
    try {
      const ctx = await this.getQuoteContext();
      const staticInfo = await ctx.staticInfo([symbol]);
      if (staticInfo && staticInfo.length > 0) {
        return staticInfo[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching stock static info:', error);
      return null;
    }
  }

  private async fetchStockQuotes(symbols: string[]): Promise<StockData[]> {
    const ctx = await this.getQuoteContext();
    const quotes = await ctx.quote(symbols);
    // 日线和周线都使用9个周期计算KDJ，只是基础数据不同
    const kdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, KLINE_PERIOD.DAY),
    ); // 日线KDJ
    const weeklyKdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, KLINE_PERIOD.WEEK),
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

      return {
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
    });
  }

  async getStockQuotes(symbols: string[]): Promise<StockData[]> {
    try {
      return await this.fetchStockQuotes(symbols);
    } catch (error) {
      console.error('Error fetching stock quotes:', error);
      throw error;
    }
  }

  private async fetchKLineData(
    symbol: string,
    count: number = 100,
    period: number = KLINE_PERIOD.DAY,
  ): Promise<KLine[]> {
    const ctx = await this.getQuoteContext();
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

    return kLineData;
  }

  async getKLineData(
    symbol: string,
    count: number = 100,
    period: number = KLINE_PERIOD.DAY,
  ): Promise<KLine[]> {
    try {
      return await this.fetchKLineData(symbol, count, period);
    } catch (error) {
      console.error('Error fetching K-line data:', error);
      throw error;
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
      // 确保有足够的历史数据计算RSV
      if (index < period - 1) return 50;

      const startIndex = Math.max(0, index - period + 1);
      const periodData = kLines.slice(startIndex, index + 1);

      const highestHigh = Math.max(...periodData.map((d) => d.high));
      const lowestLow = Math.min(...periodData.map((d) => d.low));
      const currentClose = kLines[index].close;

      // 处理高低点相同的情况
      if (highestHigh === lowestLow) return 50;
      return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    });
  }

  async calculateKDJ(
    symbol: string,
    klinePeriod: number = KLINE_PERIOD.DAY,
  ): Promise<KDJResult[]> {
    const period = 9;
    try {
      // 增加获取的K线数量以确保计算准确性（周线需要更长的历史数据）
      const kLineData = await this.getKLineData(symbol, 200, klinePeriod);
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
}

// 单例模式
let client: LongBridgeClient | null = null;

export function getLongBridgeClient() {
  if (!client) {
    client = new LongBridgeClient();
  }
  return client;
}
