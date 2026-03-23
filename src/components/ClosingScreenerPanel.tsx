"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  BookOpen,
  PlayCircle,
  RefreshCw,
  SearchCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { TdxFormulaLibrary } from "@/components/TdxFormulaLibrary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatBeijingDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type {
  ClosingScreenerResults,
  ClosingScreenerRule,
  ClosingScreenerStock,
} from "@/types/closing-screener";
import type {
  TaskApiEnvelope,
  TaskRunDetailView,
  TaskRunView,
} from "@/types/task";

const defaultRule: ClosingScreenerRule = {
  enabled: false,
  notifyEnabled: false,
  mode: "BASIC",
  formula: "",
  maxDailyJ: 20,
  maxWeeklyJ: 35,
  requirePriceAboveBBI: true,
  minAboveBBIDays: 1,
  minVolumeRatio: 1.2,
};

const revealUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

function parseNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableInteger(value: string): number | null {
  const parsed = parseNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

async function readTaskEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as TaskApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "请求失败");
  }

  return payload.data;
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatNullable(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) {
    return "未设";
  }

  return value.toFixed(digits);
}

function getRunStatusMeta(status?: string | null) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "已完成",
        tone: "text-emerald-300 border-emerald-400/25 bg-emerald-500/10",
      };
    case "RUNNING":
      return {
        label: "执行中",
        tone: "text-sky-300 border-sky-400/25 bg-sky-500/10",
      };
    case "FAILED":
      return {
        label: "失败",
        tone: "text-rose-300 border-rose-400/25 bg-rose-500/10",
      };
    case "STOPPED":
      return {
        label: "已停止",
        tone: "text-amber-300 border-amber-400/25 bg-amber-500/10",
      };
    case "SKIPPED":
      return {
        label: "已复用",
        tone: "text-violet-300 border-violet-400/25 bg-violet-500/10",
      };
    default:
      return {
        label: "待执行",
        tone: "text-slate-300 border-white/10 bg-white/5",
      };
  }
}

function MetricBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 py-4 last:border-b-0 dark:border-white/10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function RuleField({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </Label>
      {children}
      <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function StockResultRow({ stock }: { stock: ClosingScreenerStock }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group grid gap-4 border-t border-slate-200/80 px-5 py-5 first:border-t-0 hover:bg-slate-950/[0.03] dark:border-white/10 dark:hover:bg-white/[0.03] lg:grid-cols-[1.2fr_1fr_1.2fr]"
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {stock.name}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {stock.symbol}
            </p>
          </div>
          <Badge className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            {stock.market}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-slate-500 dark:text-slate-400">现价</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">{stock.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">涨跌幅</p>
          <p
            className={cn(
              "mt-1 font-medium",
              stock.changePercent >= 0
                ? "text-rose-600 dark:text-rose-300"
                : "text-emerald-600 dark:text-emerald-300",
            )}
          >
            {formatSignedPercent(stock.changePercent)}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">日 J</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">{stock.dailyJ.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">周 J</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">{stock.weeklyJ.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-slate-500 dark:text-slate-400">量比</p>
            <p className="mt-1 font-medium text-slate-900 dark:text-white">{stock.volumeRatio.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">BBI</p>
            <p className="mt-1 font-medium text-slate-900 dark:text-white">{stock.bbi.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">站上 BBI</p>
            <p className="mt-1 font-medium text-slate-900 dark:text-white">
              {stock.aboveBBIConsecutiveDaysCount} 天
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stock.reasons.map((reason) => (
            <span
              key={`${stock.symbol}-${reason}`}
              className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700 transition-colors group-hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:group-hover:border-white/20"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface TestResult {
  totalTested: number;
  matchedCount: number;
  matchedStocks: Array<{
    symbol: string;
    name: string;
    market: string;
    price: number;
    changePercent: number;
    volume: number;
    dailyK: number;
    dailyD: number;
    dailyJ: number;
    weeklyJ: number;
    bbi: number;
    aboveBBIConsecutiveDaysCount: number;
    belowBBIConsecutiveDaysCount: number;
    volumeRatio: number;
    reasons: string[];
  }>;
  errors: string[];
}

export function ClosingScreenerPanel() {
  const [rule, setRule] = useState<ClosingScreenerRule>(defaultRule);
  const [results, setResults] = useState<ClosingScreenerResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<TaskRunView | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showFormulaLibrary, setShowFormulaLibrary] = useState(false);

  const matchedCount = results?.matchedStocks.length ?? 0;
  const snapshotCount = results?.run?.snapshotCount ?? 0;
  const totalSymbols = results?.run?.totalSymbols ?? 0;
  const completionRate =
    totalSymbols > 0 ? Math.round((matchedCount / totalSymbols) * 1000) / 10 : 0;
  const progressPercent = useMemo(() => {
    if (!activeRun?.progressTotal || activeRun.progressTotal <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(((activeRun.progressCurrent ?? 0) / activeRun.progressTotal) * 100),
    );
  }, [activeRun?.progressCurrent, activeRun?.progressTotal]);

  const runLabel = useMemo(() => {
    if (!results?.run?.tradeDate) {
      return "暂无收盘扫描结果";
    }

    return formatBeijingDateTime(results.run.tradeDate, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [results?.run?.tradeDate]);

  const formulaContent = rule.formula.trim();
  const formulaLineCount = formulaContent
    ? formulaContent.split(/\r?\n/).length
    : 0;
  const formulaCharacterCount = formulaContent.length;
  const formulaPreview = formulaContent
    ? formulaContent.replace(/\s+/g, " ").slice(0, 96)
    : "";

  const ruleSummary = useMemo(() => {
    if (rule.mode === "FORMULA") {
      return formulaContent
        ? `当前使用公式模式 · ${formulaLineCount} 行 / ${formulaCharacterCount} 字符`
        : "切换到公式模式后，请先填写并测试公式。";
    }

    const summaryBits = [
      rule.maxDailyJ !== null ? `日 J ≤ ${formatNullable(rule.maxDailyJ)}` : null,
      rule.maxWeeklyJ !== null ? `周 J ≤ ${formatNullable(rule.maxWeeklyJ)}` : null,
      rule.minVolumeRatio !== null
        ? `量比 ≥ ${formatNullable(rule.minVolumeRatio)}`
        : null,
      rule.requirePriceAboveBBI
        ? `站上 BBI ${rule.minAboveBBIDays ?? 0} 天`
        : "不要求站上 BBI",
    ].filter(Boolean);

    return summaryBits.join(" · ");
  }, [formulaCharacterCount, formulaContent, formulaLineCount, rule]);

  const activeStatusMeta = getRunStatusMeta(activeRun?.status ?? results?.run?.status);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResponse, resultsResponse] = await Promise.all([
        fetch("/api/closing-screener/settings"),
        fetch("/api/closing-screener/results"),
      ]);

      if (!settingsResponse.ok || !resultsResponse.ok) {
        throw new Error("加载收盘选股数据失败");
      }

      const [settingsData, resultsData] = await Promise.all([
        settingsResponse.json(),
        resultsResponse.json(),
      ]);

      setRule(settingsData);
      setResults(resultsData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "加载收盘选股数据失败",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!rule.formula.trim()) {
      toast.error("请先输入通达信公式");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await fetch("/api/closing-screener/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formula: rule.formula }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "测试通达信公式失败");
      }

      const payload = await response.json();
      setTestResult(payload.data);

      if (payload.data.matchedCount > 0) {
        toast.success(`测试完成，自选股中命中 ${payload.data.matchedCount} 只`);
      } else {
        toast.info("测试完成，自选股中没有命中结果");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "测试通达信公式失败",
      );
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/closing-screener/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "保存收盘选股配置失败");
      }

      const nextRule = await response.json();
      setRule(nextRule);
      toast.success("收盘选股配置已保存，请手动执行一次以生成最新结果");
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "保存收盘选股配置失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      const response = await fetch("/api/closing-screener/run", {
        method: "POST",
      });

      const taskRun = await readTaskEnvelope<TaskRunView>(response);
      setActiveRun(taskRun);
      toast.success(
        taskRun.summary || "收盘选股任务已触发，可在任务中心查看全量状态",
      );

      const blockingRunId =
        typeof taskRun.metadata?.blockingRunId === "string"
          ? taskRun.metadata.blockingRunId
          : null;
      const targetRunId =
        taskRun.status === "SKIPPED" && blockingRunId
          ? blockingRunId
          : taskRun.id;

      if (!targetRunId) {
        return;
      }

      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const nextRun = await fetch(`/api/tasks/runs/${targetRunId}`).then(
          (nextResponse) => readTaskEnvelope<TaskRunDetailView>(nextResponse),
        );

        setActiveRun(nextRun);

        if (
          ["COMPLETED", "FAILED", "STOPPED", "SKIPPED"].includes(nextRun.status)
        ) {
          if (nextRun.status === "COMPLETED" || nextRun.status === "SKIPPED") {
            await loadData();
            toast.success(nextRun.summary || "收盘选股已完成");
          } else if (nextRun.status === "STOPPED") {
            toast.error("收盘选股任务已停止");
          } else {
            throw new Error(
              nextRun.errorMessage || nextRun.summary || "执行收盘选股失败",
            );
          }

          break;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "执行收盘选股失败");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        custom={0}
        initial="hidden"
        animate="show"
        variants={revealUp}
        className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_32%),linear-gradient(135deg,_#0f172a_0%,_#111827_42%,_#020617_100%)] text-white shadow-[0_30px_80px_rgba(2,6,23,0.18)] dark:border-white/10"
      >
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <SearchCheck className="h-3.5 w-3.5" />
                  Closing Screener
                </span>
                <span className="text-slate-500">A 股盘后扫描</span>
              </div>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  收盘后，把全市场噪音压缩成一份可执行候选清单。
                </h2>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  先设规则，再执行盘后扫描。你会看到最新扫描日期、命中密度、实时任务进度，以及每只股票为什么进入候选池。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={loadData}
                disabled={loading}
                className="h-11 rounded-full border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                刷新结果
              </Button>
              <Button
                onClick={handleRun}
                disabled={running}
                className="h-11 rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {running ? "执行中..." : "手动执行"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricBlock
                label="最近扫描"
                value={runLabel}
                hint={loading ? "正在同步最新结果" : "展示最近一次落库结果"}
              />
              <MetricBlock
                label="命中数量"
                value={`${matchedCount}`}
                hint={totalSymbols > 0 ? `命中率 ${completionRate}%` : "等待首轮扫描"}
              />
              <MetricBlock
                label="有效样本"
                value={`${snapshotCount}`}
                hint={totalSymbols > 0 ? `全市场扫描 ${totalSymbols} 只` : "尚未生成样本"}
              />
            </div>
          </div>

          <div className="flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">执行状态</p>
                  <p className="mt-2 text-lg font-medium text-white">
                    {activeRun?.summary || "等待下一次手动或自动扫描"}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                    activeStatusMeta.tone,
                  )}
                >
                  {activeStatusMeta.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>任务进度</span>
                  <span>
                    {activeRun?.progressCurrent ?? 0}/{activeRun?.progressTotal ?? 0}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">当前模式</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {rule.mode === "FORMULA" ? "通达信公式" : "基础条件"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{rule.enabled ? "已参与每日盘后筛选" : "当前未启用"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">通知链路</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {rule.notifyEnabled ? "PushDeer 已开启" : "仅本地查看"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">命中结果按批次汇总</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">规则摘要</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{ruleSummary}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        custom={0.08}
        initial="hidden"
        animate="show"
        variants={revealUp}
        className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">规则编辑</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                配置盘后筛选逻辑
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                先决定参与方式，再设置阈值或公式。这里保存的是系统执行时使用的正式规则。
              </p>
            </div>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setRule((current) => ({ ...current, mode: "BASIC" }))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  rule.mode === "BASIC"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                基础条件
              </button>
              <button
                type="button"
                onClick={() => setRule((current) => ({ ...current, mode: "FORMULA" }))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  rule.mode === "FORMULA"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                通达信公式
              </button>
            </div>
          </div>

          <div className="grid gap-6 pt-6 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <ToggleRow
                label="开启收盘选股"
                description="参与每日收盘后的全市场过滤。关闭后保留规则，但不会进入自动扫描。"
                checked={rule.enabled}
                onCheckedChange={(checked) =>
                  setRule((current) => ({ ...current, enabled: checked }))
                }
              />
              <ToggleRow
                label="开启结果通知"
                description="命中结果汇总后推送到 PushDeer，适合盘后快速复盘。"
                checked={rule.notifyEnabled}
                onCheckedChange={(checked) =>
                  setRule((current) => ({ ...current, notifyEnabled: checked }))
                }
              />
              <div className="py-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">策略快照</p>
                <div className="mt-3 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-indigo-500" />
                    <p>{rule.mode === "FORMULA" ? "适合复杂条件组合与公式复用。" : "适合快速构建稳定、可解释的阈值规则。"}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BellRing className="mt-0.5 h-4 w-4 text-indigo-500" />
                    <p>{rule.notifyEnabled ? "结果会进入 PushDeer 推送链路。" : "当前只在面板内查看结果，不触发消息。"}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <SlidersHorizontal className="mt-0.5 h-4 w-4 text-indigo-500" />
                    <p>{ruleSummary}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <AnimatePresence mode="wait">
                {rule.mode === "FORMULA" ? (
                  <motion.div
                    key="formula"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-start">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <Label htmlFor="tdx-formula" className="text-sm font-medium text-slate-900 dark:text-white">
                              通达信公式
                            </Label>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              支持赋值语句和最终 XG 选股表达式，适合表达更复杂的组合条件。
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFormulaLibrary(!showFormulaLibrary)}
                            className="rounded-full"
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            {showFormulaLibrary ? "隐藏公式库" : "公式库"}
                          </Button>
                        </div>
                        <Textarea
                          id="tdx-formula"
                          value={rule.formula}
                          onChange={(event) =>
                            setRule((current) => ({
                              ...current,
                              formula: event.target.value,
                            }))
                          }
                          className="min-h-[320px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm leading-7 shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                          placeholder="XG: CROSS(C, BBI) AND J < 20 AND VOLRATIO > 1.2;"
                        />
                      </div>

                      <div className="space-y-4 xl:sticky xl:top-6">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">公式预览</p>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                              {formulaLineCount} 行 · {formulaCharacterCount} 字符
                            </span>
                          </div>
                          <div className="mt-3 max-h-[280px] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                            {formulaContent ? (
                              <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-700 dark:text-slate-200">
                                {formulaContent}
                              </pre>
                            ) : (
                              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                                公式会在这里按多行方式预览，适合检查长公式、缩进和 XG 终句。
                              </p>
                            )}
                          </div>
                          {formulaPreview ? (
                            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              摘要：{formulaPreview}{formulaCharacterCount > 96 ? "…" : ""}
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">支持变量</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              C / O / H / L / V、K / D / J、BBI、WJ、VOLRATIO、ABOVEBBIDAYS、BELOWBBIDAYS、CHANGEPCT
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">支持函数</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              REF、MA、EMA、HHV、LLV、ABS、MAX、MIN、IF、COUNT、EVERY、EXIST、CROSS
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTest}
                        disabled={testing || !rule.formula.trim()}
                        className="rounded-full"
                      >
                        {testing ? "测试中..." : "用自选股测试"}
                      </Button>
                      {testResult ? (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          命中 {testResult.matchedCount}/{testResult.totalTested}
                          {testResult.errors.length > 0
                            ? ` · ${testResult.errors.length} 个错误`
                            : " · 无错误"}
                        </span>
                      ) : null}
                    </div>

                    {testResult ? (
                      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">测试结果</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              在自选股范围内预览公式命中情况，帮助快速校验表达式。
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                            {testResult.matchedCount}/{testResult.totalTested} 命中
                          </span>
                        </div>

                        {testResult.matchedStocks.length > 0 ? (
                          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                            {testResult.matchedStocks.map((stock) => (
                              <div
                                key={stock.symbol}
                                className="flex items-center justify-between gap-4 border-t border-slate-200/80 px-4 py-3 first:border-t-0 dark:border-white/10"
                              >
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{stock.name}</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">{stock.symbol}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="font-medium text-slate-900 dark:text-white">{stock.price.toFixed(2)}</p>
                                  <p className="text-slate-500 dark:text-slate-400">J {stock.dailyJ.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                            自选股中暂无命中结果。
                          </div>
                        )}

                        {testResult.errors.length > 0 ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            {testResult.errors.map((error, index) => (
                              <p key={`${error}-${index}`}>{error}</p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {showFormulaLibrary ? (
                      <TdxFormulaLibrary
                        onSelectFormula={(formula) => {
                          setRule((current) => ({ ...current, formula }));
                          setShowFormulaLibrary(false);
                        }}
                        currentFormula={rule.formula}
                      />
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="basic"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="grid gap-5 sm:grid-cols-2"
                  >
                    <RuleField id="daily-j" label="日线 J 上限" hint="常用于筛选日线超卖修复区间。">
                      <Input
                        id="daily-j"
                        type="number"
                        step="0.1"
                        value={rule.maxDailyJ ?? ""}
                        onChange={(event) =>
                          setRule((current) => ({
                            ...current,
                            maxDailyJ: parseNullableNumber(event.target.value),
                          }))
                        }
                        className="h-12 rounded-2xl"
                      />
                    </RuleField>

                    <RuleField id="weekly-j" label="周线 J 上限" hint="控制周线位置，避免高位追涨。">
                      <Input
                        id="weekly-j"
                        type="number"
                        step="0.1"
                        value={rule.maxWeeklyJ ?? ""}
                        onChange={(event) =>
                          setRule((current) => ({
                            ...current,
                            maxWeeklyJ: parseNullableNumber(event.target.value),
                          }))
                        }
                        className="h-12 rounded-2xl"
                      />
                    </RuleField>

                    <RuleField id="bbi-days" label="连续站上 BBI 天数" hint="用趋势确认过滤短暂假突破。">
                      <Input
                        id="bbi-days"
                        type="number"
                        step="1"
                        value={rule.minAboveBBIDays ?? ""}
                        onChange={(event) =>
                          setRule((current) => ({
                            ...current,
                            minAboveBBIDays: parseNullableInteger(event.target.value),
                          }))
                        }
                        className="h-12 rounded-2xl"
                      />
                    </RuleField>

                    <RuleField id="volume-ratio" label="量比下限" hint="配合量能放大，过滤成交不足的候选。">
                      <Input
                        id="volume-ratio"
                        type="number"
                        step="0.1"
                        value={rule.minVolumeRatio ?? ""}
                        onChange={(event) =>
                          setRule((current) => ({
                            ...current,
                            minVolumeRatio: parseNullableNumber(event.target.value),
                          }))
                        }
                        className="h-12 rounded-2xl"
                      />
                    </RuleField>

                    <div className="sm:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">要求收盘价站上 BBI</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            关闭后只按 KDJ 与量能过滤，适合更宽松的初筛策略。
                          </p>
                        </div>
                        <Switch
                          checked={rule.requirePriceAboveBBI}
                          onCheckedChange={(checked) =>
                            setRule((current) => ({
                              ...current,
                              requirePriceAboveBBI: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  保存后不会自动回算，建议立即手动执行一次，生成新一轮盘后结果。
                </p>
                <Button onClick={handleSave} disabled={saving} className="rounded-full px-5">
                  {saving ? "保存中..." : "保存规则"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="border-b border-slate-200 pb-5 dark:border-white/10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">执行面板</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              盘后状态与操作提示
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              这里用来判断当前是否需要改规则、重新运行，或直接查看候选结果。
            </p>
          </div>

          <div className="space-y-5 pt-6">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">最近任务</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {activeRun?.summary || "暂无任务日志，等待首次执行。"}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                    activeStatusMeta.tone,
                  )}
                >
                  {activeStatusMeta.label}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">更新时间</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                    {activeRun
                      ? formatBeijingDateTime(activeRun.updatedAt, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">进度</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                    {activeRun?.progressCurrent ?? 0}/{activeRun?.progressTotal ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">命中结果</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{matchedCount} 只股票</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900 dark:text-white">操作建议</p>
              <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                  1. 首次配置后先保存，再手动执行，避免误判旧结果。
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                  2. 公式模式先用自选股测试，确认表达式再投入全市场扫描。
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                  3. 命中数量过多时，优先收紧周 J、量比或 BBI 条件。
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10 dark:from-white/[0.05] dark:to-transparent">
              <p className="text-sm font-medium text-slate-900 dark:text-white">当前判断</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {matchedCount > 0
                  ? `本轮已有 ${matchedCount} 只候选，可直接下滑查看理由和指标结构。`
                  : "当前尚无命中，若规则刚更新，建议保存后手动执行一次。"}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        custom={0.14}
        initial="hidden"
        animate="show"
        variants={revealUp}
        className="rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">结果列表</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              命中候选
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              一行一只股票，优先展示价格、KDJ、BBI 与入选原因，便于盘后快速扫描。
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 dark:border-white/10 dark:bg-white/[0.05]">
              {matchedCount} 只命中
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 dark:border-white/10 dark:bg-white/[0.05]">
              {snapshotCount} 个样本
            </span>
          </div>
        </div>

        {results?.matchedStocks.length ? (
          <div>
            <AnimatePresence initial={false}>
              {results.matchedStocks.map((stock) => (
                <StockResultRow key={stock.symbol} stock={stock} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="rounded-full border border-slate-200 bg-slate-100 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <SearchCheck className="h-8 w-8 text-slate-500 dark:text-slate-300" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium text-slate-900 dark:text-white">暂无命中结果</p>
              <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                当前这套规则还没有筛出候选股票。你可以微调阈值、切到公式模式，或直接执行一次新的盘后扫描。
              </p>
            </div>
            <Button onClick={handleRun} disabled={running} className="rounded-full px-5">
              {running ? "执行中..." : "立即执行扫描"}
            </Button>
          </div>
        )}
      </motion.section>
    </div>
  );
}
