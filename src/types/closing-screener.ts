export interface ClosingScreenerRule {
  enabled: boolean;
  notifyEnabled: boolean;
  maxDailyJ: number | null;
  maxWeeklyJ: number | null;
  requirePriceAboveBBI: boolean;
  minAboveBBIDays: number | null;
  minVolumeRatio: number | null;
}

export interface ClosingScreenerStock {
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePercent: number;
  volume: number;
  dailyK: number;
  dailyD: number;
  dailyJ: number;
  weeklyJ: number;
  bbi: number;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
  volumeRatio: number;
  reasons: string[];
}

export interface ClosingScreenerResults {
  rule: ClosingScreenerRule;
  run: {
    id: string;
    tradeDate: string;
    status: string;
    snapshotCount: number;
    totalSymbols: number;
    finishedAt: string | null;
  } | null;
  matchedStocks: ClosingScreenerStock[];
}
