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
        'p-4 sm:p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer space-y-3 sm:space-y-4 border-none',
        isPositive
          ? 'bg-red-50/80 backdrop-blur-sm'
          : 'bg-emerald-50/80 backdrop-blur-sm',
      )}
    >
      <div className='flex justify-between items-start sm:items-center'>
        <div className='flex-1 min-w-0'>
          <p className='text-sm text-gray-500 truncate'>{data.symbol}</p>
          <h3 className='text-lg sm:text-2xl font-semibold truncate'>
            {data.name}
          </h3>
          {data.updatedAt && (
            <p className='text-xs text-gray-400 mt-1'>
              更新于:{' '}
              {format(new Date(data.updatedAt), 'MM-dd HH:mm:ss', {
                locale: zhCN,
              })}
            </p>
          )}
        </div>
        <div
          className={cn(
            'px-2 py-1 rounded-full text-sm flex items-center flex-shrink-0 ml-2',
            isPositive
              ? 'bg-red-200 text-red-600'
              : 'bg-emerald-200 text-emerald-600',
          )}
        >
          {isPositive ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
          {(data.changePercent ?? 0).toFixed(2)}%
        </div>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        <div className='min-w-0'>
          <p className='text-sm text-gray-500 truncate'>当前价格</p>
          <p
            className={cn(
              'text-xl sm:text-2xl font-semibold',
              isPositive ? 'text-red-600' : 'text-emerald-600',
            )}
          >
            {(data.price ?? 0).toFixed(2)}
          </p>
        </div>
        {data.bbi && (
          <div className='min-w-0'>
            <p className='text-sm text-gray-500 truncate'>BBI指标</p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-semibold',
                data.price && data.price > data.bbi.bbi
                  ? 'text-red-600'
                  : 'text-emerald-600',
              )}
            >
              {data.bbi.bbi.toFixed(2)}
            </p>
          </div>
        )}
        {data.kdj && (
          <div className='min-w-0'>
            <p className='text-sm text-gray-500 truncate'>日线KDJ(J值)</p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-semibold',
                data.kdj.j < -5 && 'text-red-500',
                data.kdj.j < 20 && 'text-yellow-500',
              )}
            >
              {data.kdj.j.toFixed(2)}
            </p>
          </div>
        )}
        {data.weeklyKdj && (
          <div className='min-w-0'>
            <p className='text-sm text-gray-500 truncate'>周线KDJ(J值)</p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-semibold',
                data.weeklyKdj.j < -5 && 'text-red-500',
                data.weeklyKdj.j < 20 && 'text-yellow-500',
              )}
            >
              {data.weeklyKdj.j.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* BBI指标信息 */}
      {data.bbi && (
        <div
          className={cn(
            'mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl border transition-all duration-300',
            data.bbi.aboveBBIConsecutiveDays
              ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
              : data.bbi.belowBBIConsecutiveDays
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
              : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200',
          )}
        >
          {/* 连续状态显示 */}
          {data.bbi.aboveBBIConsecutiveDays ||
          data.bbi.belowBBIConsecutiveDays ? (
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium text-gray-700'>
                  BBI趋势信号
                </span>
              </div>
              <div className='flex items-center gap-2'>
                {data.bbi.aboveBBIConsecutiveDays && (
                  <div className='flex items-center gap-2 bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium border border-red-200 shadow-sm'>
                    <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                    <span>连续2日高于BBI</span>
                    <span className='text-xs bg-red-200 px-2 py-1 rounded-full'>
                      多头信号
                    </span>
                  </div>
                )}
                {data.bbi.belowBBIConsecutiveDays && (
                  <div className='flex items-center gap-2 bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium border border-green-200 shadow-sm'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <span className=''>连续2日低于BBI</span>
                    <span className='text-xs bg-green-200 px-2 py-1 rounded-full'>
                      空头信号
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3'>
              <div className='flex items-center gap-3'>
                <div className='w-2 h-2 rounded-full bg-blue-400 animate-pulse'></div>
                <span className='text-sm font-medium text-gray-700'>
                  BBI趋势信号
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium border border-blue-200 shadow-sm'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                  <span>暂无信号</span>
                </div>
              </div>
            </div>
          )}

          {/* BBI详细信息 */}
          <div
            className={cn(
              data.bbi.aboveBBIConsecutiveDays ||
                data.bbi.belowBBIConsecutiveDays
                ? data.bbi.aboveBBIConsecutiveDays
                  ? 'pt-3 border-t border-red-200'
                  : 'pt-3 border-t border-green-200'
                : 'pt-3 border-t border-blue-200',
            )}
          >
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm font-medium text-gray-700'>
                BBI多空指标
              </span>
              <span
                className={cn(
                  'text-lg font-semibold',
                  data.bbi.aboveBBIConsecutiveDays
                    ? 'text-red-600'
                    : data.bbi.belowBBIConsecutiveDays
                    ? 'text-green-600'
                    : 'text-blue-600',
                )}
              >
                {data.bbi.bbi.toFixed(2)}
              </span>
            </div>
            <div className='grid grid-cols-4 gap-2 sm:gap-4 text-xs text-gray-600'>
              <div className='text-center'>
                <div className='font-medium text-gray-800'>MA3</div>
                <div className='mt-1 break-all'>{data.bbi.ma3.toFixed(2)}</div>
              </div>
              <div className='text-center'>
                <div className='font-medium text-gray-800'>MA6</div>
                <div className='mt-1 break-all'>{data.bbi.ma6.toFixed(2)}</div>
              </div>
              <div className='text-center'>
                <div className='font-medium text-gray-800'>MA12</div>
                <div className='mt-1 break-all'>{data.bbi.ma12.toFixed(2)}</div>
              </div>
              <div className='text-center'>
                <div className='font-medium text-gray-800'>MA24</div>
                <div className='mt-1 break-all'>{data.bbi.ma24.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
