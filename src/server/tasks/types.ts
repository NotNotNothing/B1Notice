import type { TaskCategory, TaskDefinitionKey, TaskTriggerSource } from './catalog';

export type TaskRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface TaskProgressUpdateInput {
  current?: number | null;
  total?: number | null;
  label?: string | null;
  summary?: string | null;
}

export interface TaskEventInput {
  level?: 'INFO' | 'WARN' | 'ERROR';
  eventType: string;
  message: string;
  details?: string | null;
}

export interface TaskExecutionContext {
  runId: string;
  definitionKey: TaskDefinitionKey;
  updateProgress(input: TaskProgressUpdateInput): Promise<void>;
  appendEvent(input: TaskEventInput): Promise<void>;
  setSummary(summary: string): Promise<void>;
  setMetadata(metadata: Record<string, unknown>): Promise<void>;
  isStopRequested(): Promise<boolean>;
  throwIfStopRequested(): Promise<void>;
}

export interface TaskDefinitionView {
  id: string;
  key: TaskDefinitionKey;
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

export interface TaskRunView {
  id: string;
  taskDefinitionId: string;
  taskKey: TaskDefinitionKey;
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
