import { useState } from 'react';
import { AlertConfig, AlertType, type StockData } from '../types/stock';
import { useStockStore } from '../store/useStockStore';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
          <label className='text-sm text-muted-foreground'>监控类型</label>
          <Select
            value={type}
            onValueChange={(type) => setType(type as AlertType)}
          >
            <SelectTrigger>
              <SelectValue placeholder='请选择监控类型' />
            </SelectTrigger>
            <SelectContent>
              {alertTypes.map((type) => (
                <SelectItem value={type.value}> {type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm text-muted-foreground'>条件</label>
          <Select
            value={condition}
            onValueChange={(condition) =>
              setCondition(condition as AlertConfig['condition'])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='请选择监控类型' />
            </SelectTrigger>
            <SelectContent>
              {conditions.map((cond) => (
                <SelectItem value={cond.value}> {cond.label}</SelectItem>
              ))}
            </SelectContent>
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
        <Button variant='default' onClick={handleSubmit}>
          确定
        </Button>
      </CardFooter>
    </Card>
  );
};
