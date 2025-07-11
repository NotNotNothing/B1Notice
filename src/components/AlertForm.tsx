import { useState } from 'react';
import { AlertType, type StockData } from '../types/stock';
import { AlertConfig, CreateMonitorRequest, monitorToAlert } from '../types/monitor';
import { useStockStore } from '../store/useStockStore';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const alertTypes = [
  { value: 'PRICE', label: '价格' },
  { value: 'VOLUME', label: '成交量' },
  { value: 'CHANGE_PERCENT', label: '涨跌幅' },
  { value: 'KDJ_J', label: '日KDJ指标(J值)' },
  { value: 'WEEKLY_KDJ_J', label: '周KDJ指标(J值)' },
  { value: 'BBI_ABOVE_CONSECUTIVE', label: 'BBI连续高于价格' },
  { value: 'BBI_BELOW_CONSECUTIVE', label: 'BBI连续低于价格' },
] as const;

const conditions = [
  { value: 'ABOVE', label: '高于' },
  { value: 'BELOW', label: '低于' },
] as const;

interface AlertFormProps {
  stock: StockData;
  onClose?: () => void;
  onSaved?: () => void;
}

const getValueLabel = (type: AlertType): string => {
  switch (type) {
    case 'PRICE':
      return '价格';
    case 'VOLUME':
      return '成交量';
    case 'CHANGE_PERCENT':
      return '涨跌幅(%)';
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
      return 'J值';
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return '连续天数';
    default:
      return '数值';
  }
};

const getMinValue = (type: AlertType): number => {
  switch (type) {
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
      return -100;
    case 'CHANGE_PERCENT':
      return -100;
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return 1;
    default:
      return 0;
  }
};

const getMaxValue = (type: AlertType): number | undefined => {
  switch (type) {
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
      return 100;
    case 'CHANGE_PERCENT':
      return 100;
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return 30;
    default:
      return undefined;
  }
};

const getStepValue = (type: AlertType): number => {
  switch (type) {
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
    case 'CHANGE_PERCENT':
      return 0.01;
    case 'PRICE':
      return 0.01;
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return 1;
    default:
      return 1;
  }
};

const getValueHint = (type: AlertType): JSX.Element | null => {
  switch (type) {
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
      return (
        <p className='text-xs text-muted-foreground'>
          J值范围通常在-100到100之间，小于-5表示可能进入超卖区间，大于105表示可能进入超买区间
        </p>
      );
    case 'CHANGE_PERCENT':
      return (
        <p className='text-xs text-muted-foreground'>
          涨跌幅以百分比表示，例如：5表示上涨5%，-3表示下跌3%
        </p>
      );
    case 'BBI_ABOVE_CONSECUTIVE':
      return (
        <p className='text-xs text-muted-foreground'>
          监控价格连续几天高于BBI指标时触发，例如：设置3表示连续3天高于BBI
        </p>
      );
    case 'BBI_BELOW_CONSECUTIVE':
      return (
        <p className='text-xs text-muted-foreground'>
          监控价格连续几天低于BBI指标时触发，例如：设置3表示连续3天低于BBI
        </p>
      );
    default:
      return null;
  }
};

const getDefaultValue = (type: AlertType): number => {
  switch (type) {
    case 'KDJ_J':
    case 'WEEKLY_KDJ_J':
      return -5;
    case 'CHANGE_PERCENT':
      return 5;
    case 'BBI_ABOVE_CONSECUTIVE':
    case 'BBI_BELOW_CONSECUTIVE':
      return 3;
    case 'PRICE':
      return 0;
    default:
      return 0;
  }
};

