import 'server-only';

import type {
  TaskDefinition as PrismaTaskDefinition,
  TaskRun as PrismaTaskRun,
  TaskRunEvent as PrismaTaskRunEvent,
} from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { createMonitorScheduler } from '@/lib/scheduler';
import { closingScreenerService } from '@/server/screener/service';

import {
  getTaskCatalogItem,
  TASK_DEFINITION_CATALOG,
  type TaskDefinitionKey,
  type TaskTriggerSource,
} from './catalog';
import { TaskStopRequestedError } from './errors';
import type {
  TaskDefinitionView,
  TaskExecutionContext,
  TaskRunDetailView,
  TaskRunEventView,
  TaskRunStatus,
  TaskRunView,
} from './types';

type TriggerTaskOptions = {
  triggeredBy?: TaskTriggerSource;
  reason?: string | null;
  awaitCompletion?: boolean;
  retryOfRunId?: string | null;
  attempt?: number;
  metadata?: Record<string, unknown> | null;
};

type TaskRunWithDefinition = PrismaTaskRun & {
  taskDefinition: PrismaTaskDefinition;
};

type TaskRunWithDefinitionAndEvents = TaskRunWithDefinition & {
  events: PrismaTaskRunEvent[];
};

const RUNNING_STATUSES: TaskRunStatus[] = ['RUNNING', 'STOPPING'];
const DEFAULT_RUN_LIMIT = 30;

const monitorScheduler = createMonitorScheduler();

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function parseMetadata(
  value: string | null,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : { raw: value };
  } catch {
    return { raw: value };
  }
}

function stringifyMetadata(
  value: Record<string, unknown> | null | undefined,
): string | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }

  return JSON.stringify(value);
}

function mapTaskRunEvent(event: PrismaTaskRunEvent): TaskRunEventView {
  return {
    id: event.id,
    level: event.level,
    eventType: event.eventType,
    message: event.message,
    details: event.details,
    createdAt: event.createdAt.toISOString(),
  };
}

