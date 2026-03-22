/**
 * 表格列宽配置工具
 * 用于统一管理 PC/移动端表格列宽
 */

export interface ColumnSize {
  size: number;      // 默认宽度
  minSize: number;   // 最小宽度
  maxSize: number;   // 最大宽度
}

// 股票列表列宽配置
export const STOCK_LIST_COLUMN_SIZES: Record<string, ColumnSize> = {
  name: { size: 180, minSize: 150, maxSize: 250 },
  price: { size: 100, minSize: 80, maxSize: 120 },
  changePercent: { size: 100, minSize: 90, maxSize: 130 },
  dailyJ: { size: 80, minSize: 70, maxSize: 100 },
  weeklyJ: { size: 80, minSize: 70, maxSize: 100 },
  whiteLine: { size: 80, minSize: 70, maxSize: 100 },
  yellowLine: { size: 80, minSize: 70, maxSize: 100 },
  bbi: { size: 80, minSize: 70, maxSize: 100 },
  signals: { size: 200, minSize: 150, maxSize: 300 },
  updatedAt: { size: 120, minSize: 100, maxSize: 150 },
};

// 交易记录列宽配置
export const TRADE_RECORD_COLUMN_SIZES: Record<string, ColumnSize> = {
  symbol: { size: 140, minSize: 120, maxSize: 180 },
  side: { size: 80, minSize: 70, maxSize: 100 },
  price: { size: 100, minSize: 90, maxSize: 120 },
  quantity: { size: 100, minSize: 90, maxSize: 120 },
  tradedAt: { size: 150, minSize: 130, maxSize: 180 },
  currentPrice: { size: 100, minSize: 90, maxSize: 120 },
  pnl: { size: 100, minSize: 90, maxSize: 120 },
  stopLoss: { size: 100, minSize: 90, maxSize: 120 },
  takeProfit: { size: 100, minSize: 90, maxSize: 120 },
  status: { size: 100, minSize: 90, maxSize: 120 },
};

// 任务运行列宽配置
export const TASK_RUN_COLUMN_SIZES: Record<string, ColumnSize> = {
  taskName: { size: 200, minSize: 180, maxSize: 280 },
  status: { size: 100, minSize: 90, maxSize: 120 },
  triggeredBy: { size: 100, minSize: 90, maxSize: 120 },
  startedAt: { size: 150, minSize: 130, maxSize: 180 },
  finishedAt: { size: 150, minSize: 130, maxSize: 180 },
  progress: { size: 100, minSize: 90, maxSize: 120 },
  summary: { size: 250, minSize: 200, maxSize: 400 },
};

// 收盘选股列宽配置
export const CLOSING_SCREENER_COLUMN_SIZES: Record<string, ColumnSize> = {
  name: { size: 140, minSize: 120, maxSize: 180 },
  price: { size: 80, minSize: 70, maxSize: 100 },
  dailyJ: { size: 80, minSize: 70, maxSize: 100 },
  weeklyJ: { size: 80, minSize: 70, maxSize: 100 },
  volumeRatio: { size: 80, minSize: 70, maxSize: 100 },
  bbi: { size: 80, minSize: 70, maxSize: 100 },
  reasons: { size: 250, minSize: 200, maxSize: 350 },
};

// 监控规则列宽配置
export const MONITOR_COLUMN_SIZES: Record<string, ColumnSize> = {
  symbol: { size: 140, minSize: 120, maxSize: 180 },
  type: { size: 140, minSize: 120, maxSize: 180 },
  condition: { size: 100, minSize: 90, maxSize: 120 },
  threshold: { size: 100, minSize: 90, maxSize: 120 },
  status: { size: 100, minSize: 90, maxSize: 120 },
  actions: { size: 120, minSize: 100, maxSize: 150 },
};
