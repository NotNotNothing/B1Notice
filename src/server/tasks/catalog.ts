export type TaskCategory = 'DATA_SYNC' | 'MONITOR' | 'SCREENING' | 'INDICATOR';

export type TaskDefinitionKey =
  | 'stock-refresh-a-share'
  | 'stock-refresh-hk'
  | 'stock-refresh-us'
  | 'monitor-check-a-share'
  | 'monitor-check-hk'
  | 'monitor-check-us'
  | 'kdj-calc-a-share'
  | 'kdj-calc-hk'
  | 'closing-screener-a-share';

export type TaskTriggerSource = 'SYSTEM' | 'USER' | 'RETRY';

export interface TaskDefinitionCatalogItem {
  key: TaskDefinitionKey;
  name: string;
  category: TaskCategory;
  schedule: string | null;
  supportsPause: boolean;
  supportsStop: boolean;
  supportsRetry: boolean;
  maxRetries: number;
}

export const TASK_DEFINITION_CATALOG: TaskDefinitionCatalogItem[] = [
  {
    key: 'stock-refresh-a-share',
    name: 'A股行情刷新',
    category: 'DATA_SYNC',
    schedule: '工作日盘中每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'stock-refresh-hk',
    name: '港股行情刷新',
    category: 'DATA_SYNC',
    schedule: '工作日盘中每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'stock-refresh-us',
    name: '美股行情刷新',
    category: 'DATA_SYNC',
    schedule: '交易时段每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'monitor-check-a-share',
    name: 'A股指标监控',
    category: 'MONITOR',
    schedule: '工作日盘中每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'monitor-check-hk',
    name: '港股指标监控',
    category: 'MONITOR',
    schedule: '工作日盘中每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'monitor-check-us',
    name: '美股指标监控',
    category: 'MONITOR',
    schedule: '交易时段每 5 分钟',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'kdj-calc-a-share',
    name: 'A股 KDJ 计算',
    category: 'INDICATOR',
    schedule: '工作日 14:50-15:00 窗口内触发',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'kdj-calc-hk',
    name: '港股 KDJ 计算',
    category: 'INDICATOR',
    schedule: '工作日 15:50-16:00 窗口内触发',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
  {
    key: 'closing-screener-a-share',
    name: 'A股收盘选股',
    category: 'SCREENING',
    schedule: '工作日 15:10-16:00 窗口内触发',
    supportsPause: true,
    supportsStop: true,
    supportsRetry: true,
    maxRetries: 3,
  },
];

const taskDefinitionCatalogMap = new Map(
  TASK_DEFINITION_CATALOG.map((item) => [item.key, item] as const),
);

export function getTaskCatalogItem(key: TaskDefinitionKey): TaskDefinitionCatalogItem {
  const item = taskDefinitionCatalogMap.get(key);

  if (!item) {
    throw new Error(`未知任务定义: ${key}`);
  }

  return item;
}
