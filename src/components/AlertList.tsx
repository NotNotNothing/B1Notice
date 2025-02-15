import { AlertConfig } from '../types/stock';
import { Switch } from '@radix-ui/react-switch';
import { Trash2Icon } from 'lucide-react';
import { useStockStore } from '../store/useStockStore';
import { cn } from '../lib/utils';

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
  const { alerts, toggleAlert, removeAlert } = useStockStore();
  const stockAlerts = alerts.filter((alert) => alert.symbol === symbol);

  if (stockAlerts.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">
        暂无预警设置
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stockAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  alert.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                )}>
                  {getAlertTypeLabel(alert.type)}
                </span>
                <span className="text-white">
                  {alert.condition === 'ABOVE' ? '高于' : '低于'} {alert.value}
                  {alert.type === 'CHANGE_PERCENT' ? '%' : ''}
                </span>
              </div>
              {alert.type === 'KDJ_J' && alert.condition === 'BELOW' && alert.value === -5 && (
                <p className="text-sm text-emerald-400">
                  监控B1购买区间
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={alert.enabled}
                onCheckedChange={() => toggleAlert(alert.id)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  alert.enabled ? "bg-emerald-500" : "bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    alert.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </Switch>
              <button
                onClick={() => removeAlert(alert.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2Icon size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
