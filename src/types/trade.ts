export type TradeSide = 'BUY' | 'SELL';

export type StopRule = 'whiteLine' | 'yellowLine';

export interface TradeRecord {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
  note?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopRule?: StopRule;
}
