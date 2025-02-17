import { useEffect, useState } from 'react';
import { AlertConfig } from '../types/stock';
import { Switch } from '@/components/ui/switch';
import { Trash2Icon } from 'lucide-react';
import { useStockStore } from '../store/useStockStore';
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
      return 'KDJ指标(J值)';
    default:
      return type;
  }
};

interface AlertListProps {
  symbol: string;
}

export const AlertList = ({ symbol }: AlertListProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [monitors, setMonitors] = useState<any[]>([]);

  const fetchMonitors = async () => {
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
  };

  useEffect(() => {
    fetchMonitors();
  }, [symbol]);

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
    return <p className='text-gray-500 text-center py-4'>暂无监控规则</p>;
  }

  return (
    <div className='space-y-3'>
      {monitors.map((monitor) => (
        <div
          key={monitor.id}
          className='bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-1 pl-4 pr-4'
        >
          <div className='flex items-center justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-1'>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-sm',
                    monitor.isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-500/20 text-gray-400',
                  )}
                >
                  {getAlertTypeLabel(monitor.type)}
                </span>
                <span>
                  {monitor.condition === 'ABOVE' ? '高于' : '低于'}{' '}
                  {monitor.threshold}
                  {monitor.type === 'CHANGE_PERCENT' ? '%' : ''}
                </span>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <Switch
                checked={monitor.isActive}
                onCheckedChange={() =>
                  handleToggle(monitor.id, monitor.isActive)
                }
              />
              <button
                onClick={() => handleDelete(monitor.id)}
                className='text-gray-400 hover:text-red-400 transition-colors'
              >
                <Trash2Icon className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
