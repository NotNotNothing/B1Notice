import { AdjustType, Config, Period, QuoteContext } from 'longport';

interface KLine {
  close: number;
  high: number;
  low: number;
  timestamp: number;
}

interface KDJResult {
  k: number;
  d: number;
  j: number;
  timestamp: number;
}

export class LongBridgeClient {
  private config: any;
  private quoteContext: any = null;

  constructor() {
    // 配置将在初始化时设置
  }

  private async initialize() {
    if (!this.config) {
      try {
        const { Config } = await import('longport');
        this.config = Config.fromEnv();
      } catch (error) {
        console.error('Failed to initialize LongBridge config:', error);
        throw new Error('初始化LongBridge配置失败');
      }
    }
  }

  private async getQuoteContext() {
    if (!this.quoteContext) {
      try {
        await this.initialize();
        const { QuoteContext } = await import('longport');
        this.quoteContext = await QuoteContext.new(this.config);
      } catch (error) {
        console.error('Failed to create QuoteContext:', error);
        throw new Error('创建行情上下文失败');
      }
    }
    return this.quoteContext;
  }

  async getKLineData(
    symbol: string,
    period: string = '1d',
    count: number = 100,
  ): Promise<KLine[]> {
    try {
      const longport = await import('longport');
      const ctx = await this.getQuoteContext();
      const response = await ctx.candlesticks(
        symbol,
        'day',
        count,
        'no_adjust',
      );

      return response.map((candle: any) => ({
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

export const createLongBridgeClient = () => {
  return new LongBridgeClient();
};
