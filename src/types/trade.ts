export type TradeSide = 'BUY' | 'SELL';

export type StopRule = 'whiteLine' | 'yellowLine';

export interface TradeRecord {
  id: string;
  symbol: string;
  securityName?: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
  note?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopRule?: StopRule;
  isLuZhu?: boolean; // 标记已完结，不再处理止盈止损
}
