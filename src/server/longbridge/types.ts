export interface KLine {
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  timestamp: number;
}

export interface KDJResult {
  k: number;
  d: number;
  j: number;
  timestamp: number;
}
