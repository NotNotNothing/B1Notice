'use client';
import { useStockStore } from '../store/useStockStore';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockList } from '../components/StockList';
import { AlertPanel } from '../components/AlertPanel';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { UserSettings } from '@/components/UserSettings';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { stocks, fetchStocks, isKDJDescending, toggleSortByKDJ } =
    useStockStore();
  const { data: session } = useSession();
  const [showBBITrendSignal, setShowBBITrendSignal] = useState(true);
  const summary = useMemo(() => {
    const total = stocks.length;
    const buySignals = stocks.filter(
      (stock) => stock.buySignal?.hasBuySignal,
    ).length;
    const sellSignals = stocks.filter(
      (stock) => stock.sellSignal?.hasSellSignal,
    ).length;
    const strongTrend = stocks.filter(
      (stock) =>
        stock.bbi?.aboveBBIConsecutiveDays || stock.zhixingTrend?.isGoldenCross,
    ).length;

    return {
      total,
      buySignals,
      sellSignals,
      strongTrend,
    };
  }, [stocks]);

  // 获取用户BBI趋势信号设置
  useEffect(() => {
    const fetchBBISettings = async () => {
      try {
        const response = await fetch('/api/user/bbi-settings');
        if (response.ok) {
          const data = await response.json();
          setShowBBITrendSignal(data.showBBITrendSignal);
        }
      } catch (error) {
        console.error('获取BBI趋势信号设置失败:', error);
      }
    };

    if (session?.user) {
      fetchBBISettings();
    }
  }, [session]);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 5 * 60 * 1000); // 每5分钟刷新一次
    return () => clearInterval(interval);
  }, [fetchStocks]);

  return (
    <main className='min-h-screen bg-slate-50 pb-8 dark:bg-slate-950'>
      <div className='relative overflow-hidden border-b border-slate-200/60 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80'>
        <div className='pointer-events-none absolute -top-32 left-1/2 hidden h-72 w-72 -translate-x-1/2 rounded-full bg-red-200/40 blur-3xl lg:block' />
        <div className='pointer-events-none absolute -bottom-24 right-0 h-60 w-60 translate-x-1/3 rounded-full bg-blue-200/40 blur-3xl' />
        <div className='relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-10'>
          <div className='max-w-2xl space-y-3'>
            <Badge className='bg-gradient-to-r from-slate-900 to-slate-600 text-white shadow-sm dark:from-slate-100 dark:to-slate-400 dark:text-slate-900'>
              实时量化监控
            </Badge>
            <div className='space-y-2'>
              <h1 className='text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white'>
                曼城阵容监控中心
              </h1>
              <p className='text-sm text-slate-500 sm:text-base dark:text-slate-300'>
                聚焦核心指标，随时掌握自选股的攻防节奏。
              </p>
            </div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
              <div className='rounded-2xl border border-slate-100 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-800/70'>
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  监控股票
                </p>
                <p className='mt-1 text-2xl font-semibold text-slate-900 dark:text-white'>
                  {summary.total}
                </p>
              </div>
              <div className='rounded-2xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm backdrop-blur dark:border-blue-900 dark:bg-blue-950/50'>
                <p className='text-xs text-blue-600 dark:text-blue-300'>
                  买入信号
                </p>
                <p className='mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-200'>
                  {summary.buySignals}
                </p>
              </div>
              <div className='rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3 shadow-sm backdrop-blur dark:border-emerald-900 dark:bg-emerald-950/40'>
                <p className='text-xs text-emerald-600 dark:text-emerald-300'>
                  卖出信号
                </p>
                <p className='mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200'>
                  {summary.sellSignals}
                </p>
              </div>
              <div className='rounded-2xl border border-amber-100 bg-amber-50/80 p-3 shadow-sm backdrop-blur dark:border-amber-900 dark:bg-amber-950/40'>
                <p className='text-xs text-amber-600 dark:text-amber-300'>
                  强势结构
                </p>
                <p className='mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200'>
                  {summary.strongTrend}
                </p>
              </div>
            </div>
          </div>
          <div className='flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:justify-end'>
            <Button
              variant='outline'
              size='sm'
              onClick={toggleSortByKDJ}
              className='flex h-10 flex-1 items-center gap-1 rounded-xl border-slate-200 bg-white/70 text-slate-700 shadow-sm sm:flex-none sm:px-4 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
            >
              <ArrowUpDown className='h-4 w-4' />
              {isKDJDescending ? 'KDJ降序' : 'KDJ升序'}
            </Button>
            {session?.user && (
              <div className='flex flex-1 justify-end sm:flex-none'>
                <UserSettings username={session.user.username} />
              </div>
            )}
          </div>
        </div>
      </div>

      <section className='mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        <Tabs defaultValue='stocks'>
          <div className='mb-4 overflow-x-auto'>
            <TabsList className='inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white/90 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80'>
              <TabsTrigger
                value='stocks'
                className='flex-1 rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900'
              >
                股票列表
              </TabsTrigger>
              <TabsTrigger
                value='alerts'
                className='flex-1 rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900'
              >
                指标监控
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='stocks' className='mt-0'>
            <StockList
              stocks={stocks}
              onStocksChange={fetchStocks}
              showBBITrendSignal={showBBITrendSignal}
            />
          </TabsContent>

          <TabsContent value='alerts' className='mt-0'>
            <AlertPanel stocks={stocks} />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
