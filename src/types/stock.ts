export interface StockData {
  id: string;
  symbol: string;
  name: string;
  nameCn: string;
  market: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
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
  bbi?: {
    bbi: number;
    ma3: number;
    ma6: number;
    ma12: number;
    ma24: number;
    aboveBBIConsecutiveDays: boolean;
    belowBBIConsecutiveDays: boolean;
    aboveBBIConsecutiveDaysCount: number;
    belowBBIConsecutiveDaysCount: number;
  };
  zhixingTrend?: {
    whiteLine: number;
    yellowLine: number;
    previousWhiteLine: number;
    previousYellowLine: number;
    isGoldenCross: boolean;
    isDeathCross: boolean;
    updatedAt?: string;
  };
  sellSignal?: {
    hasSellSignal: boolean;
    consecutiveDaysBelowWhiteLine: number;
    lastTwoDaysData: Array<{
      date: string;
      price: number;
      whiteLine: number;
      belowWhiteLine: boolean;
    }>;
  };
  buySignal?: {
    hasBuySignal: boolean;
    conditions: {
      whiteAboveYellow: boolean;
      jBelowThreshold: boolean;
      volumeContraction: boolean;
    };
    whiteLine: number;
    yellowLine: number;
    jValue: number;
    volume: number;
    avgVolume: number;
  };
}

export interface KLineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AlertType = 'PRICE' | 'VOLUME' | 'CHANGE_PERCENT' | 'KDJ_J' | 'WEEKLY_KDJ_J' | 'BBI_ABOVE_CONSECUTIVE' | 'BBI_BELOW_CONSECUTIVE' | 'SELL_SIGNAL';
export type AlertCondition = 'ABOVE' | 'BELOW';

export interface AlertConfig {
  id: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  enabled: boolean;
}

export interface ChartData {
  timestamp: string;
  value: number;
}

export interface StockState {
  data: StockData[];
  alerts: AlertConfig[];
  loading: boolean;
  error: string | null;
}
