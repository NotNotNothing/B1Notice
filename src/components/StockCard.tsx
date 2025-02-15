import { StockData } from '../types/stock';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/react';

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
    <Card onClick={onClick} className="hover:scale-[1.02] transition-transform duration-300 flex-col p-1">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div>
            <p className="text-gray-500 text-sm">{data.symbol}</p>
            <h3 className="font-medium">{data.name}</h3>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-sm flex items-center gap-1",
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {isPositive ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
            {data.changePercent.toFixed(2)}%
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-sm">当前价格</p>
            <p className="text-lg font-medium">¥{data.price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">成交量</p>
            <p className="text-lg font-medium">{(data.volume / 10000).toFixed(2)}万</p>
          </div>
        </div>

        {data.kdj && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-gray-500 text-sm mb-3">KDJ 指标</p>
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500 text-xs">K值</p>
                <p>{data.kdj.k.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">D值</p>
                <p>{data.kdj.d.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">J值</p>
                <p className={data.kdj.j < -5 ? "text-emerald-600" : ""}>
                  {data.kdj.j.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter>
        <p className="text-gray-500 text-xs">更新于 {lastUpdateTime}</p>
      </CardFooter>
    </Card>
  );
};
