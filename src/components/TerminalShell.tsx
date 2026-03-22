/*
 * @Description: 终端工作台壳层组件
 */
'use client';

import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Bell,
  Search,
  ListTodo,
  FileText,
  Activity,
  Sparkles,
  ChevronsLeftRightEllipsis,
} from 'lucide-react';
import { RefreshCw, ArrowUpDown } from 'lucide-react';

export type WorkspaceView =
  | 'dashboard'
  | 'stocks'
  | 'alerts'
  | 'screener'
  | 'tasks'
  | 'trades';

interface NavItem {
  id: WorkspaceView;
  label: string;
  icon: ReactNode;
  description: string;
}

const WORKSPACE_NAV: NavItem[] = [
  {
    id: 'stocks',
    label: '股票池',
    icon: <TrendingUp className='h-5 w-5' />,
    description: '价格、信号与结构同屏观察',
  },
  {
    id: 'alerts',
    label: '监控规则',
    icon: <Bell className='h-5 w-5' />,
    description: '多条件提醒与节奏管理',
  },
  {
    id: 'screener',
    label: '收盘选股',
    icon: <Search className='h-5 w-5' />,
    description: '收盘扫描与策略筛选',
  },
  {
    id: 'tasks',
    label: '任务中心',
    icon: <ListTodo className='h-5 w-5' />,
    description: '执行状态与系统日志',
  },
  {
    id: 'trades',
    label: '交易记录',
    icon: <FileText className='h-5 w-5' />,
    description: '复盘、止盈与止损管理',
  },
];

const VIEW_META: Record<
  WorkspaceView,
  { eyebrow: string; title: string; description: string }
> = {
  dashboard: {
    eyebrow: 'Overview',
    title: '全局概览',
    description: '关注今天的节奏、信号和风险暴露。',
  },
  stocks: {
    eyebrow: 'Market Tape',
    title: '股票池',
    description: '把最值得盯的价格、结构和信号收进一个工作面。',
  },
  alerts: {
    eyebrow: 'Automation',
    title: '监控规则',
    description: '给关键标的配置提醒节奏，减少重复盯盘。',
  },
  screener: {
    eyebrow: 'Closing Scan',
    title: '收盘选股',
    description: '在收盘窗口快速压缩市场范围，留下可执行标的。',
  },
  tasks: {
    eyebrow: 'Ops',
    title: '任务中心',
    description: '查看同步、监控和筛选任务的执行健康度。',
  },
  trades: {
    eyebrow: 'Journal',
    title: '交易记录',
    description: '把操作、仓位和盈亏变化整理成可复盘轨迹。',
  },
};

