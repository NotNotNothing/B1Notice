import 'server-only';
import {
  IQuoteProvider,
  DataSourceType,
  QuoteData,
  StockInfo,
  BBIData,
  StockDataWithIndicators,
  KLINE_PERIOD,
  KlinePeriodType,
} from '../types';
import { KLine, KDJResult } from '../../longbridge/types';
import {
  ZhixingTrendResult,
  SellSignalResult,
  calculateBBI,
  calculateZhixingTrend,
  checkBBIConsecutiveDays,
  checkSellSignal,
  ZhixingTrendOptions,
} from '../../../utils/indicators';
import { Config, QuoteContext, SecurityQuote, Candlestick } from 'longport';

const ADJUST_TYPE_NO_ADJUST = 0;

export class LongbridgeProvider implements IQuoteProvider {
  readonly name: DataSourceType = 'longbridge';
  readonly displayName = 'Longbridge (港股/美股)';

  private config: Config | null = null;
  private quoteContext: QuoteContext | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.config = Config.fromEnv();
      this.initialized = true;
    } catch (error) {
      console.error('[Longbridge] 初始化失败:', error);
      throw error;
    }
  }

  private async getQuoteContext(): Promise<QuoteContext> {
    if (!this.config) {
      throw new Error('Longbridge provider not initialized');
    }
    if (!this.quoteContext) {
      this.quoteContext = await QuoteContext.new(this.config);
    }
    return this.quoteContext;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      const hasCredentials =
        !!process.env.LONGPORT_APP_KEY &&
        !!process.env.LONGPORT_APP_SECRET &&
        !!process.env.LONGPORT_ACCESS_TOKEN;
      return hasCredentials;
    } catch {
      return false;
    }
  }

  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const ctx = await this.getQuoteContext();
      const quote = await ctx.quote([symbol]);
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
      console.error(`[Longbridge] 获取行情失败: ${symbol}`, error);
      return null;
    }
  }

  async getStockQuotes(symbols: string[]): Promise<StockDataWithIndicators[]> {
    const ctx = await this.getQuoteContext();
    const quotes = await ctx.quote(symbols);

    const kdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, KLINE_PERIOD.DAY),
    );
    const weeklyKdjPromises = symbols.map((symbol) =>
      this.calculateKDJ(symbol, KLINE_PERIOD.WEEK),
    );
    const staticInfoPromises = symbols.map((symbol) =>
      this.getStockInfo(symbol),
    );

    const [kdjResults, weeklyKdjResults, staticInfoResults] = await Promise.all(
      [
        Promise.all(kdjPromises),
        Promise.all(weeklyKdjPromises),
        Promise.all(staticInfoPromises),
      ],
    );

    return quotes.map((quote: SecurityQuote, index: number) => {
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

  async getKLineData(
    symbol: string,
    count: number = 100,
    period: KlinePeriodType = KLINE_PERIOD.DAY,
  ): Promise<KLine[]> {
    const ctx = await this.getQuoteContext();
    let response: Candlestick[];

    try {
      response = await ctx.candlesticks(symbol, period, count, ADJUST_TYPE_NO_ADJUST);
    } catch (error) {
      const message =
        error instanceof Error ? String(error.message) : String(error);
      if (message.includes('connections limitation is hit')) {
        console.warn('[Longbridge] 连接数达到上限，重新创建连接...');
        this.quoteContext = null;
        const retryCtx = await this.getQuoteContext();
        response = await retryCtx.candlesticks(symbol, period, count, ADJUST_TYPE_NO_ADJUST);
      } else {
        throw error;
      }
    }

    console.log(
      `[K线数据][Longbridge] ${symbol} 周期: ${period === KLINE_PERIOD.WEEK ? '周线' : '日线'}, 数量: ${response.length}`,
    );

    return response.map((candle) => ({
      close: candle.close.toNumber(),
      high: candle.high.toNumber(),
      low: candle.low.toNumber(),
      open: candle.open?.toNumber() || 0,
      volume: candle.volume || 0,
      timestamp: candle.timestamp.getTime(),
    }));
  }

  private calculateSMA(data: number[], period: number, weight: number): number[] {
    const result: number[] = [];
    let sma = data[0];
    result.push(sma);

    for (let i = 1; i < data.length; i++) {
      sma = (sma * (period - weight) + data[i] * weight) / period;
      result.push(sma);
    }

    return result;
  }

  private calculateRSV(kLines: KLine[], period: number = 9): number[] {
    return kLines.map((_, index) => {
      const startIndex = Math.max(0, index - period + 1);
      const periodData = kLines.slice(startIndex, index + 1);

      const highestHigh = Math.max(...periodData.map((d) => d.high));
      const lowestLow = Math.min(...periodData.map((d) => d.low));
      const currentClose = kLines[index].close;

      if (highestHigh === lowestLow) return 50;
      return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    });
  }

  async calculateKDJ(
    symbol: string,
    klinePeriod: KlinePeriodType = KLINE_PERIOD.DAY,
  ): Promise<KDJResult[]> {
    const period = 9;
    try {
      const kLineData = await this.getKLineData(symbol, 400, klinePeriod);
      const rsv = this.calculateRSV(kLineData, period);

      const kSeries = this.calculateSMA(rsv, 3, 1);
      const dSeries = this.calculateSMA(kSeries, 3, 1);

      return kSeries.map((kValue, index) => {
        const dValue = dSeries[index];
        const jValue = 3 * kValue - 2 * dValue;

        return {
          k: parseFloat(kValue.toFixed(2)),
          d: parseFloat(dValue.toFixed(2)),
          j: parseFloat(jValue.toFixed(2)),
          timestamp: kLineData[index].timestamp,
        };
      });
    } catch (error) {
      console.error('[Longbridge] 计算 KDJ 失败:', error);
      throw error;
    }
  }

  async calculateBBI(symbol: string): Promise<BBIData | null> {
    try {
      const kLineData = await this.getKLineData(symbol, 50, KLINE_PERIOD.DAY);

      if (kLineData.length < 24) {
        console.warn(`[Longbridge] K线数据不足，无法计算BBI: ${symbol}`);
        return null;
      }

      const formattedData = kLineData.map((k) => ({
        timestamp: new Date(k.timestamp).toISOString(),
        open: k.close,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: 0,
      }));

      const bbiResult = calculateBBI(formattedData);

      const historicalData = kLineData
        .map((k, index) => {
          const dayData = formattedData.slice(0, index + 1);
          const dayBBI = calculateBBI(dayData);
          return {
            close: k.close,
            bbi: dayBBI.bbi,
            date: new Date(k.timestamp).toISOString(),
          };
        })
        .filter((d) => d.bbi > 0);

      const consecutiveCheck = checkBBIConsecutiveDays(historicalData);

      return {
        ...bbiResult,
        ...consecutiveCheck,
      };
    } catch (error) {
      console.error('[Longbridge] 计算 BBI 失败:', error);
      return null;
    }
  }

  async calculateZhixingTrend(
    symbol: string,
    options?: ZhixingTrendOptions,
  ): Promise<ZhixingTrendResult | null> {
    try {
      const kLineData = await this.getKLineData(symbol, 400, KLINE_PERIOD.DAY);

      if (kLineData.length === 0) {
        console.warn(`[Longbridge] K线数据不足，无法计算知行多空趋势线: ${symbol}`);
        return null;
      }

      const formattedData = kLineData.map((k) => ({
        timestamp: new Date(k.timestamp).toISOString(),
        open: k.close,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: 0,
      }));

      return calculateZhixingTrend(formattedData, options);
    } catch (error) {
      console.error('[Longbridge] 计算知行趋势线失败:', error);
      return null;
    }
  }

  async checkSellSignal(symbol: string): Promise<SellSignalResult | null> {
    try {
      const kLineData = await this.getKLineData(symbol, 240, KLINE_PERIOD.DAY);
      if (kLineData.length < 2) {
        console.warn(`[Longbridge] K线数据不足，无法检测卖出信号: ${symbol}`);
        return null;
      }

      const indicatorKLines = kLineData.map((k) => ({
        timestamp: k.timestamp.toString(),
        open: k.close,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: 0,
      }));

      const zhixingTrendData = calculateZhixingTrend(indicatorKLines);
      if (!zhixingTrendData) {
        console.warn(`[Longbridge] 无法计算知行趋势线数据: ${symbol}`);
        return null;
      }

      const recentKLines = indicatorKLines.slice(-10);

      return checkSellSignal(
        recentKLines,
        zhixingTrendData.series,
        zhixingTrendData.whiteLine,
      );
    } catch (error) {
      console.error('[Longbridge] 检测卖出信号失败:', error);
      return null;
    }
  }

  async getStockInfo(symbol: string): Promise<StockInfo | null> {
    try {
      const ctx = await this.getQuoteContext();
      const staticInfo = await ctx.staticInfo([symbol]);
      if (staticInfo && staticInfo.length > 0) {
        const info = staticInfo[0];
        return {
          symbol: symbol,
          nameCn: info.nameCn || '',
          nameEn: info.nameEn || '',
          market: symbol.split('.')[1] || 'UNKNOWN',
        };
      }
      return null;
    } catch (error) {
      console.error('[Longbridge] 获取股票信息失败:', error);
      return null;
    }
  }

  async destroy(): Promise<void> {
    this.quoteContext = null;
    this.initialized = false;
  }
}

export function createLongbridgeProvider(): IQuoteProvider {
  return new LongbridgeProvider();
}
