import { useState } from 'react';
import { AlertConfig, AlertType } from '../types/stock';
import { Listbox } from '@headlessui/react';
import { Switch } from '@radix-ui/react-switch';
import { useStockStore } from '../store/useStockStore';
import { cn } from '../lib/utils';
import { ChevronsUpDown as ChevronUpDownIcon, Check as CheckIcon } from 'lucide-react';

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
  symbol: string;
  onClose?: () => void;
}

export const AlertForm = ({ symbol, onClose }: AlertFormProps) => {
  const addAlert = useStockStore((state) => state.addAlert);
  const [type, setType] = useState<AlertType>('KDJ_J');
  const [condition, setCondition] = useState<AlertConfig['condition']>('BELOW');
  const [value, setValue] = useState<number>(-5);
  const [enabled, setEnabled] = useState(true);

  const handleSubmit = () => {
    const alert: AlertConfig = {
      id: `${symbol}-${type}-${Date.now()}`,
      symbol,
      type,
      condition,
      value,
      enabled,
    };
    addAlert(alert);
    onClose?.();
  };

  const selectedTypeLabel = alertTypes.find(t => t.value === type)?.label;
  const selectedConditionLabel = conditions.find(c => c.value === condition)?.label;

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">设置预警 - {symbol}</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">预警类型</label>
          <Listbox value={type} onChange={setType}>
            <div className="relative">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white/5 py-2 pl-3 pr-10 text-left border border-white/10">
                <span className="block truncate">{selectedTypeLabel}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-900/90 backdrop-blur-lg py-1 shadow-lg border border-white/10">
                {alertTypes.map((type) => (
                  <Listbox.Option
                    key={type.value}
                    value={type.value}
                    className={({ active }) =>
                      cn(
                        'relative cursor-pointer select-none py-2 pl-10 pr-4',
                        active ? 'bg-white/10' : ''
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                          {type.label}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-400">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">条件</label>
          <Listbox value={condition} onChange={setCondition}>
            <div className="relative">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white/5 py-2 pl-3 pr-10 text-left border border-white/10">
                <span className="block truncate">{selectedConditionLabel}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-900/90 backdrop-blur-lg py-1 shadow-lg border border-white/10">
                {conditions.map((cond) => (
                  <Listbox.Option
                    key={cond.value}
                    value={cond.value}
                    className={({ active }) =>
                      cn(
                        'relative cursor-pointer select-none py-2 pl-10 pr-4',
                        active ? 'bg-white/10' : ''
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                          {cond.label}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-400">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">数值</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            min={type === 'KDJ_J' ? -100 : 0}
            max={type === 'KDJ_J' ? 100 : undefined}
            step={type === 'CHANGE_PERCENT' || type === 'KDJ_J' ? 0.01 : 1}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
          />
          {type === 'KDJ_J' && (
            <p className="text-xs text-gray-500">
              J值范围通常在-100到100之间，小于-5表示可能进入超卖区间
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">启用预警</span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              enabled ? "bg-emerald-500" : "bg-gray-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </Switch>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
