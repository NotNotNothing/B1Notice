import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { AlertConfig } from '../types/stock';
import { MonitorResponse } from '../types/monitor';
import { Switch } from '@/components/ui/switch';
import { Trash2Icon } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const getAlertTypeLabel = (type: AlertConfig['type']) => {
  switch (type) {
    case 'PRICE':
      return '价格';
    case 'VOLUME':
      return '成交量';
    case 'CHANGE_PERCENT':
      return '涨跌幅';
    case 'KDJ_J':
      return '日KDJ指标(J值)';
    case 'WEEKLY_KDJ_J':
      return '周KDJ指标(J值)';
    case 'BBI_ABOVE_CONSECUTIVE':
      return 'BBI连续高于价格';
    case 'BBI_BELOW_CONSECUTIVE':
      return 'BBI连续低于价格';
    default:
      return type;
  }
};

const getValueSuffix = (type: AlertConfig['type']) => {
  switch (type) {
    case 'CHANGE_PERCENT':
      return '%';
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return '天';
    default:
      return '';
  }
};

interface AlertListProps {
  symbol: string;
}

export interface AlertListRef {
  fetchMonitors: () => void;
}

export const AlertList = forwardRef<AlertListRef, AlertListProps>(({ symbol }, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [monitors, setMonitors] = useState<MonitorResponse[]>([]);

  const fetchMonitors = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/monitors?stockSymbol=${symbol}`);
      if (!response.ok) {
        throw new Error('获取监控规则失败');
      }
      const data = await response.json();
      setMonitors(data);
    } catch (error) {
      console.error('获取监控规则失败:', error);
      toast.error('获取监控规则失败');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchMonitors();
  }, [symbol, fetchMonitors]);

  useImperativeHandle(ref, () => ({
    fetchMonitors
  }));

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch('/api/monitors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isActive: !currentState,
        }),
      });

      if (!response.ok) {
        throw new Error('更新监控规则失败');
      }

      await fetchMonitors();
      toast.success('监控规则已更新');
    } catch (error) {
      console.error('更新监控规则失败:', error);
      toast.error('更新监控规则失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/monitors?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除监控规则失败');
      }

      await fetchMonitors();
      toast.success('监控规则已删除');
    } catch (error) {
      console.error('删除监控规则失败:', error);
      toast.error('删除监控规则失败');
    }
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center py-4'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
      </div>
    );
  }

  if (monitors.length === 0) {
    return <p className='text-gray-600 dark:text-gray-400 text-center py-4'>暂无监控规则</p>;
  }

  return (
    <div className='space-y-3'>
      {monitors.map((monitor) => (
        <div
          key={monitor.id}
          className='bg-white dark:bg-gray-800 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200 shadow-sm'
        >
          <div className='flex items-start sm:items-center justify-between gap-3'>
            <div className='space-y-1 sm:space-y-2 min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium border',
                    monitor.isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                      : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600',
                  )}
                >
                  {getAlertTypeLabel(monitor.type)}
                </span>
              </div>
              <div className='text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium'>
                {monitor.type === 'BBI_ABOVE_CONSECUTIVE' || monitor.type === 'BBI_BELOW_CONSECUTIVE' ? (
                  <span>
                    连续 {monitor.threshold} 天
                  </span>
                ) : (
                  <span>
                    {monitor.condition === 'ABOVE' ? '高于' : '低于'}{' '}
                    {monitor.threshold}
                    {getValueSuffix(monitor.type)}
                  </span>
                )}
                {monitor.costLine && (
                  <span className='ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium'>
                    (成本线: {monitor.costLine})
                  </span>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2 sm:gap-4 flex-shrink-0'>
              <Switch
                checked={monitor.isActive}
                onCheckedChange={() =>
                  handleToggle(monitor.id, monitor.isActive)
                }
              />
              <button
                onClick={() => handleDelete(monitor.id)}
                className='text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg'
              >
                <Trash2Icon className='w-3 h-3 sm:w-4 sm:h-4' />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

AlertList.displayName = 'AlertList';