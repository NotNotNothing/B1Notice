'use client';
import { useStockStore } from '../store/useStockStore';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { StockList } from '../components/StockList';
import { AlertPanel } from '../components/AlertPanel';
import { UserSettings } from '@/components/UserSettings';
import { TradeBoard } from '@/components/TradeBoard';
import { ClosingScreenerPanel } from '@/components/ClosingScreenerPanel';
import { TaskCenterPanel } from '@/components/TaskCenterPanel';
import {
  TerminalShell,
  WorkspaceView,
} from '@/components/TerminalShell';

export default function Home() {
  const { stocks, loading, fetchStocks, isKDJDescending, toggleSortByKDJ } =
    useStockStore();
  const { data: session } = useSession();
  const [showBBITrendSignal, setShowBBITrendSignal] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedView = searchParams.get('view');
  const isValidView = (view: string | null): view is WorkspaceView =>
    view !== null &&
    ['dashboard', 'stocks', 'alerts', 'screener', 'tasks', 'trades'].includes(view);

  const [activeView, setActiveView] = useState<WorkspaceView>(
    isValidView(requestedView) ? requestedView : 'stocks',
  );

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

  useEffect(() => {
    if (isValidView(requestedView) && requestedView !== activeView) {
      setActiveView(requestedView);
      return;
    }

    if (!requestedView) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', activeView);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeView, pathname, requestedView, router, searchParams]);

  const handleViewChange = (view: WorkspaceView) => {
    setActiveView(view);

    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleManualRefresh = () => {
    fetchStocks({ refresh: true });
  };

  // 渲染当前工作区内容
  const renderWorkspaceContent = () => {
    switch (activeView) {
      case 'stocks':
        return (
          <StockList
            stocks={stocks}
            onStocksChange={fetchStocks}
            showBBITrendSignal={showBBITrendSignal}
          />
        );
      case 'alerts':
        return <AlertPanel stocks={stocks} />;
      case 'screener':
        return <ClosingScreenerPanel />;
      case 'tasks':
        return <TaskCenterPanel />;
      case 'trades':
        return <TradeBoard stocks={stocks} />;
      default:
        return null;
    }
  };

  return (
    <TerminalShell
      activeView={activeView}
      onViewChange={handleViewChange}
      summary={summary}
      loading={loading}
      onRefresh={handleManualRefresh}
      isKDJDescending={isKDJDescending}
      onToggleSort={toggleSortByKDJ}
      userSettings={
        session?.user ? (
          <UserSettings username={session.user.username} />
        ) : undefined
      }
    >
      {renderWorkspaceContent()}
    </TerminalShell>
  );
}
