import { AlertType, AlertCondition } from './stock';

// API 请求和响应的类型
export interface CreateMonitorRequest {
  stockSymbol: string;
  type: AlertType;
  condition: AlertCondition;
  threshold: number;
  isActive: boolean;
  costLine?: number;
}

export interface MonitorResponse {
  id: string;
  stockSymbol: string;
  type: AlertType;
  condition: AlertCondition;
  threshold: number;
  isActive: boolean;
  costLine?: number;
  createdAt: string;
  updatedAt: string;
}

// 前端使用的类型
export interface AlertConfig {
  id: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  enabled: boolean;
  costLine?: number;
}

// 转换函数
export const monitorToAlert = (monitor: MonitorResponse): AlertConfig => ({
  id: monitor.id,
  symbol: monitor.stockSymbol,
  type: monitor.type,
  condition: monitor.condition,
  value: monitor.threshold,
  enabled: monitor.isActive,
  costLine: monitor.costLine,
});