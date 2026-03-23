"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBeijingDateTime } from "@/lib/time";
import type {
  TaskApiEnvelope,
  TaskDefinitionView,
  TaskRunDetailView,
  TaskRunStatus,
  TaskRunView,
} from "@/types/task";

function getStatusBadgeClassName(status: TaskRunStatus | null): string {
  switch (status) {
    case "RUNNING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200";
    case "STOPPING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "FAILED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200";
    case "STOPPED":
      return "bg-surface-base text-foreground dark:bg-slate-800 dark:text-slate-200";
    case "SKIPPED":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200";
    case "PAUSED":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200";
    default:
      return "bg-surface-panel text-foreground dark:bg-slate-800 dark:text-slate-200";
  }
}

function formatStatusLabel(status: TaskRunStatus | null): string {
  switch (status) {
    case "PENDING":
      return "等待中";
    case "RUNNING":
      return "运行中";
    case "PAUSED":
      return "已暂停";
    case "STOPPING":
      return "停止中";
    case "STOPPED":
      return "已停止";
    case "COMPLETED":
      return "已完成";
    case "FAILED":
      return "失败";
    case "SKIPPED":
      return "已跳过";
    default:
      return "未知";
  }
}

function formatTriggerLabel(triggeredBy: TaskRunView["triggeredBy"]): string {
  switch (triggeredBy) {
    case "SYSTEM":
      return "系统调度";
    case "RETRY":
      return "失败重试";
    default:
      return "手动触发";
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }

  return formatBeijingDateTime(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProgressText(run: TaskRunView): string {
  if (
    typeof run.progressCurrent === "number" &&
    typeof run.progressTotal === "number" &&
    run.progressTotal > 0
  ) {
    return `${run.progressCurrent}/${run.progressTotal}`;
  }

  if (typeof run.progressCurrent === "number") {
    return String(run.progressCurrent);
  }

  return "--";
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as TaskApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "请求失败");
  }

  return payload.data;
}

