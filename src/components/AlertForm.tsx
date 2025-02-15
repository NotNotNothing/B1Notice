import { useState } from 'react';
import { AlertConfig, AlertType, type StockData } from '../types/stock';
import { useStockStore } from '../store/useStockStore';
import { cn } from '../lib/utils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, Option } from '@/components/ui/select';

const alertTypes = [
  { value: 'PRICE', label: '价格' },
  { value: 'VOLUME', label: '成交量' },
  { value: 'CHANGE_PERCENT', label: '涨跌幅' },
  { value: 'KDJ_J', label: 'KDJ指标(J值)' },
] as const;

const conditions = [
  { value: 'ABOVE', label: '高于' },
  { value: 'BELOW', label: '低于' },
] as const;

interface AlertFormProps {
  stock: StockData;
  onClose?: () => void;
}

export const AlertForm = ({ stock, onClose }: AlertFormProps) => {
  const addAlert = useStockStore((state) => state.addAlert);
  const [type, setType] = useState<AlertType>('KDJ_J');
  const [condition, setCondition] = useState<AlertConfig['condition']>('BELOW');
  const [value, setValue] = useState<number>(-5);
  const [enabled, setEnabled] = useState(true);

  const handleSubmit = () => {
    const alert: AlertConfig = {
      id: `${stock.symbol}-${type}-${Date.now()}`,
      symbol: stock.symbol,
      type,
      condition,
      value,
      enabled,
    };
    addAlert(alert);
    onClose?.();
  };

  return (
    <Card className='bg-card/5 backdrop-blur-lg border-white/10'>
      <CardHeader>
        <CardTitle>
          {stock.symbol} {stock.nameCn}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='space-y-2'>
          <label className='text-sm text-muted-foreground'>预警类型</label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as AlertType)}
          >
            {alertTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm text-muted-foreground'>条件</label>
          <Select
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value as AlertConfig['condition'])
            }
          >
            {conditions.map((cond) => (
              <Option key={cond.value} value={cond.value}>
                {cond.label}
              </Option>
            ))}
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm text-muted-foreground'>数值</label>
          <Input
            type='number'
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            min={type === 'KDJ_J' ? -100 : 0}
            max={type === 'KDJ_J' ? 100 : undefined}
            step={type === 'CHANGE_PERCENT' || type === 'KDJ_J' ? 0.01 : 1}
          />
          {type === 'KDJ_J' && (
            <p className='text-xs text-muted-foreground'>
              J值范围通常在-100到100之间，小于-5表示可能进入超卖区间
            </p>
          )}
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>启用预警</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardContent>

      <CardFooter className='flex justify-end space-x-4'>
        <Button variant='ghost' onClick={onClose}>
          取消
        </Button>
        <Button
          variant='default'
          onClick={handleSubmit}
          className='bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20'
        >
          确定
        </Button>
      </CardFooter>
    </Card>
  );
};
