import { StockData } from '../types/stock';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface StockCardProps {
  data: StockData;
  onClick?: () => void;
}

export const StockCard = ({ data, onClick }: StockCardProps) => {
  const isPositive = data.change >= 0;
  const lastUpdateTime = formatDistance(new Date(data.lastUpdate), new Date(), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <Card onClick={onClick} className="p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">{data.symbol}</p>
          <h3 className="text-2xl font-semibold">{data.name}</h3>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full text-sm flex items-center",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {isPositive ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
          {data.changePercent.toFixed(2)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">当前价格</p>
          <p className="text-2xl font-semibold">¥{data.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">成交量</p>
          <p className="text-2xl font-semibold">{(data.volume / 10000).toFixed(2)}万</p>
        </div>
      </div>

      {data.kdj && (
        <>
          <Separator />
          <div>
            <p className="text-sm text-gray-500 mb-2">KDJ 指标</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">K值</p>
                <p className="text-2xl font-semibold">{data.kdj.k.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">D值</p>
                <p className="text-2xl font-semibold">{data.kdj.d.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">J值</p>
                <p className="text-2xl font-semibold">{data.kdj.j.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400">{lastUpdateTime}</p>
    </Card>
  );
};
