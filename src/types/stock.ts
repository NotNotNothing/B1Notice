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
  lastUpdate: string;
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

export interface KLineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AlertType = 'PRICE' | 'VOLUME' | 'CHANGE_PERCENT' | 'KDJ_J' | 'WEEKLY_KDJ_J';
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
