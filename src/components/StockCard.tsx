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
  const isPositive = data.changePercent >= 0;

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
          <h3 className='text-2xl font-semibold'>{data.nameCn}</h3>
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
          {data.changePercent.toFixed(2)}%
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
            {data.price.toFixed(2)}
          </p>
        </div>
        {data.kdj && (
          <div>
            <p className='text-sm text-gray-500'>KDJ(J值)</p>
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
