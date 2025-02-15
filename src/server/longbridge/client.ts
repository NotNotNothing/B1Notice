import { Config, QuoteContext, SecurityQuote } from 'longport';
import { KLine, KDJResult } from './types';
import { StockData } from '../../types/stock';

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

  async getStockQuotes(symbols: string[]): Promise<StockData[]> {
    try {
      const ctx = await this.getQuoteContext();
      const quotes = await ctx.quote(symbols);
      const kdjPromises = symbols.map((symbol) => this.calculateKDJ(symbol));
      const kdjResults = await Promise.all(kdjPromises);

      return quotes.map((quote: SecurityQuote, index) => {
        const lastDone = Number(quote.lastDone);
        const prevClose = Number(quote.prevClose);
        const change = lastDone - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
          symbol: symbols[index],
          name: quote.symbol,
          price: lastDone,
          change,
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
      });
    } catch (error) {
      console.error('Error fetching stock quotes:', error);
      throw error;
    }
  }

  async getKLineData(symbol: string, count: number = 100): Promise<KLine[]> {
    try {
      const ctx = await this.getQuoteContext();
      const response = await ctx.candlesticks(
        symbol,
        14, //Period.Day,
        count,
        0, //AdjustType.NoAdjust,
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
