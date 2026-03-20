'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatBeijingDateTime } from '@/lib/time';
import type { ClosingScreenerResults, ClosingScreenerRule } from '@/types/closing-screener';
import type { TaskApiEnvelope, TaskRunDetailView, TaskRunView } from '@/types/task';
import { TdxFormulaLibrary } from '@/components/TdxFormulaLibrary';

const defaultRule: ClosingScreenerRule = {
  enabled: false,
  notifyEnabled: false,
  mode: 'BASIC',
  formula: '',
  maxDailyJ: 20,
  maxWeeklyJ: 35,
  requirePriceAboveBBI: true,
  minAboveBBIDays: 1,
  minVolumeRatio: 1.2,
};

function parseNullableNumber(value: string): number | null {
  if (value.trim() === '') {
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
    throw new Error(payload.message || '请求失败');
  }

  return payload.data;
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
  const runLabel = useMemo(() => {
    if (!results?.run?.tradeDate) {
      return '暂无收盘扫描结果';
    }

    return formatBeijingDateTime(results.run.tradeDate, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [results?.run?.tradeDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResponse, resultsResponse] = await Promise.all([
        fetch('/api/closing-screener/settings'),
        fetch('/api/closing-screener/results'),
      ]);

      if (!settingsResponse.ok || !resultsResponse.ok) {
        throw new Error('加载收盘选股数据失败');
      }

      const [settingsData, resultsData] = await Promise.all([
        settingsResponse.json(),
        resultsResponse.json(),
      ]);

      setRule(settingsData);
      setResults(resultsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载收盘选股数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!rule.formula.trim()) {
      toast.error('请先输入通达信公式');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await fetch('/api/closing-screener/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula: rule.formula }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || '测试通达信公式失败');
      }

      const payload = await response.json();
      setTestResult(payload.data);
      
      if (payload.data.matchedCount > 0) {
        toast.success(`测试完成，自选股中命中 ${payload.data.matchedCount} 只`);
      } else {
        toast.info(`测试完成，自选股中没有命中结果`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '测试通达信公式失败');
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
      const response = await fetch('/api/closing-screener/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || '保存收盘选股配置失败');
      }

      const nextRule = await response.json();
      setRule(nextRule);
      toast.success('收盘选股配置已保存，请手动执行一次以生成最新结果');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存收盘选股配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      const response = await fetch('/api/closing-screener/run', {
        method: 'POST',
      });

      const taskRun = await readTaskEnvelope<TaskRunView>(response);
      setActiveRun(taskRun);
      toast.success(taskRun.summary || '收盘选股任务已触发，可在任务中心查看全量状态');

      const blockingRunId =
        typeof taskRun.metadata?.blockingRunId === 'string'
          ? taskRun.metadata.blockingRunId
          : null;
      const targetRunId = taskRun.status === 'SKIPPED' && blockingRunId ? blockingRunId : taskRun.id;

      if (!targetRunId) {
        return;
      }

      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const nextRun = await fetch(`/api/tasks/runs/${targetRunId}`).then((nextResponse) =>
          readTaskEnvelope<TaskRunDetailView>(nextResponse),
        );

        setActiveRun(nextRun);

        if (['COMPLETED', 'FAILED', 'STOPPED', 'SKIPPED'].includes(nextRun.status)) {
          if (nextRun.status === 'COMPLETED' || nextRun.status === 'SKIPPED') {
            await loadData();
            toast.success(nextRun.summary || '收盘选股已完成');
          } else if (nextRun.status === 'STOPPED') {
            toast.error('收盘选股任务已停止');
          } else {
            throw new Error(nextRun.errorMessage || nextRun.summary || '执行收盘选股失败');
          }

          break;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '执行收盘选股失败');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className='space-y-6'>
      <Card className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80'>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-2'>
            <CardTitle className='flex items-center gap-2 text-slate-900 dark:text-white'>
              <SearchCheck className='h-5 w-5' />
              收盘选股
            </CardTitle>
            <p className='text-sm text-slate-500 dark:text-slate-300'>
              每个交易日收盘后扫描全市场 A 股，再按你的规则过滤出候选股票。
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={loadData}
              disabled={loading}
              className='rounded-xl'
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新结果
            </Button>
            <Button onClick={handleRun} disabled={running} className='rounded-xl'>
              {running ? '执行中...' : '手动执行'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 lg:grid-cols-2'>
          <div className='space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700'>
            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-base'>开启收盘选股</Label>
                <p className='text-sm text-slate-500 dark:text-slate-300'>参与每日收盘后的全市场过滤</p>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) => setRule((current) => ({ ...current, enabled: checked }))}
              />
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-base'>开启结果通知</Label>
                <p className='text-sm text-slate-500 dark:text-slate-300'>命中结果会汇总推送到 PushDeer</p>
              </div>
              <Switch
                checked={rule.notifyEnabled}
                onCheckedChange={(checked) => setRule((current) => ({ ...current, notifyEnabled: checked }))}
              />
            </div>
            <div className='space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700'>
              <div>
                <Label className='text-base'>选股模式</Label>
                <p className='text-sm text-slate-500 dark:text-slate-300'>
                  基础条件适合简单阈值，通达信公式适合复杂组合条件。
                </p>
              </div>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={rule.mode === 'BASIC' ? 'default' : 'outline'}
                  className='rounded-xl'
                  onClick={() => setRule((current) => ({ ...current, mode: 'BASIC' }))}
                >
                  基础条件
                </Button>
                <Button
                  type='button'
                  variant={rule.mode === 'FORMULA' ? 'default' : 'outline'}
                  className='rounded-xl'
                  onClick={() => setRule((current) => ({ ...current, mode: 'FORMULA' }))}
                >
                  通达信公式
                </Button>
              </div>
            </div>
          </div>

          {rule.mode === 'FORMULA' ? (
            <div className='space-y-4 lg:col-span-2'>
              <div className='rounded-2xl border border-slate-200 p-4 dark:border-slate-700'>
                <div className='mb-4 flex items-center justify-between'>
                  <Label htmlFor='tdx-formula' className='text-base'>
                    通达信公式
                  </Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => setShowFormulaLibrary(!showFormulaLibrary)}
                    className='rounded-xl'
                  >
                    <BookOpen className='mr-2 h-4 w-4' />
                    {showFormulaLibrary ? '隐藏公式库' : '公式库'}
                  </Button>
                </div>
                <Textarea
                  id='tdx-formula'
                  value={rule.formula}
                  onChange={(event) =>
                    setRule((current) => ({ ...current, formula: event.target.value }))
                  }
                  className='min-h-[180px] font-mono text-sm'
                  placeholder={'XG: CROSS(C, BBI) AND J < 20 AND VOLRATIO > 1.2;'}
                />
                <div className='mt-4 flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleTest}
                    disabled={testing || !rule.formula.trim()}
                    className='rounded-xl'
                  >
                    {testing ? '测试中...' : '用自选股测试'}
                  </Button>
                  {testResult && (
                    <div className='flex items-center gap-2 text-sm'>
                      <span className='text-slate-500 dark:text-slate-300'>
                        测试结果: {testResult.matchedCount}/{testResult.totalTested} 命中
                      </span>
                      {testResult.errors.length > 0 && (
                        <span className='text-amber-600 dark:text-amber-400'>
                          ({testResult.errors.length} 个错误)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {testResult && testResult.matchedStocks.length > 0 && (
                  <div className='mt-4 space-y-2'>
                    <Label className='text-sm font-medium'>命中的自选股:</Label>
                    <div className='max-h-[300px] space-y-2 overflow-y-auto'>
                      {testResult.matchedStocks.map((stock) => (
                        <div
                          key={stock.symbol}
                          className='flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700'
                        >
                          <div>
                            <p className='font-medium text-slate-900 dark:text-white'>
                              {stock.name}
                            </p>
                            <p className='text-sm text-slate-500 dark:text-slate-300'>
                              {stock.symbol}
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-medium text-slate-900 dark:text-white'>
                              {stock.price.toFixed(2)}
                            </p>
                            <p className='text-sm text-slate-500 dark:text-slate-300'>
                              J: {stock.dailyJ.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {testResult && testResult.errors.length > 0 && (
                  <div className='mt-4 space-y-2'>
                    <Label className='text-sm font-medium text-amber-600 dark:text-amber-400'>
                      错误信息:
                    </Label>
                    <div className='max-h-[150px] space-y-1 overflow-y-auto text-sm text-slate-500 dark:text-slate-300'>
                      {testResult.errors.map((error, index) => (
                        <p key={index} className='text-amber-600 dark:text-amber-400'>
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className='mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-300'>
                  <p>
                    支持变量：C/O/H/L/V、K/D/J、BBI、WJ、VOLRATIO、ABOVEBBIDAYS、BELOWBBIDAYS、CHANGEPCT。
                  </p>
                  <p>
                    支持函数：REF、MA、EMA、HHV、LLV、ABS、MAX、MIN、IF、COUNT、EVERY、EXIST、CROSS。
                  </p>
                  <p>支持写法：赋值 `A:=...;`，以及最终选股语句 `XG: ...;`。</p>
                </div>
              </div>
              {showFormulaLibrary && (
                <TdxFormulaLibrary
                  onSelectFormula={(formula) => {
                    setRule((current) => ({ ...current, formula }));
                    setShowFormulaLibrary(false);
                  }}
                  currentFormula={rule.formula}
                />
              )}
            </div>
          ) : (
            <div className='grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='daily-j'>日线 J 上限</Label>
                <Input
                  id='daily-j'
                  type='number'
                  step='0.1'
                  value={rule.maxDailyJ ?? ''}
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      maxDailyJ: parseNullableNumber(event.target.value),
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='weekly-j'>周线 J 上限</Label>
                <Input
                  id='weekly-j'
                  type='number'
                  step='0.1'
                  value={rule.maxWeeklyJ ?? ''}
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      maxWeeklyJ: parseNullableNumber(event.target.value),
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bbi-days'>连续站上 BBI 天数</Label>
                <Input
                  id='bbi-days'
                  type='number'
                  step='1'
                  value={rule.minAboveBBIDays ?? ''}
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      minAboveBBIDays: parseNullableInteger(event.target.value),
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='volume-ratio'>量比下限</Label>
                <Input
                  id='volume-ratio'
                  type='number'
                  step='0.1'
                  value={rule.minVolumeRatio ?? ''}
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      minVolumeRatio: parseNullableNumber(event.target.value),
                    }))
                  }
                />
              </div>
              <div className='space-y-2 sm:col-span-2'>
                <div className='flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700'>
                  <div>
                    <Label className='text-base'>要求收盘价站上 BBI</Label>
                    <p className='text-sm text-slate-500 dark:text-slate-300'>关闭后只按 KDJ 和量能过滤</p>
                  </div>
                  <Switch
                    checked={rule.requirePriceAboveBBI}
                    onCheckedChange={(checked) =>
                      setRule((current) => ({ ...current, requirePriceAboveBBI: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div className='lg:col-span-2 flex justify-end'>
            <Button onClick={handleSave} disabled={saving} className='rounded-xl'>
              {saving ? '保存中...' : '保存规则'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'>
          <CardContent className='p-5'>
            <p className='text-sm text-slate-500 dark:text-slate-300'>最近扫描日期</p>
            <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-white'>{runLabel}</p>
          </CardContent>
        </Card>
        <Card className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'>
          <CardContent className='p-5'>
            <p className='text-sm text-slate-500 dark:text-slate-300'>命中股票数</p>
            <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-white'>{matchedCount}</p>
          </CardContent>
        </Card>
        <Card className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'>
          <CardContent className='p-5'>
            <p className='text-sm text-slate-500 dark:text-slate-300'>有效样本数</p>
            <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-white'>
              {results?.run?.snapshotCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {activeRun ? (
        <Card className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'>
          <CardContent className='grid gap-4 p-5 md:grid-cols-4'>
            <div>
              <p className='text-sm text-slate-500 dark:text-slate-300'>任务状态</p>
              <p className='mt-2 text-lg font-semibold text-slate-900 dark:text-white'>
                {activeRun.status}
              </p>
            </div>
            <div>
              <p className='text-sm text-slate-500 dark:text-slate-300'>任务进度</p>
              <p className='mt-2 text-lg font-semibold text-slate-900 dark:text-white'>
                {activeRun.progressCurrent ?? 0}/{activeRun.progressTotal ?? 0}
              </p>
            </div>
            <div>
              <p className='text-sm text-slate-500 dark:text-slate-300'>最近更新时间</p>
              <p className='mt-2 text-lg font-semibold text-slate-900 dark:text-white'>
                {formatBeijingDateTime(activeRun.updatedAt, {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className='text-sm text-slate-500 dark:text-slate-300'>任务摘要</p>
              <p className='mt-2 text-sm font-medium text-slate-900 dark:text-white'>
                {activeRun.summary || '任务已进入队列'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {results?.matchedStocks.length ? (
          results.matchedStocks.map((stock) => (
            <Card
              key={stock.symbol}
              className='rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'
            >
              <CardHeader className='flex flex-row items-start justify-between gap-3'>
                <div>
                  <CardTitle className='text-lg text-slate-900 dark:text-white'>
                    {stock.name}
                  </CardTitle>
                  <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>{stock.symbol}</p>
                </div>
                <Badge className='bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'>
                  {stock.market}
                </Badge>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
                  <div>
                    <p className='text-slate-500 dark:text-slate-300'>现价</p>
                    <p className='font-medium text-slate-900 dark:text-white'>{stock.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className='text-slate-500 dark:text-slate-300'>日 J</p>
                    <p className='font-medium text-slate-900 dark:text-white'>{stock.dailyJ.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className='text-slate-500 dark:text-slate-300'>周 J</p>
                    <p className='font-medium text-slate-900 dark:text-white'>{stock.weeklyJ.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className='text-slate-500 dark:text-slate-300'>量比</p>
                    <p className='font-medium text-slate-900 dark:text-white'>{stock.volumeRatio.toFixed(2)}</p>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {stock.reasons.map((reason) => (
                    <Badge
                      key={`${stock.symbol}-${reason}`}
                      variant='outline'
                      className='rounded-full border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-200'
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className='rounded-3xl border border-dashed border-slate-300 bg-white/80 shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-slate-900/70'>
            <CardContent className='flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center'>
              <SearchCheck className='h-10 w-10 text-slate-400 dark:text-slate-500' />
              <div>
                <p className='text-lg font-medium text-slate-900 dark:text-white'>暂无命中结果</p>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>
                  你可以先保存规则，然后手动执行一次收盘选股。
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
