/*
 * @Description: 终端工作台壳层组件
 */
'use client';

import { ReactNode, useState } from 'react';
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
} from 'lucide-react';
import { RefreshCw, ArrowUpDown } from 'lucide-react';

// === 工作台导航配置 ===
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
    description: '实时监控股票价格与指标',
  },
  {
    id: 'alerts',
    label: '监控规则',
    icon: <Bell className='h-5 w-5' />,
    description: '指标监控与告警规则',
  },
  {
    id: 'screener',
    label: '收盘选股',
    icon: <Search className='h-5 w-5' />,
    description: '市场扫描与选股策略',
  },
  {
    id: 'tasks',
    label: '任务中心',
    icon: <ListTodo className='h-5 w-5' />,
    description: '定时任务与执行记录',
  },
  {
    id: 'trades',
    label: '交易记录',
    icon: <FileText className='h-5 w-5' />,
    description: '交易记录与止损止盈',
  },
];

// === 市场概览条组件 ===
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
      <div className='flex items-center justify-between border-b border-terminal-border-subtle bg-surface-panel px-4 py-3'>
        <div className='flex items-center gap-3'>
          <Badge variant='default' className='text-xs'>
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
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
              />
            </Button>
          )}
          {userSettings}
        </div>
      </div>
    );
  }

  return (
    <div className='border-b border-terminal-border-subtle bg-surface-panel'>
      {/* 桌面端概览 */}
      <div className='hidden lg:block'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <h1 className='text-lg font-semibold'>B1 监控终端</h1>
              <Badge variant='outline' className='text-xs'>
                v2.0
              </Badge>
            </div>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2 rounded-md border border-terminal-border-subtle bg-surface-base px-3 py-1.5'>
                <span className='text-xs text-muted-foreground'>监控股票</span>
                <span className='text-sm font-semibold'>{summary.total}</span>
              </div>
              <div className='flex items-center gap-2 rounded-md border border-up/30 bg-up-bg px-3 py-1.5'>
                <span className='text-xs text-up'>买入信号</span>
                <span className='text-sm font-semibold text-up'>
                  {summary.buySignals}
                </span>
              </div>
              <div className='flex items-center gap-2 rounded-md border border-down/30 bg-down-bg px-3 py-1.5'>
                <span className='text-xs text-down'>卖出信号</span>
                <span className='text-sm font-semibold text-down'>
                  {summary.sellSignals}
                </span>
              </div>
              <div className='flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5'>
                <span className='text-xs text-amber-600 dark:text-amber-400'>
                  强势结构
                </span>
                <span className='text-sm font-semibold text-amber-600 dark:text-amber-400'>
                  {summary.strongTrend}
                </span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {onRefresh && (
              <Button
                variant='terminal'
                size='sm'
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                />
                <span className='ml-2'>{loading ? '刷新中...' : '刷新'}</span>
              </Button>
            )}
            {onToggleSort && (
              <Button variant='terminal' size='sm' onClick={onToggleSort}>
                <ArrowUpDown className='h-4 w-4' />
                <span className='ml-2'>
                  {isKDJDescending ? 'KDJ 降序' : 'KDJ 升序'}
                </span>
              </Button>
            )}
            {userSettings}
          </div>
        </div>
      </div>

      {/* 移动端概览 */}
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

// === 侧边栏导航组件 ===
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
        'hidden lg:block fixed left-0 top-0 z-sidebar h-screen border-r border-terminal-border-subtle bg-surface-panel transition-all duration-300',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      {/* Logo 区域 */}
      <div className='flex h-16 items-center justify-between border-b border-terminal-border-subtle px-4'>
        {!collapsed && (
          <div className='flex items-center gap-2'>
            <LayoutDashboard className='h-6 w-6 text-primary' />
            <span className='text-sm font-semibold'>B1 终端</span>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className='flex-1 space-y-1 p-3'>
        {WORKSPACE_NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-accent',
              activeView === item.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// === 移动端底部导航组件 ===
interface MobileBottomNavProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
}

export function MobileBottomNav({
  activeView,
  onViewChange,
}: MobileBottomNavProps) {
  return (
    <nav className='fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-terminal-border-subtle bg-surface-panel lg:hidden'>
      <div className='flex h-bottom-nav items-center justify-around px-2'>
        {WORKSPACE_NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-all',
              activeView === item.id
                ? 'text-primary'
                : 'text-muted-foreground'
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

// === 工作台壳层组件 ===
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

  return (
    <div className='flex min-h-screen bg-surface-base'>
      {/* PC 侧边栏 */}
      <WorkspaceSidebar
        activeView={activeView}
        onViewChange={onViewChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 主内容区 */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar',
          'mb-bottom-nav lg:mb-0 ml-0'
        )}
      >
        {/* 顶部概览条 */}
        <MarketSummaryBar
          summary={summary}
          loading={loading}
          onRefresh={onRefresh}
          isKDJDescending={isKDJDescending}
          onToggleSort={onToggleSort}
          userSettings={userSettings}
        />

        {/* 工作区内容 */}
        <main className='flex-1 overflow-auto p-4 lg:p-6'>{children}</main>
      </div>

      {/* 移动端底部导航 */}
      <MobileBottomNav activeView={activeView} onViewChange={onViewChange} />
    </div>
  );
}