interface MarketSummaryBarProps {
  summary: {
    total: number;
    buySignals: number;
    sellSignals: number;
    strongTrend: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
  isKDJDescending?: boolean;
  onToggleSort?: () => void;
  userSettings?: ReactNode;
  compact?: boolean;
}

export function MarketSummaryBar({
  summary,
  loading,
  onRefresh,
  isKDJDescending,
  onToggleSort,
  userSettings,
  compact = false,
}: MarketSummaryBarProps) {
  if (compact) {
    return (
      <div className='border-b border-white/50 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <Badge className='rounded-full bg-slate-950 text-xs text-white dark:bg-white dark:text-slate-950'>
              {summary.total} 只股票
            </Badge>
            <div className='flex gap-2 text-xs'>
              <span className='text-up'>{summary.buySignals} 买</span>
              <span className='text-down'>{summary.sellSignals} 卖</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {onRefresh && (
              <Button
                variant='ghost'
                size='xs'
                onClick={onRefresh}
                disabled={loading}
                className='rounded-full'
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
                />
              </Button>
            )}
            {userSettings}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='border-b border-terminal-border-subtle/70 bg-transparent'>
      <div className='hidden lg:block'>
        <div className='mx-auto px-6 py-6'>
          <div className='panel-shell relative overflow-hidden rounded-[28px] px-6 py-5'>
            <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent' />
            <div className='pointer-events-none absolute -right-20 top-0 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl' />
            <div className='pointer-events-none absolute left-1/3 top-10 h-24 w-24 rounded-full bg-white/50 blur-2xl dark:bg-sky-200/10' />

            <div className='relative flex items-start justify-between gap-6'>
              <div className='max-w-3xl space-y-5'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950'>
                    <Activity className='h-5 w-5' />
                  </div>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] font-medium uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300'>
                        B1 Notice
                      </span>
                      <Badge
                        variant='outline'
                        className='border-sky-200 bg-sky-50 text-[11px] text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                      >
                        Live Workspace
                      </Badge>
                    </div>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                      盘中监控、策略提醒与交易复盘在同一工作台完成。
                    </h1>
                  </div>
                </div>

                <p className='max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300'>
                  用更清晰的层级把股票、规则、任务和交易放进一个连续视图里，减少切换成本，也让异常更早暴露出来。
                </p>

                <div className='grid grid-cols-4 gap-3'>
                  <div className='rounded-2xl border border-white/70 bg-white/72 px-4 py-3 dark:border-white/10 dark:bg-white/5'>
                    <div className='text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
                      Universe
                    </div>
                    <div className='mt-2 text-2xl font-semibold text-slate-950 dark:text-white'>
                      {summary.total}
                    </div>
                    <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                      当前监控标的
                    </div>
                  </div>
                  <div className='rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20'>
                    <div className='text-[11px] uppercase tracking-[0.2em] text-rose-500 dark:text-rose-300'>
                      Buy
                    </div>
                    <div className='mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300'>
                      {summary.buySignals}
                    </div>
                    <div className='mt-1 text-xs text-rose-500/80 dark:text-rose-300/80'>
                      触发买入信号
                    </div>
                  </div>
                  <div className='rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20'>
                    <div className='text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300'>
                      Sell
                    </div>
                    <div className='mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-300'>
                      {summary.sellSignals}
                    </div>
                    <div className='mt-1 text-xs text-emerald-600/80 dark:text-emerald-300/80'>
                      触发卖出信号
                    </div>
                  </div>
                  <div className='rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20'>
                    <div className='text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300'>
                      Structure
                    </div>
                    <div className='mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300'>
                      {summary.strongTrend}
                    </div>
                    <div className='mt-1 text-xs text-amber-600/80 dark:text-amber-300/80'>
                      强势结构个股
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex min-w-[240px] flex-col gap-3'>
                <div className='rounded-2xl border border-white/70 bg-white/72 p-4 dark:border-white/10 dark:bg-white/5'>
                  <div className='flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
                    <Sparkles className='h-3.5 w-3.5' />
                    Workspace Actions
                  </div>
                  <div className='mt-4 flex flex-col gap-2'>
                    {onRefresh && (
                      <Button
                        variant='terminal'
                        size='sm'
                        onClick={onRefresh}
                        disabled={loading}
                        className='justify-start rounded-xl'
                      >
                        <RefreshCw
                          className={cn('h-4 w-4', loading && 'animate-spin')}
                        />
                        <span className='ml-2'>
                          {loading ? '刷新中...' : '刷新行情'}
                        </span>
                      </Button>
                    )}
                    {onToggleSort && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={onToggleSort}
                        className='justify-start rounded-xl border-terminal-border-default bg-white/60 dark:bg-white/5'
                      >
                        <ArrowUpDown className='h-4 w-4' />
                        <span className='ml-2'>
                          {isKDJDescending ? 'KDJ 降序' : 'KDJ 升序'}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-white/70 bg-white/72 px-4 py-3 dark:border-white/10 dark:bg-white/5'>
                  <div>
                    <div className='text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
                      Account
                    </div>
                    <div className='mt-1 text-sm font-medium text-slate-900 dark:text-slate-100'>
                      当前用户设置
                    </div>
                  </div>
                  {userSettings}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='lg:hidden'>
        <MarketSummaryBar
          summary={summary}
          loading={loading}
          onRefresh={onRefresh}
          isKDJDescending={isKDJDescending}
          onToggleSort={onToggleSort}
          userSettings={userSettings}
          compact
        />
      </div>
    </div>
  );
}

interface WorkspaceSidebarProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkspaceSidebar({
  activeView,
  onViewChange,
  collapsed = false,
}: WorkspaceSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:block fixed left-0 top-0 z-sidebar h-screen border-r border-white/10 bg-slate-950 text-white transition-all duration-300',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_58%)]' />

      <div className='relative flex h-20 items-center justify-between border-b border-white/10 px-5'>
        {!collapsed && (
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur'>
              <LayoutDashboard className='h-5 w-5 text-sky-300' />
            </div>
            <div>
              <div className='text-[11px] uppercase tracking-[0.24em] text-slate-400'>
                B1 Notice
              </div>
              <span className='text-sm font-semibold text-white'>
                Trading Workspace
              </span>
            </div>
          </div>
        )}
      </div>

      <nav className='relative flex-1 space-y-1 p-3 pt-5'>
        {WORKSPACE_NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200',
              activeView === item.id
                ? 'bg-white text-slate-950 shadow-xl shadow-slate-950/20'
                : 'text-slate-400 hover:bg-white/6 hover:text-white',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && (
              <div className='min-w-0'>
                <div className='text-sm font-medium'>{item.label}</div>
                <div
                  className={cn(
                    'mt-1 text-xs leading-5',
                    activeView === item.id
                      ? 'text-slate-500'
                      : 'text-slate-500 group-hover:text-slate-300'
                  )}
                >
                  {item.description}
                </div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className='relative m-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur'>
          <div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400'>
            <ChevronsLeftRightEllipsis className='h-3.5 w-3.5' />
            Focus
          </div>
          <p className='mt-3 text-sm leading-6 text-slate-300'>
            先看结构与信号，再看规则与执行记录，能更快发现异常链路。
          </p>
        </div>
      )}
    </aside>
  );
}

interface MobileBottomNavProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
}