export function TaskCenterPanel() {
  const [definitions, setDefinitions] = useState<TaskDefinitionView[]>([]);
  const [runs, setRuns] = useState<TaskRunView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TaskRunDetailView | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadOverview = async () => {
    const [nextDefinitions, nextRuns] = await Promise.all([
      fetch("/api/tasks").then((response) =>
        readEnvelope<TaskDefinitionView[]>(response),
      ),
      fetch("/api/tasks/runs?limit=20").then((response) =>
        readEnvelope<TaskRunView[]>(response),
      ),
    ]);

    startTransition(() => {
      setDefinitions(nextDefinitions);
      setRuns(nextRuns);
      setLoading(false);
    });
  };

  const loadRunDetail = async (runId: string) => {
    const run = await fetch(`/api/tasks/runs/${runId}`).then((response) =>
      readEnvelope<TaskRunDetailView>(response),
    );

    startTransition(() => {
      setSelectedRun(run);
      setDetailOpen(true);
    });
  };

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        await loadOverview();
        if (selectedRun?.id) {
          const detail = await fetch(`/api/tasks/runs/${selectedRun.id}`).then(
            (response) => readEnvelope<TaskRunDetailView>(response),
          );

          if (!active) {
            return;
          }

          startTransition(() => {
            setSelectedRun(detail);
          });
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "加载任务中心失败",
          );
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedRun?.id, startTransition]);

  const handleDefinitionAction = async (
    definition: TaskDefinitionView,
    action: "run" | "pause" | "resume",
  ) => {
    const endpoint =
      action === "run"
        ? `/api/tasks/${definition.id}/run`
        : `/api/tasks/${definition.id}/${action}`;

    try {
      setActionKey(`${action}-${definition.id}`);
      const response = await fetch(endpoint, {
        method: "POST",
      });
      const payload = await readEnvelope<TaskDefinitionView | TaskRunView>(
        response,
      );

      if (action === "run") {
        const run = payload as TaskRunView;
        toast.success(run.summary || "任务已触发");
        const blockingRunId =
          typeof run.metadata?.blockingRunId === "string"
            ? run.metadata.blockingRunId
            : null;
        if (run.status !== "SKIPPED") {
          await loadRunDetail(run.id);
        } else if (blockingRunId) {
          await loadRunDetail(blockingRunId);
        }
      } else {
        toast.success(action === "pause" ? "任务已暂停" : "任务已恢复");
      }

      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务操作失败");
    } finally {
      setActionKey(null);
    }
  };

  const handleRunAction = async (
    run: TaskRunView,
    action: "stop" | "retry" | "detail",
  ) => {
    if (action === "detail") {
      try {
        await loadRunDetail(run.id);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "加载任务详情失败",
        );
      }
      return;
    }

    try {
      setActionKey(`${action}-${run.id}`);
      const response = await fetch(`/api/tasks/runs/${run.id}/${action}`, {
        method: "POST",
      });
      const nextRun = await readEnvelope<TaskRunView>(response);
      toast.success(action === "stop" ? "已请求停止任务" : "任务重试已触发");
      if (action === "retry") {
        await loadRunDetail(nextRun.id);
      } else {
        startTransition(() => {
          setSelectedRun((current) =>
            current?.id === nextRun.id ? { ...current, ...nextRun } : current,
          );
        });
      }
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务操作失败");
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-terminal-border-default bg-white/90 shadow-sm backdrop-blur dark:border-terminal-border-default dark:bg-surface-panel/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Terminal className="h-5 w-5" />
            任务定义
          </CardTitle>
          <CardDescription>
            统一管理后台行情刷新、指标监控、收盘选股等任务，支持暂停、恢复和手动执行。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-terminal-border-default dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务名称</TableHead>
                  <TableHead>调度规则</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最近运行</TableHead>
                  <TableHead>最近成功</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {definitions.map((definition) => {
                  const running =
                    definition.latestRun?.status === "RUNNING" ||
                    definition.latestRun?.status === "STOPPING";
                  const actionPrefix = definition.isPaused ? "resume" : "pause";

                  return (
                    <TableRow key={definition.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {definition.name}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {definition.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              最大重试 {definition.maxRetries}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground dark:text-slate-300">
                        {definition.schedule || "仅手动执行"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusBadgeClassName(
                            definition.latestRun?.status ??
                              definition.lastStatus,
                          )}
                        >
                          {definition.isPaused
                            ? "已暂停"
                            : formatStatusLabel(
                                definition.latestRun?.status ??
                                  definition.lastStatus,
                              )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground dark:text-slate-300">
                        {formatDateTime(definition.lastRunAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground dark:text-slate-300">
                        {formatDateTime(definition.lastSuccessAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              void handleDefinitionAction(definition, "run")
                            }
                            disabled={
                              running || actionKey === `run-${definition.id}`
                            }
                            className="rounded-md"
                          >
                            {actionKey === `run-${definition.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden xl:inline">
                              手动执行
                            </span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void handleDefinitionAction(
                                definition,
                                definition.isPaused ? "resume" : "pause",
                              )
                            }
                            disabled={
                              actionKey === `${actionPrefix}-${definition.id}`
                            }
                            className="rounded-md"
                          >
                            {definition.isPaused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden xl:inline">
                              {definition.isPaused ? "恢复" : "暂停"}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {definitions.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground dark:text-slate-300"
                    >
                      暂无任务定义
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-terminal-border-default bg-white/90 shadow-sm backdrop-blur dark:border-terminal-border-default dark:bg-surface-panel/80">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-slate-900 dark:text-white">
              最近运行
            </CardTitle>
            <CardDescription>
              自动每 5 秒刷新一次，显示最近 20 条任务运行记录
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadOverview()}
            disabled={loading || isPending}
            className="rounded-md"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading || isPending ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-terminal-border-default dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead>任务名称</TableHead>
                  <TableHead className="hidden lg:table-cell">触发方式</TableHead>
                  <TableHead className="hidden md:table-cell">开始时间</TableHead>
                  <TableHead className="hidden xl:table-cell">结束时间</TableHead>
                  <TableHead className="hidden xl:table-cell">进度</TableHead>
                  <TableHead className="hidden 2xl:table-cell">摘要</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Badge className={getStatusBadgeClassName(run.status)}>
                        {formatStatusLabel(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {run.taskName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground md:hidden dark:text-slate-300">
                        {formatTriggerLabel(run.triggeredBy)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatTriggerLabel(run.triggeredBy)}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {formatDateTime(run.startedAt)}
                    </TableCell>
                    <TableCell className="hidden text-sm xl:table-cell">
                      {formatDateTime(run.finishedAt)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-sm">
                        <div>{getProgressText(run)}</div>
                        <div className="text-xs text-muted-foreground dark:text-slate-300">
                          第 {run.attempt} 次
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <div className="max-w-xs space-y-1">
                        <div className="truncate text-sm text-slate-900 dark:text-white">
                          {run.summary || "暂无摘要"}
                        </div>
                        {run.errorMessage ? (
                          <div className="truncate text-xs text-rose-600 dark:text-rose-300">
                            {run.errorMessage}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRunAction(run, "detail")}
                          className="rounded-md"
                        >
                          详情
                        </Button>
                        {run.status === "RUNNING" ||
                        run.status === "STOPPING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRunAction(run, "stop")}
                            disabled={
                              actionKey === `stop-${run.id}` ||
                              run.status === "STOPPING"
                            }
                            className="rounded-md"
                          >
                            {actionKey === `stop-${run.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden xl:inline">停止</span>
                          </Button>
                        ) : null}
                        {run.status === "FAILED" || run.status === "STOPPED" ? (
                          <Button
                            size="sm"
                            onClick={() => void handleRunAction(run, "retry")}
                            disabled={actionKey === `retry-${run.id}`}
                            className="rounded-md"
                          >
                            {actionKey === `retry-${run.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden xl:inline">重试</span>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && runs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground dark:text-slate-300"
                    >
                      暂无任务运行记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="mx-auto max-h-[85vh] w-[96vw] max-w-3xl overflow-y-auto rounded-3xl border-terminal-border-default bg-white/95 dark:border-terminal-border-default dark:bg-surface-panel/95">
          <DialogHeader>
            <DialogTitle>{selectedRun?.taskName || "任务详情"}</DialogTitle>
            <DialogDescription>
              查看任务状态流转、执行摘要和关键事件。
            </DialogDescription>
          </DialogHeader>

          {selectedRun ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-lg border border-terminal-border-default shadow-none dark:border-slate-700">
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-slate-300">
                        状态
                      </span>
                      <Badge
                        className={getStatusBadgeClassName(selectedRun.status)}
                      >
                        {formatStatusLabel(selectedRun.status)}
                      </Badge>
                    </div>
                    <div>开始：{formatDateTime(selectedRun.startedAt)}</div>
                    <div>结束：{formatDateTime(selectedRun.finishedAt)}</div>
                    <div>进度：{getProgressText(selectedRun)}</div>
                    <div>摘要：{selectedRun.summary || "--"}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border border-terminal-border-default shadow-none dark:border-slate-700">
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div>
                      触发方式：{formatTriggerLabel(selectedRun.triggeredBy)}
                    </div>
                    <div>运行原因：{selectedRun.runReason || "--"}</div>
                    <div>任务编号：{selectedRun.id}</div>
                    <div>重试来源：{selectedRun.retryOfRunId || "--"}</div>
                  </CardContent>
                </Card>
              </div>

              {selectedRun.errorMessage ? (
                <Card className="rounded-lg border border-rose-200 bg-rose-50/80 shadow-none dark:border-rose-900 dark:bg-rose-950/30">
                  <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-200">
                    {selectedRun.errorMessage}
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  事件流
                </h4>
                <div className="space-y-3">
                  {selectedRun.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-terminal-border-default p-4 text-sm dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{event.level}</Badge>
                        <Badge variant="outline">{event.eventType}</Badge>
                        <span className="text-muted-foreground dark:text-slate-300">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-900 dark:text-white">
                        {event.message}
                      </p>
                      {event.details ? (
                        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-panel p-3 text-xs text-foreground dark:bg-slate-800 dark:text-slate-200">
                          {event.details}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
