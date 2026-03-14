import { KLine, KDJResult } from '../longbridge/types';
import {
  ZhixingTrendResult,
  SellSignalResult,
} from '../../utils/indicators';

export type DataSourceType = 'longbridge' | 'akshare';

export interface QuoteData {
  price: number;
  volume: number;
  changeRate: number;
}

export interface StockInfo {
  symbol: string;
  nameCn: string;
  nameEn?: string;
  market: string;
}

export interface BBIData {
  bbi: number;
  ma3: number;
  ma6: number;
  ma12: number;
  ma24: number;
  aboveBBIConsecutiveDays: boolean;
  belowBBIConsecutiveDays: boolean;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
}

export interface StockDataWithIndicators {
  id: string;
  symbol: string;
  name: string;
  nameCn: string;
  market: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  updatedAt: string;
  kdj?: {
    k: number;
    d: number;
    j: number;
  };
  weeklyKdj?: {
    k: number;
    d: number;
    j: number;
  };
}

export const KLINE_PERIOD = {
  DAY: 14,
  WEEK: 15,
} as const;

export type KlinePeriodType = (typeof KLINE_PERIOD)[keyof typeof KLINE_PERIOD];

export interface IQuoteProvider {
  readonly name: DataSourceType;
  readonly displayName: string;

  initialize(): Promise<void>;

  getQuote(symbol: string): Promise<QuoteData | null>;

  getStockQuotes(symbols: string[]): Promise<StockDataWithIndicators[]>;

  getKLineData(
    symbol: string,
    count?: number,
    period?: KlinePeriodType,
  ): Promise<KLine[]>;

  calculateKDJ(
    symbol: string,
    klinePeriod?: KlinePeriodType,
  ): Promise<KDJResult[]>;

  calculateBBI(symbol: string): Promise<BBIData | null>;

  calculateZhixingTrend(
    symbol: string,
    options?: unknown,
  ): Promise<ZhixingTrendResult | null>;

  checkSellSignal(symbol: string): Promise<SellSignalResult | null>;

  getStockInfo(symbol: string): Promise<StockInfo | null>;

  isAvailable(): Promise<boolean>;

  destroy?(): Promise<void>;
}
