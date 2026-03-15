import 'server-only';
import { spawn } from 'child_process';
import path from 'path';
import {
  IQuoteProvider,
  DataSourceType,
  QuoteData,
  StockInfo,
  MarketStockInfo,
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

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'akshare_proxy.py');

interface AKShareResponse<T> {
  error?: string;
  [key: string]: unknown;
}

class AKShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AKShareError';
  }
}

async function runPython<T>(args: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [SCRIPT_PATH, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new AKShareError(`Python exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout) as AKShareResponse<T>;
        if (result.error) {
          reject(new AKShareError(result.error));
          return;
        }
        resolve(result as T);
      } catch (e) {
        reject(new AKShareError(`Failed to parse response: ${stdout}`));
      }
    });

    python.on('error', (err) => {
      reject(new AKShareError(`Failed to start Python: ${err.message}`));
    });
  });
}

export class AKShareProvider implements IQuoteProvider {
  readonly name: DataSourceType = 'akshare';
  readonly displayName = 'AKShare (A股)';

  private initialized = false;
  private available = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const result = await runPython<{ available: boolean; message: string }>(['check']);
      this.available = result.available;
      this.initialized = true;
      
      if (!this.available) {
        console.warn('[AKShare] 初始化警告:', result.message);
      }
    } catch (error) {
      console.error('[AKShare] 初始化失败:', error);
      this.available = false;
      this.initialized = true;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.available;
  }

  async getQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const result = await runPython<QuoteData & { nameCn: string; market: string }>(['quote', symbol]);
      return {
        price: result.price,
        volume: result.volume,
        changeRate: result.changeRate,
      };
    } catch (error) {
      console.error(`[AKShare] 获取行情失败: ${symbol}`, error);
      return null;
    }
  }

  async getStockQuotes(symbols: string[]): Promise<StockDataWithIndicators[]> {
    try {
      const results = await runPython<
        Array<{
          symbol: string;
          price: number;
          volume: number;
          changePercent: number;
          nameCn: string;
          market: string;
          name: string;
          error?: string;
        }>
      >(['quotes', JSON.stringify(symbols)]);

      const kdjPromises = symbols.map((symbol) =>
        this.calculateKDJ(symbol, KLINE_PERIOD.DAY).catch(() => null),
      );
      const weeklyKdjPromises = symbols.map((symbol) =>
        this.calculateKDJ(symbol, KLINE_PERIOD.WEEK).catch(() => null),
      );

      const [kdjResults, weeklyKdjResults] = await Promise.all([
        Promise.all(kdjPromises),
        Promise.all(weeklyKdjPromises),
      ]);

      return results.map((data, index) => {
        if (data.error) {
          return {
            id: `${data.symbol}_${new Date().toISOString()}`,
            symbol: data.symbol,
            name: data.symbol,
            nameCn: '',
            market: 'UNKNOWN',
            price: 0,
            changePercent: 0,
            volume: 0,
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          id: `${data.symbol}_${new Date().toISOString()}`,
          symbol: data.symbol,
          name: data.name || data.symbol,
          nameCn: data.nameCn || '',
          market: data.market || 'A_STOCK',
          price: data.price,
          changePercent: data.changePercent,
          volume: data.volume,
          updatedAt: new Date().toISOString(),
          kdj: kdjResults[index]?.length
            ? {
                k: kdjResults[index]![kdjResults[index]!.length - 1].k,
                d: kdjResults[index]![kdjResults[index]!.length - 1].d,
                j: kdjResults[index]![kdjResults[index]!.length - 1].j,
              }
            : undefined,
          weeklyKdj: weeklyKdjResults[index]?.length
            ? {
                k: weeklyKdjResults[index]![weeklyKdjResults[index]!.length - 1].k,
                d: weeklyKdjResults[index]![weeklyKdjResults[index]!.length - 1].d,
                j: weeklyKdjResults[index]![weeklyKdjResults[index]!.length - 1].j,
              }
            : undefined,
        };
      });
    } catch (error) {
      console.error('[AKShare] 批量获取行情失败:', error);
      return [];
    }
  }

  async getKLineData(
    symbol: string,
    count: number = 100,
    period: KlinePeriodType = KLINE_PERIOD.DAY,
  ): Promise<KLine[]> {
    try {
      const periodStr = period === KLINE_PERIOD.WEEK ? 'weekly' : 'daily';
      const result = await runPython<KLine[]>(['kline', symbol, periodStr, count.toString()]);
      return result;
    } catch (error) {
      console.error(`[AKShare] 获取K线数据失败: ${symbol}`, error);
      return [];
    }
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
      
      if (kLineData.length === 0) {
        return [];
      }

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
      console.error('[AKShare] 计算 KDJ 失败:', error);
      return [];
    }
  }

  async calculateBBI(symbol: string): Promise<BBIData | null> {
    try {
      const kLineData = await this.getKLineData(symbol, 50, KLINE_PERIOD.DAY);

      if (kLineData.length < 24) {
        console.warn(`[AKShare] K线数据不足，无法计算BBI: ${symbol}`);
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
      console.error('[AKShare] 计算 BBI 失败:', error);
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
        console.warn(`[AKShare] K线数据不足，无法计算知行多空趋势线: ${symbol}`);
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
      console.error('[AKShare] 计算知行趋势线失败:', error);
      return null;
    }
  }

  async checkSellSignal(symbol: string): Promise<SellSignalResult | null> {
    try {
      const kLineData = await this.getKLineData(symbol, 240, KLINE_PERIOD.DAY);
      if (kLineData.length < 2) {
        console.warn(`[AKShare] K线数据不足，无法检测卖出信号: ${symbol}`);
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
        console.warn(`[AKShare] 无法计算知行趋势线数据: ${symbol}`);
        return null;
      }

      const recentKLines = indicatorKLines.slice(-10);

      return checkSellSignal(
        recentKLines,
        zhixingTrendData.series,
        zhixingTrendData.whiteLine,
      );
    } catch (error) {
      console.error('[AKShare] 检测卖出信号失败:', error);
      return null;
    }
  }

  async getStockInfo(symbol: string): Promise<StockInfo | null> {
    try {
      const result = await runPython<StockInfo>(['info', symbol]);
      return result;
    } catch (error) {
      console.error(`[AKShare] 获取股票信息失败: ${symbol}`, error);
      return null;
    }
  }

  async getMarketStocks(market: string): Promise<MarketStockInfo[]> {
    if (!['SH', 'SZ', 'A'].includes(market.toUpperCase())) {
      return [];
    }

    try {
      const result = await runPython<MarketStockInfo[]>(['universe', market.toUpperCase()]);
      return result;
    } catch (error) {
      console.error('[AKShare] 获取 A 股股票池失败:', error);
      return [];
    }
  }
}

export function createAKShareProvider(): IQuoteProvider {
  return new AKShareProvider();
}