export function MobileBottomNav({
  activeView,
  onViewChange,
}: MobileBottomNavProps) {
  return (
    <nav className='fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-white/50 bg-white/90 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-slate-950/88'>
      <div className='flex h-bottom-nav items-center justify-around px-2'>
        {WORKSPACE_NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-all',
              activeView === item.id
                ? 'text-sky-600 dark:text-sky-300'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {item.icon}
            <span className='text-[10px]'>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

interface TerminalShellProps {
  children: ReactNode;
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  summary: MarketSummaryBarProps['summary'];
  loading?: boolean;
  onRefresh?: () => void;
  isKDJDescending?: boolean;
  onToggleSort?: () => void;
  userSettings?: ReactNode;
}

export function TerminalShell({
  children,
  activeView,
  onViewChange,
  summary,
  loading,
  onRefresh,
  isKDJDescending,
  onToggleSort,
  userSettings,
}: TerminalShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const viewMeta = VIEW_META[activeView];

  return (
    <div className='flex min-h-screen bg-surface-base'>
      <WorkspaceSidebar
        activeView={activeView}
        onViewChange={onViewChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar',
          'mb-bottom-nav ml-0 lg:mb-0'
        )}
      >
        <MarketSummaryBar
          summary={summary}
          loading={loading}
          onRefresh={onRefresh}
          isKDJDescending={isKDJDescending}
          onToggleSort={onToggleSort}
          userSettings={userSettings}
        />

        <main className='flex-1 overflow-auto p-4 lg:p-6'>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className='space-y-6'
          >
            <section className='section-fade-in rounded-[28px] border border-white/60 bg-white/66 px-5 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 lg:px-6'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                <div className='max-w-3xl'>
                  <div className='text-[11px] uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300'>
                    {viewMeta.eyebrow}
                  </div>
                  <h2 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                    {viewMeta.title}
                  </h2>
                  <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                    {viewMeta.description}
                  </p>
                </div>
                <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
                  <span className='inline-flex h-2 w-2 rounded-full bg-emerald-500' />
                  数据与工作区已连接
                </div>
              </div>
            </section>

            <div className='section-fade-in-delay'>{children}</div>
          </motion.div>
        </main>
      </div>

      <MobileBottomNav activeView={activeView} onViewChange={onViewChange} />
    </div>
  );
}
