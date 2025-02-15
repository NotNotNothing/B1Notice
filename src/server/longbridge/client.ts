import { Config, QuoteContext, Period, AdjustType } from 'longport';
import { KLine, KDJResult } from './types';

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

  async getKLineData(symbol: string, count: number = 100): Promise<KLine[]> {
    try {
      const ctx = await this.getQuoteContext();
      const response = await ctx.candlesticks(
        symbol,
        Period.Day,
        count,
        AdjustType.NoAdjust,
      );

      return response.map((candle) => ({
        close: candle.close.toNumber(),
        high: candle.high.toNumber(),
        low: candle.low.toNumber(),
        timestamp: candle.timestamp.getTime(),
      }));
    } catch (error) {
      console.error('Error fetching K-line data:', error);
      throw error;
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
}

// 单例模式
let client: LongBridgeClient | null = null;

export function getLongBridgeClient() {
  if (!client) {
    client = new LongBridgeClient();
  }
  return client;
}
