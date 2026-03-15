'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatBeijingDateTime } from '@/lib/time';
import type { ClosingScreenerResults, ClosingScreenerRule } from '@/types/closing-screener';

const defaultRule: ClosingScreenerRule = {
  enabled: false,
  notifyEnabled: false,
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

export function ClosingScreenerPanel() {
  const [rule, setRule] = useState<ClosingScreenerRule>(defaultRule);
  const [results, setResults] = useState<ClosingScreenerResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

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
      toast.success('收盘选股配置已保存');
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

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '执行收盘选股失败');
      }

      setResults(payload.results);
      toast.success(payload.reused ? '今日收盘选股结果已存在，已为你刷新' : '收盘选股执行完成');
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
            <div className='flex items-center justify-between'>
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
          </div>

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
