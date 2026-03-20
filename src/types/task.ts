export type TaskCategory = 'DATA_SYNC' | 'MONITOR' | 'SCREENING' | 'INDICATOR';

export type TaskRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type TaskTriggerSource = 'SYSTEM' | 'USER' | 'RETRY';

export interface TaskRunView {
  id: string;
  taskDefinitionId: string;
  taskKey: string;
  taskName: string;
  category: TaskCategory;
  status: TaskRunStatus;
  triggeredBy: TaskTriggerSource;
  runReason: string | null;
  retryOfRunId: string | null;
  attempt: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  progressLabel: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  stopRequestedAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDefinitionView {
  id: string;
  key: string;
  name: string;
  category: TaskCategory;
  schedule: string | null;
  isEnabled: boolean;
  isPaused: boolean;
  supportsPause: boolean;
  supportsStop: boolean;
  supportsRetry: boolean;
  maxRetries: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  lastStatus: TaskRunStatus | null;
  latestRun: TaskRunView | null;
}

export interface TaskRunEventView {
  id: string;
  level: string;
  eventType: string;
  message: string;
  details: string | null;
  createdAt: string;
}

export interface TaskRunDetailView extends TaskRunView {
  events: TaskRunEventView[];
}

export interface TaskApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}
