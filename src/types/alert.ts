export interface AlertConfig {
  id: string;
  stockSymbol: string;
  type: string;        // PRICE, VOLUME, CHANGE_PERCENT, KDJ_J
  condition: string;   // ABOVE, BELOW
  threshold: number;
  enabled: boolean;
}
