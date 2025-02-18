import { StockData } from '../types/stock';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StockCardProps {
  data: StockData;
  onClick?: () => void;
}

export const StockCard = ({ data, onClick }: StockCardProps) => {
  const isPositive = (data.changePercent ?? 0) >= 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer space-y-4 border-none',
        isPositive
          ? 'bg-red-50/80 backdrop-blur-sm'
          : 'bg-emerald-50/80 backdrop-blur-sm',
      )}
    >
      <div className='flex justify-between items-center'>
        <div>
          <p className='text-sm text-gray-500'>{data.symbol}</p>
          <h3 className='text-2xl font-semibold'>{data.name}</h3>
          {data.updatedAt && (
            <p className='text-xs text-gray-400 mt-1'>
              更新于: {format(new Date(data.updatedAt), 'MM-dd HH:mm:ss', { locale: zhCN })}
            </p>
          )}
        </div>
        <div
          className={cn(
            'px-2 py-1 rounded-full text-sm flex items-center',
            isPositive
              ? 'bg-red-200 text-red-600'
              : 'bg-emerald-200 text-emerald-600',
          )}
        >
          {isPositive ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
          {(data.changePercent ?? 0).toFixed(2)}%
        </div>
      </div>

      <div className={cn('flex justify-between')}>
        <div>
          <p className='text-sm text-gray-500'>当前价格</p>
          <p
            className={cn(
              'text-2xl font-semibold',
              isPositive ? 'text-red-600' : 'text-emerald-600',
            )}
          >
            {(data.price ?? 0).toFixed(2)}
          </p>
        </div>
        <div className='flex gap-4'>
          {data.kdj && (
            <div>
              <p className='text-sm text-gray-500'>日线KDJ(J值)</p>
              <p
                className={cn(
                  'text-2xl font-semibold',
                  data.kdj.j < -5 && 'text-red-500',
                  data.kdj.j < 20 && 'text-yellow-500',
                )}
              >
                {data.kdj.j.toFixed(2)}
              </p>
            </div>
          )}
          {data.weeklyKdj && (
            <div>
              <p className='text-sm text-gray-500'>周线KDJ(J值)</p>
              <p
                className={cn(
                  'text-2xl font-semibold',
                  data.weeklyKdj.j < -5 && 'text-red-500',
                  data.weeklyKdj.j < 20 && 'text-yellow-500',
                )}
              >
                {data.weeklyKdj.j.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* {data.kdj && (
        <>
          <Separator />
          <div>
            <p className='text-sm text-gray-500 mb-2'>KDJ 指标</p>
            <div className='flex justify-between'>
              <div>
                <p className='text-sm text-gray-500'>K值</p>
                <p className='text-2xl font-semibold'>
                  {data.kdj.k.toFixed(2)}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500'>D值</p>
                <p className='text-2xl font-semibold'>
                  {data.kdj.d.toFixed(2)}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500'>J值</p>
                <p
                  className={cn(
                    'text-2xl font-semibold',
                    data.kdj.j < -5 && 'text-red-500',
                    data.kdj.j < 20 && 'text-yellow-500',
                  )}
                >
                  {data.kdj.j.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </>
      )} */}
    </Card>
  );
};