function mapTaskRun(run: TaskRunWithDefinition): TaskRunView {
  return {
    id: run.id,
    taskDefinitionId: run.taskDefinitionId,
    taskKey: run.taskDefinition.key as TaskDefinitionKey,
    taskName: run.taskDefinition.name,
    category: run.taskDefinition.category as TaskDefinitionView['category'],
    status: run.status as TaskRunStatus,
    triggeredBy: run.triggeredBy as TaskTriggerSource,
    runReason: run.runReason,
    retryOfRunId: run.retryOfRunId,
    attempt: run.attempt,
    startedAt: toIsoString(run.startedAt),
    finishedAt: toIsoString(run.finishedAt),
    errorMessage: run.errorMessage,
    progressCurrent: run.progressCurrent,
    progressTotal: run.progressTotal,
    progressLabel: run.progressLabel,
    summary: run.summary,
    metadata: parseMetadata(run.metadata),
    stopRequestedAt: toIsoString(run.stopRequestedAt),
    pausedAt: toIsoString(run.pausedAt),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function mapTaskRunDetail(run: TaskRunWithDefinitionAndEvents): TaskRunDetailView {
  return {
    ...mapTaskRun(run),
    events: run.events.map(mapTaskRunEvent),
  };
}

export class TaskCenterService {
  private syncPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    await this.syncDefinitions();
  }

  async bootstrapInitialTasks(): Promise<void> {
    await this.syncDefinitions();

    const bootstrapTargets: TaskDefinitionKey[] = [
      'stock-refresh-a-share',
      'stock-refresh-hk',
      'stock-refresh-us',
    ];

    for (const key of bootstrapTargets) {
      void this.triggerTaskByKey(key, {
        triggeredBy: 'SYSTEM',
        reason: '服务启动后初始化数据',
        awaitCompletion: false,
        metadata: { bootstrap: true },
      });
    }
  }

  async listDefinitions(): Promise<TaskDefinitionView[]> {
    await this.syncDefinitions();

    const definitions = await prisma.taskDefinition.findMany({
      include: {
        runs: {
          include: {
            taskDefinition: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return definitions.map((definition) => ({
      id: definition.id,
      key: definition.key as TaskDefinitionKey,
      name: definition.name,
      category: definition.category as TaskDefinitionView['category'],
      schedule: definition.schedule,
      isEnabled: definition.isEnabled,
      isPaused: definition.isPaused,
      supportsPause: definition.supportsPause,
      supportsStop: definition.supportsStop,
      supportsRetry: definition.supportsRetry,
      maxRetries: definition.maxRetries,
      lastRunAt: toIsoString(definition.lastRunAt),
      lastSuccessAt: toIsoString(definition.lastSuccessAt),
      lastFailedAt: toIsoString(definition.lastFailedAt),
      lastStatus: (definition.lastStatus as TaskRunStatus | null) ?? null,
      latestRun: definition.runs[0] ? mapTaskRun(definition.runs[0]) : null,
    }));
  }

  async listRuns(input?: {
    definitionId?: string | null;
    status?: TaskRunStatus | null;
    limit?: number | null;
  }): Promise<TaskRunView[]> {
    await this.syncDefinitions();

    const runs = await prisma.taskRun.findMany({
      where: {
        ...(input?.definitionId ? { taskDefinitionId: input.definitionId } : {}),
        ...(input?.status ? { status: input.status } : {}),
      },
      include: {
        taskDefinition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: input?.limit ?? DEFAULT_RUN_LIMIT,
    });

    return runs.map(mapTaskRun);
  }

  async getRunDetail(runId: string): Promise<TaskRunDetailView | null> {
    await this.syncDefinitions();

    const run = await prisma.taskRun.findUnique({
      where: { id: runId },
      include: {
        taskDefinition: true,
        events: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return run ? mapTaskRunDetail(run) : null;
  }

  async pauseDefinition(definitionId: string): Promise<TaskDefinitionView> {
    await this.syncDefinitions();

    const definition = await prisma.taskDefinition.update({
      where: { id: definitionId },
      data: {
        isPaused: true,
      },
    });

    return this.getDefinitionView(definition.id, definition.key as TaskDefinitionKey);
  }

  async resumeDefinition(definitionId: string): Promise<TaskDefinitionView> {
    await this.syncDefinitions();

    const definition = await prisma.taskDefinition.update({
      where: { id: definitionId },
      data: {
        isPaused: false,
      },
    });

    return this.getDefinitionView(definition.id, definition.key as TaskDefinitionKey);
  }

  async requestStopRun(runId: string): Promise<TaskRunView> {
    await this.syncDefinitions();

    const run = await prisma.taskRun.findUnique({
      where: { id: runId },
      include: {
        taskDefinition: true,
      },
    });

    if (!run) {
      throw new Error('任务运行记录不存在');
    }

    if (!run.taskDefinition.supportsStop) {
      throw new Error('该任务不支持停止');
    }

    if (!RUNNING_STATUSES.includes(run.status as TaskRunStatus)) {
      throw new Error('当前任务未运行，无法停止');
    }

    const now = new Date();
    const nextRun = await prisma.taskRun.update({
      where: { id: runId },
      data: {
        status: 'STOPPING',
        stopRequestedAt: now,
      },
      include: {
        taskDefinition: true,
      },
    });

    await this.appendEvent(runId, {
      level: 'WARN',
      eventType: 'CONTROL',
      message: '已请求停止任务',
    });

    return mapTaskRun(nextRun);
  }

  async retryRun(
    runId: string,
    options?: Pick<TriggerTaskOptions, 'awaitCompletion'>,
  ): Promise<TaskRunView> {
    await this.syncDefinitions();

    const run = await prisma.taskRun.findUnique({
      where: { id: runId },
      include: {
        taskDefinition: true,
      },
    });

    if (!run) {
      throw new Error('任务运行记录不存在');
    }

    if (!run.taskDefinition.supportsRetry) {
      throw new Error('该任务不支持重试');
    }

    if (!['FAILED', 'STOPPED'].includes(run.status)) {
      throw new Error('只有失败或已停止的任务支持重试');
    }

    if (run.attempt >= run.taskDefinition.maxRetries) {
      throw new Error('已达到最大重试次数');
    }

    return this.triggerTaskByKey(run.taskDefinition.key as TaskDefinitionKey, {
      triggeredBy: 'RETRY',
      reason: `重试任务 ${run.taskDefinition.name}`,
      awaitCompletion: options?.awaitCompletion,
      retryOfRunId: run.id,
      attempt: run.attempt + 1,
      metadata: {
        retriedFromRunId: run.id,
      },
    });
  }

  async triggerTaskByDefinitionId(
    definitionId: string,
    options?: TriggerTaskOptions,
  ): Promise<TaskRunView> {
    await this.syncDefinitions();

    const definition = await prisma.taskDefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      throw new Error('任务定义不存在');
    }

    return this.triggerTaskByKey(definition.key as TaskDefinitionKey, options);
  }

  async triggerTaskByKey(
    key: TaskDefinitionKey,
    options?: TriggerTaskOptions,
  ): Promise<TaskRunView> {
    await this.syncDefinitions();

    const definition = await this.getDefinitionOrThrow(key);
    const triggeredBy = options?.triggeredBy ?? 'USER';

    if (!definition.isEnabled) {
      return this.createSkippedRun(definition, triggeredBy, '任务已停用');
    }

    if (triggeredBy === 'SYSTEM' && definition.isPaused) {
      return this.createSkippedRun(definition, triggeredBy, '任务已暂停，跳过系统调度');
    }

    const blockingRun = await prisma.taskRun.findFirst({
      where: {
        taskDefinitionId: definition.id,
        status: {
          in: RUNNING_STATUSES,
        },
      },
      include: {
        taskDefinition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (blockingRun) {
      return this.createSkippedRun(
        definition,
        triggeredBy,
        '已有同类任务在运行，跳过本次触发',
        {
          blockingRunId: blockingRun.id,
        },
      );
    }

    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.taskRun.create({
        data: {
          taskDefinitionId: definition.id,
          status: 'RUNNING',
          triggeredBy,
          runReason: options?.reason ?? null,
          retryOfRunId: options?.retryOfRunId ?? null,
          attempt: options?.attempt ?? 1,
          metadata: stringifyMetadata(options?.metadata),
          startedAt: new Date(),
        },
        include: {
          taskDefinition: true,
        },
      });

      await tx.taskDefinition.update({
        where: { id: definition.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: 'RUNNING',
        },
      });

      return createdRun;
    });

    const execution = this.executeTask(run);

    if (options?.awaitCompletion) {
      return execution;
    }

    void execution.catch((error) => {
      console.error(`[TaskCenter] 任务 ${key} 异步执行失败:`, error);
    });

    return mapTaskRun(run);
  }

  private async syncDefinitions(): Promise<void> {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = Promise.all(
      TASK_DEFINITION_CATALOG.map((item) =>
        prisma.taskDefinition.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            name: item.name,
            category: item.category,
            schedule: item.schedule,
            supportsPause: item.supportsPause,
            supportsStop: item.supportsStop,
            supportsRetry: item.supportsRetry,
            maxRetries: item.maxRetries,
          },
          update: {
            name: item.name,
            category: item.category,
            schedule: item.schedule,
            supportsPause: item.supportsPause,
            supportsStop: item.supportsStop,
            supportsRetry: item.supportsRetry,
            maxRetries: item.maxRetries,
          },
        }),
      ),
    )
      .then(() => undefined)
      .finally(() => {
        this.syncPromise = null;
      });

    return this.syncPromise;
  }

  private async getDefinitionOrThrow(
    key: TaskDefinitionKey,
  ): Promise<PrismaTaskDefinition> {
    const definition = await prisma.taskDefinition.findUnique({
      where: { key },
    });

    if (!definition) {
      throw new Error(`任务定义不存在: ${key}`);
    }

    return definition;
  }

  private async getDefinitionView(
    definitionId: string,
    expectedKey?: TaskDefinitionKey,
  ): Promise<TaskDefinitionView> {
    const definition = await prisma.taskDefinition.findUnique({
      where: { id: definitionId },
      include: {
        runs: {
          include: {
            taskDefinition: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!definition) {
      throw new Error('任务定义不存在');
    }

    if (expectedKey && definition.key !== expectedKey) {
      throw new Error('任务定义已失效');
    }

    return {
      id: definition.id,
      key: definition.key as TaskDefinitionKey,
      name: definition.name,
      category: definition.category as TaskDefinitionView['category'],
      schedule: definition.schedule,
      isEnabled: definition.isEnabled,
      isPaused: definition.isPaused,
      supportsPause: definition.supportsPause,
      supportsStop: definition.supportsStop,
      supportsRetry: definition.supportsRetry,
      maxRetries: definition.maxRetries,
      lastRunAt: toIsoString(definition.lastRunAt),
      lastSuccessAt: toIsoString(definition.lastSuccessAt),
      lastFailedAt: toIsoString(definition.lastFailedAt),
      lastStatus: (definition.lastStatus as TaskRunStatus | null) ?? null,
      latestRun: definition.runs[0] ? mapTaskRun(definition.runs[0]) : null,
    };
  }

  private async createSkippedRun(
    definition: PrismaTaskDefinition,
    triggeredBy: TaskTriggerSource,
    summary: string,
    metadata?: Record<string, unknown>,
  ): Promise<TaskRunView> {
    const now = new Date();

    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.taskRun.create({
        data: {
          taskDefinitionId: definition.id,
          status: 'SKIPPED',
          triggeredBy,
          startedAt: now,
          finishedAt: now,
          summary,
          metadata: stringifyMetadata(metadata),
        },
        include: {
          taskDefinition: true,
        },
      });

      await tx.taskDefinition.update({
        where: { id: definition.id },
        data: {
          lastRunAt: now,
          lastStatus: 'SKIPPED',
        },
      });

      return createdRun;
    });

    await this.appendEvent(run.id, {
      eventType: 'STATE',
      message: summary,
    });

    return mapTaskRun(run);
  }

  private async executeTask(run: TaskRunWithDefinition): Promise<TaskRunView> {
    const definition = getTaskCatalogItem(run.taskDefinition.key as TaskDefinitionKey);
    const context = this.createExecutionContext(
      run.id,
      run.taskDefinition.key as TaskDefinitionKey,
    );

    await this.appendEvent(run.id, {
      eventType: 'STATE',
      message: `${definition.name} 开始执行`,
    });

    try {
      await this.dispatchTask(run.taskDefinition.key as TaskDefinitionKey, run.triggeredBy as TaskTriggerSource, context);
      await context.throwIfStopRequested();

      const completedRun = await prisma.$transaction(async (tx) => {
        const nextRun = await tx.taskRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            finishedAt: new Date(),
            errorMessage: null,
          },
          include: {
            taskDefinition: true,
          },
        });

        await tx.taskDefinition.update({
          where: { id: run.taskDefinitionId },
          data: {
            lastStatus: 'COMPLETED',
            lastSuccessAt: new Date(),
          },
        });

        return nextRun;
      });

      await this.appendEvent(run.id, {
        eventType: 'STATE',
        message: `${definition.name} 执行完成`,
      });

      return mapTaskRun(completedRun);
    } catch (error) {
      if (error instanceof TaskStopRequestedError) {
        const stoppedRun = await prisma.$transaction(async (tx) => {
          const nextRun = await tx.taskRun.update({
            where: { id: run.id },
            data: {
              status: 'STOPPED',
              finishedAt: new Date(),
              summary: '任务已按请求停止',
            },
            include: {
              taskDefinition: true,
            },
          });

          await tx.taskDefinition.update({
            where: { id: run.taskDefinitionId },
            data: {
              lastStatus: 'STOPPED',
            },
          });

          return nextRun;
        });

        await this.appendEvent(run.id, {
          level: 'WARN',
          eventType: 'STATE',
          message: '任务已停止',
        });

        return mapTaskRun(stoppedRun);
      }

      const message =
        error instanceof Error ? error.message : '任务执行失败';

      const failedRun = await prisma.$transaction(async (tx) => {
        const nextRun = await tx.taskRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            errorMessage: message,
            summary: message,
          },
          include: {
            taskDefinition: true,
          },
        });

        await tx.taskDefinition.update({
          where: { id: run.taskDefinitionId },
          data: {
            lastStatus: 'FAILED',
            lastFailedAt: new Date(),
          },
        });

        return nextRun;
      });

      await this.appendEvent(run.id, {
        level: 'ERROR',
        eventType: 'ERROR',
        message,
      });

      return mapTaskRun(failedRun);
    }
  }

  private async dispatchTask(
    key: TaskDefinitionKey,
    triggeredBy: TaskTriggerSource,
    context: TaskExecutionContext,
  ): Promise<void> {
    switch (key) {
      case 'stock-refresh-a-share':
        await monitorScheduler.runStockRefreshTask(['SH', 'SZ'], context);
        return;
      case 'stock-refresh-hk':
        await monitorScheduler.runStockRefreshTask(['HK'], context);
        return;
      case 'stock-refresh-us':
        await monitorScheduler.runStockRefreshTask(['US'], context);
        return;
      case 'monitor-check-a-share':
        await monitorScheduler.runMonitorTask(['SH', 'SZ'], context);
        return;
      case 'monitor-check-hk':
        await monitorScheduler.runMonitorTask(['HK'], context);
        return;
      case 'monitor-check-us':
        await monitorScheduler.runMonitorTask(['US'], context);
        return;
      case 'kdj-calc-a-share':
        await monitorScheduler.runKdjCalculationTask(['SH', 'SZ'], context);
        return;
      case 'kdj-calc-hk':
        await monitorScheduler.runKdjCalculationTask(['HK'], context);
        return;
      case 'closing-screener-a-share':
        await closingScreenerService.runDailyAShareScreening({
          force: triggeredBy !== 'SYSTEM',
          taskContext: context,
        });
        return;
      default:
        throw new Error(`未实现的任务: ${key}`);
    }
  }

  private createExecutionContext(
    runId: string,
    definitionKey: TaskDefinitionKey,
  ): TaskExecutionContext {
    let lastCheckedAt = 0;
    let lastStopRequested = false;

    const checkStopRequested = async (): Promise<boolean> => {
      const now = Date.now();
      if (lastStopRequested && now - lastCheckedAt < 1000) {
        return true;
      }

      if (now - lastCheckedAt < 500) {
        return lastStopRequested;
      }

      const run = await prisma.taskRun.findUnique({
        where: { id: runId },
        select: {
          status: true,
          stopRequestedAt: true,
        },
      });

      lastCheckedAt = now;
      lastStopRequested = Boolean(
        run?.stopRequestedAt || run?.status === 'STOPPING',
      );
      return lastStopRequested;
    };

    return {
      runId,
      definitionKey,
      updateProgress: async (input) => {
        await prisma.taskRun.update({
          where: { id: runId },
          data: {
            ...(input.current !== undefined ? { progressCurrent: input.current } : {}),
            ...(input.total !== undefined ? { progressTotal: input.total } : {}),
            ...(input.label !== undefined ? { progressLabel: input.label } : {}),
            ...(input.summary !== undefined ? { summary: input.summary } : {}),
          },
        });
      },
      appendEvent: async (input) => {
        await this.appendEvent(runId, input);
      },
      setSummary: async (summary) => {
        await prisma.taskRun.update({
          where: { id: runId },
          data: {
            summary,
          },
        });
      },
      setMetadata: async (metadata) => {
        await prisma.taskRun.update({
          where: { id: runId },
          data: {
            metadata: stringifyMetadata(metadata),
          },
        });
      },
      isStopRequested: async () => {
        return checkStopRequested();
      },
      throwIfStopRequested: async () => {
        if (await checkStopRequested()) {
          throw new TaskStopRequestedError();
        }
      },
    };
  }

  private async appendEvent(
    runId: string,
    input: {
      level?: 'INFO' | 'WARN' | 'ERROR';
      eventType: string;
      message: string;
      details?: string | null;
    },
  ): Promise<void> {
    await prisma.taskRunEvent.create({
      data: {
        taskRunId: runId,
        level: input.level ?? 'INFO',
        eventType: input.eventType,
        message: input.message,
        details: input.details ?? null,
      },
    });
  }
}

export const taskCenterService = new TaskCenterService();