export const AlertForm = ({ stock, onClose, onSaved }: AlertFormProps) => {
  const addAlert = useStockStore((state) => state.addAlert);
  const [type, setType] = useState<AlertType>('KDJ_J');
  const [condition, setCondition] = useState<AlertConfig['condition']>('BELOW');
  const [value, setValue] = useState<number>(getDefaultValue(type));
  const [costLine, setCostLine] = useState<number>(stock.price || 0);
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (newType: AlertType) => {
    setType(newType);
    setValue(getDefaultValue(newType));

    // 根据指标类型设置默认条件
    if (newType === 'KDJ_J' || newType === 'WEEKLY_KDJ_J') {
      setCondition('BELOW');
    } else if (newType === 'BBI_ABOVE_CONSECUTIVE') {
      setCondition('ABOVE'); // 固定为ABOVE，但在UI中不显示
    } else if (newType === 'BBI_BELOW_CONSECUTIVE') {
      setCondition('ABOVE'); // 固定为BELOW，但在UI中不显示
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const monitorRequest: CreateMonitorRequest = {
        stockSymbol: stock.symbol,
        type,
        condition,
        threshold: value,
        isActive: enabled,
        costLine: type === 'PRICE' ? costLine : undefined,
      };

      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(monitorRequest),
      });

      if (!response.ok) {
        throw new Error('保存监控规则失败');
      }

      const data = await response.json();
      const alert = monitorToAlert(data);
      addAlert(alert);

      toast.success('指标监控已保存');
      onSaved?.(); // 调用刷新回调
      onClose?.();
    } catch (error) {
      console.error('保存监控规则失败:', error);
      toast.error('保存监控规则失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-4 sm:space-y-6 p-1'>
      <div className='space-y-2'>
        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>监控指标</label>
        <Select
          value={type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className='bg-white/10 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 h-10 sm:h-11'>
            <SelectValue placeholder='请选择监控指标' />
          </SelectTrigger>
          <SelectContent>
            {alertTypes.map((alertType) => (
              <SelectItem key={alertType.value} value={alertType.value}>
                {alertType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>条件</label>
        {type === 'BBI_ABOVE_CONSECUTIVE' || type === 'BBI_BELOW_CONSECUTIVE' ? (
          <div className='bg-white/10 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 rounded-md px-3 py-2 h-10 sm:h-11 flex items-center text-sm text-gray-700 dark:text-gray-300'>
            {type === 'BBI_ABOVE_CONSECUTIVE' ? '连续高于BBI' : '连续低于BBI'}
          </div>
        ) : (
          <Select
            value={condition}
            onValueChange={(condition) =>
              setCondition(condition as AlertConfig['condition'])
            }
          >
            <SelectTrigger className='bg-white/10 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 h-10 sm:h-11'>
              <SelectValue placeholder='请选择条件' />
            </SelectTrigger>
            <SelectContent>
              {conditions.map((cond) => (
                <SelectItem key={cond.value} value={cond.value}>
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          {getValueLabel(type)}
        </label>
        <Input
          type='number'
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          min={getMinValue(type)}
          max={getMaxValue(type)}
          step={getStepValue(type)}
          className='bg-white/10 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 h-10 sm:h-11'
        />
        <div className='min-h-[1rem]'>
          {getValueHint(type)}
        </div>
      </div>

      {type === 'PRICE' && (
        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>自定义成本线</label>
          <Input
            type='number'
            value={costLine}
            onChange={(e) => setCostLine(Number(e.target.value))}
            min={0}
            step={0.01}
            placeholder='输入您的成本价格'
            className='bg-white/10 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 h-10 sm:h-11'
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 min-h-[1rem]'>
            可选：设置后将在监控时参考您的成本价格
          </p>
        </div>
      )}

      <div className='flex items-center justify-between p-3 sm:p-4 bg-white/10 dark:bg-gray-800/50 rounded-lg border border-gray-200/30 dark:border-gray-700/30'>
        <div>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>启用监控</label>
          <p className='text-xs text-gray-500 dark:text-gray-400'>开启后将实时监控指标变化</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className='flex flex-col sm:flex-row gap-3 pt-2'>
        <Button
          variant='outline'
          onClick={onClose}
          className='flex-1 order-2 sm:order-1 h-10 sm:h-11'
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className='flex-1 order-1 sm:order-2 h-10 sm:h-11'
        >
          {isSubmitting ? '保存中...' : '保存监控'}
        </Button>
      </div>
    </div>
  );
};
