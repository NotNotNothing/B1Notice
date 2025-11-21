import { useState, type MouseEvent } from 'react';
import { StockData } from '../types/stock';
import { ArrowUpIcon, ArrowDownIcon, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StockCardProps {
  data: StockData;
  onClick?: () => void;
  showBBITrendSignal?: boolean;
}

export const StockCard = ({
  data,
  onClick,
  showBBITrendSignal = true,
}: StockCardProps) => {
  const [expandedSignal, setExpandedSignal] = useState<'buy' | 'sell' | null>(
    null,
  );
  const isPositive = (data.changePercent ?? 0) >= 0;
  const zhixingTrend = data.zhixingTrend;
  const zhixingStatus = zhixingTrend
    ? zhixingTrend.isGoldenCross
      ? {
          label: '金叉确认',
          description: '白线上穿主力成本线，重点关注放量确认',
          badgeClass:
            'border-amber-300 bg-amber-100/80 text-amber-700 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-200',
        }
      : zhixingTrend.isDeathCross
      ? {
          label: '死叉预警',
          description: '白线跌破主力成本线，警惕趋势破坏',
          badgeClass:
            'border-slate-300 bg-slate-100/80 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
        }
      : zhixingTrend.whiteLine > zhixingTrend.yellowLine
      ? {
          label: '多头结构',
          description: '白线维持在成本线上方，多头趋势延续',
          badgeClass:
            'border-rose-200 bg-rose-100/80 text-rose-600 shadow-sm dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200',
        }
      : {
          label: '空头结构',
          description: '白线位于成本线下方，保持防守',
          badgeClass:
            'border-emerald-200 bg-emerald-100/80 text-emerald-600 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200',
        }
    : null;
  const buySignal = data.buySignal;
  const sellSignal = data.sellSignal;
  const showBuySignal = !!buySignal?.hasBuySignal;
  const showSellSignal = !!sellSignal?.hasSellSignal;
  const showBbiSection = !!data.bbi && showBBITrendSignal;
  const bbi = data.bbi;
  const buySignalThreshold = buySignal?.jThreshold ?? 20;

  const toggleSignal = (type: 'buy' | 'sell', event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setExpandedSignal((prev) => (prev === type ? null : type));
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden rounded-3xl border border-slate-100 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-5 dark:border-slate-800',
        isPositive
          ? 'bg-gradient-to-br from-rose-100/70 via-white/80 to-white/60 dark:from-rose-900/40 dark:via-slate-900/70 dark:to-slate-900/40'
          : 'bg-gradient-to-br from-emerald-100/70 via-white/80 to-white/60 dark:from-emerald-900/35 dark:via-slate-900/70 dark:to-slate-900/40',
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-3 sm:gap-4'>
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>
            <span className='truncate'>{data.symbol}</span>
            {data.market && (
              <span className='rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'>
                {data.market}
              </span>
            )}
          </div>
          <h3 className='text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white'>
            {data.name}
          </h3>
          {data.updatedAt && (
            <p className='text-xs text-slate-400 dark:text-slate-300/80'>
              更新于{' '}
              {format(new Date(data.updatedAt), 'MM-dd HH:mm:ss', {
                locale: zhCN,
              })}
            </p>
          )}
          {(zhixingStatus || showSellSignal) && (
            <div className='flex flex-wrap gap-2'>
              {zhixingStatus && (
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium shadow-sm',
                    zhixingStatus.badgeClass,
                  )}
                >
                  <span>知行多空</span>
                  <span>{zhixingStatus.label}</span>
                </span>
              )}
              {showSellSignal && (
                <span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'>
                  <span className='h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-500' />
                  卖出信号
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 rounded-2xl px-3 py-1.5 text-sm font-medium shadow-sm',
            isPositive
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-200'
              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200',
          )}
        >
          {isPositive ? (
            <ArrowUpIcon size={16} className='shrink-0' />
          ) : (
            <ArrowDownIcon size={16} className='shrink-0' />
          )}
          <span>{(data.changePercent ?? 0).toFixed(2)}%</span>
        </div>
      </div>

      <div className='mt-1 grid gap-3 sm:grid-cols-3 sm:gap-4'>
        <div className='min-w-0 space-y-1 sm:col-span-1'>
          <p className='text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500'>
            当前价格
          </p>
          <p
            className={cn(
              'text-2xl font-semibold sm:text-3xl',
              isPositive
                ? 'text-rose-600 dark:text-rose-300'
                : 'text-emerald-600 dark:text-emerald-300',
            )}
          >
            {(data.price ?? 0).toFixed(2)}
          </p>
        </div>
        <div className='grid grid-cols-2 gap-4 sm:col-span-2 sm:items-start'>
          <div className='min-w-0 space-y-1'>
            <p className='text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500'>
              白线（短期）
            </p>
            <p className='text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white'>
              {zhixingTrend ? zhixingTrend.whiteLine.toFixed(2) : '--'}
            </p>
          </div>
          <div className='min-w-0 space-y-1'>
            <p className='text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500'>
              黄线（长期）
            </p>
            <p className='text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white'>
              {zhixingTrend ? zhixingTrend.yellowLine.toFixed(2) : '--'}
            </p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4 sm:col-span-3 sm:grid-cols-2'>
          <div className='min-w-0 space-y-1'>
            <p className='text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500'>
              日线J值
            </p>
            <p
              className={cn(
                'text-xl font-semibold sm:text-2xl',
                data.kdj?.j !== undefined &&
                  data.kdj.j < -5 &&
                  'text-rose-500 dark:text-rose-300',
                data.kdj?.j !== undefined &&
                  data.kdj.j < 20 &&
                  'text-amber-500 dark:text-amber-300',
              )}
            >
              {data.kdj ? data.kdj.j.toFixed(2) : '--'}
            </p>
          </div>
          <div className='min-w-0 space-y-1'>
            <p className='text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500'>
              周线J值
            </p>
            <p
              className={cn(
                'text-xl font-semibold sm:text-2xl',
                data.weeklyKdj?.j !== undefined &&
                  data.weeklyKdj.j < -5 &&
                  'text-rose-500 dark:text-rose-300',
                data.weeklyKdj?.j !== undefined &&
                  data.weeklyKdj.j < 20 &&
                  'text-amber-500 dark:text-amber-300',
              )}
            >
              {data.weeklyKdj ? data.weeklyKdj.j.toFixed(2) : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* BBI趋势与多空 */}
      {showBbiSection && !showBuySignal && bbi && (
        <div
          className={cn(
            'mt-2 rounded-2xl border p-3 transition-all duration-300 sm:p-4',
            bbi.aboveBBIConsecutiveDays
              ? 'border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/30'
              : bbi.belowBBIConsecutiveDays
              ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60',
          )}
        >
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm',
              bbi.aboveBBIConsecutiveDays
                ? 'border-rose-200 text-rose-700 dark:text-rose-200'
                : bbi.belowBBIConsecutiveDays
                ? 'border-emerald-200 text-emerald-700 dark:text-emerald-200'
                : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200',
            )}
          >
            <span className='font-semibold'>BBI {bbi.bbi.toFixed(2)}</span>
            {bbi.aboveBBIConsecutiveDays && (
              <span className='rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'>
                连续{bbi.aboveBBIConsecutiveDaysCount || 2}日站上BBI
              </span>
            )}
            {bbi.belowBBIConsecutiveDays && (
              <span className='rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'>
                连续{bbi.belowBBIConsecutiveDaysCount || 2}日跌破BBI
              </span>
            )}
            {!bbi.aboveBBIConsecutiveDays && !bbi.belowBBIConsecutiveDays && (
              <span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-200'>
                趋势平衡
              </span>
            )}
          </div>
          <div className='mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-4 sm:gap-3 dark:text-slate-200'>
            <div className='rounded-lg bg-white/70 p-2 text-center shadow-sm dark:bg-slate-800/60'>
              <div className='font-medium text-slate-800 dark:text-slate-100'>
                MA3
              </div>
              <div className='mt-1 break-all'>{bbi.ma3.toFixed(2)}</div>
            </div>
            <div className='rounded-lg bg-white/70 p-2 text-center shadow-sm dark:bg-slate-800/60'>
              <div className='font-medium text-slate-800 dark:text-slate-100'>
                MA6
              </div>
              <div className='mt-1 break-all'>{bbi.ma6.toFixed(2)}</div>
            </div>
            <div className='rounded-lg bg-white/70 p-2 text-center shadow-sm dark:bg-slate-800/60'>
              <div className='font-medium text-slate-800 dark:text-slate-100'>
                MA12
              </div>
              <div className='mt-1 break-all'>{bbi.ma12.toFixed(2)}</div>
            </div>
            <div className='rounded-lg bg-white/70 p-2 text-center shadow-sm dark:bg-slate-800/60'>
              <div className='font-medium text-slate-800 dark:text-slate-100'>
                MA24
              </div>
              <div className='mt-1 break-all'>{bbi.ma24.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 卖出信号提示 */}
      {showSellSignal && sellSignal && (
        <div className='mt-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 p-3 transition-all duration-300 sm:p-4 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-emerald-900/40'>
          <button
            className='flex w-full items-center justify-between gap-3 text-left'
            onClick={(event) => toggleSignal('sell', event)}
          >
            <div>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full bg-emerald-500 animate-pulse' />
                <span className='text-sm font-bold text-emerald-700 dark:text-emerald-200'>
                  ⚠️ 卖出信号
                </span>
              </div>
              <p className='mt-1 text-xs text-emerald-700 dark:text-emerald-200/80'>
                连续{sellSignal.consecutiveDaysBelowWhiteLine}日低于白线，点击查看原因
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-emerald-600 transition-transform',
                expandedSignal === 'sell' && 'rotate-180',
              )}
            />
          </button>

          {expandedSignal === 'sell' && (
            <div className='mt-3 space-y-3'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {sellSignal.lastTwoDaysData.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-2xl border p-3 text-xs shadow-sm transition-all duration-200',
                      day.belowWhiteLine
                        ? 'border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/40'
                        : 'border-slate-200/70 bg-white/80 dark:border-slate-700/70 dark:bg-slate-900/50',
                    )}
                  >
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-sm font-medium text-slate-600 dark:text-slate-200'>
                        {(() => {
                          try {
                            if (!day.date) return '未知日期';
                            let date: Date;
                            if (typeof day.date === 'string') {
                              if (day.date.match(/^\d+$/)) {
                                date = new Date(parseInt(day.date));
                              } else {
                                date = new Date(day.date);
                              }
                            } else {
                              date = new Date(day.date);
                            }

                            if (isNaN(date.getTime())) {
                              console.warn('Invalid date:', day.date);
                              return '日期无效';
                            }
                            return format(date, 'MM-dd', { locale: zhCN });
                          } catch (error) {
                            console.error(
                              'Date formatting error:',
                              error,
                              'for date:',
                              day.date,
                            );
                            return '格式错误';
                          }
                        })()}
                      </span>
                      {day.belowWhiteLine ? (
                        <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200'>
                          低于白线
                        </span>
                      ) : (
                        <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'>
                          高于白线
                        </span>
                      )}
                    </div>
                    <dl className='grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-300/80'>
                      <div className='space-y-0.5'>
                        <dt className='uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500'>
                          价格
                        </dt>
                        <dd className='text-sm font-semibold text-slate-700 dark:text-slate-100'>
                          {day.price.toFixed(2)}
                        </dd>
                      </div>
                      <div className='space-y-0.5'>
                        <dt className='uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500'>
                          白线
                        </dt>
                        <dd className='text-sm font-semibold text-slate-700 dark:text-slate-100'>
                          {day.whiteLine.toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <div className='rounded-xl border border-emerald-200 bg-white/70 p-2 dark:border-emerald-900/60 dark:bg-emerald-950/30'>
                <p className='mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-200'>
                  操作建议：
                </p>
                <ul className='space-y-0.5 text-xs text-emerald-600 dark:text-emerald-200/80'>
                  <li>• 考虑分批减仓或清仓</li>
                  <li>• 密切关注后续走势</li>
                  <li>• 严格执行风控纪律</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 买入信号提示 */}
      {showBuySignal && buySignal && (
        <div className='mt-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-3 transition-all duration-300 sm:p-4 dark:border-blue-900/60 dark:from-blue-950/40 dark:to-blue-900/40'>
          <button
            className='flex w-full items-center justify-between gap-3 text-left'
            onClick={(event) => toggleSignal('buy', event)}
          >
            <div>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full bg-blue-500 animate-pulse' />
                <span className='text-sm font-bold text-blue-700 dark:text-blue-200'>
                  💡 买入信号
                </span>
              </div>
              <p className='mt-1 text-xs text-blue-700 dark:text-blue-200/80'>
                白线{buySignal.whiteLine.toFixed(2)}高于黄线
                {buySignal.yellowLine.toFixed(2)}，J值{buySignal.jValue.toFixed(2)} {'<'} 阈值
                {buySignalThreshold.toFixed(2)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-blue-600 transition-transform',
                expandedSignal === 'buy' && 'rotate-180',
              )}
            />
          </button>

          {expandedSignal === 'buy' && (
            <div className='mt-3 space-y-3'>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div
                  className={cn(
                    'rounded-xl border p-2 text-xs text-center',
                    buySignal.conditions.whiteAboveYellow
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/30'
                      : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60',
                  )}
                >
                  <div className='mb-1 flex items-center justify-center gap-1'>
                    <span className='text-slate-500 dark:text-slate-300'>
                      白线&gt;黄线
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        buySignal.conditions.whiteAboveYellow
                          ? 'bg-blue-200 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {buySignal.conditions.whiteAboveYellow ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className='text-xs text-slate-600 dark:text-slate-300'>
                    {buySignal.whiteLine.toFixed(2)} {'>'}{' '}
                    {buySignal.yellowLine.toFixed(2)}
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-xl border p-2 text-xs text-center',
                    buySignal.conditions.jBelowThreshold
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/30'
                      : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60',
                  )}
                >
                  <div className='mb-1 flex items-center justify-center gap-1'>
                    <span className='text-slate-500 dark:text-slate-300'>
                      J值&lt;阈值
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        buySignal.conditions.jBelowThreshold
                          ? 'bg-blue-200 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {buySignal.conditions.jBelowThreshold ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className='text-xs text-slate-600 dark:text-slate-300'>
                    {buySignal.jValue.toFixed(2)} {'<'}{' '}
                    {buySignalThreshold.toFixed(2)}
                  </div>
                </div>
              </div>
              {buySignal.conditions.volumeContraction !== undefined && (
                <div className='flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'>
                  <span className='h-2 w-2 rounded-full bg-blue-400' />
                  <span className='font-medium'>
                    成交量{buySignal.conditions.volumeContraction ? '缩量' : '放量'}
                  </span>
                  <span className='text-[11px] text-blue-600/70 dark:text-blue-200/70'>
                    相对平均成交量
                  </span>
                </div>
              )}

              <div className='rounded-xl border border-blue-200 bg-white/70 p-2 dark:border-blue-900/60 dark:bg-blue-950/30'>
                <p className='mb-1 text-xs font-medium text-blue-700 dark:text-blue-200'>
                  操作建议：
                </p>
                <ul className='space-y-0.5 text-xs text-blue-600 dark:text-blue-200/80'>
                  <li>• 可考虑分批建仓</li>
                  <li>• 严格控制仓位</li>
                  <li>• 设置好止损点</li>
                </ul>
              </div>
            </div>
          )}
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
