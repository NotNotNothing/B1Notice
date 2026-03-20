'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { TradeRecord } from '@/types/trade';
import { cn } from '@/lib/utils';
import { calculateKDJSeries, calculateZhixingTrend } from '@/utils/indicators';

const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#10b981';
const ZHIXING_WHITE = '#94a3b8';
const ZHIXING_YELLOW = '#facc15';
const B1_COLOR = '#2563eb';
const Y_PADDING_RATIO = 0.04;

interface CandleData {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  whiteLine?: number;
  yellowLine?: number;
  jValue?: number;
}

interface TradeMarker {
  id: string;
  date: string;
  timestamp: number;
  price: number;
  side: 'BUY' | 'SELL';
  tradedAt: string;
  note?: string;
}

interface B1Marker {
  timestamp: number;
  price: number;
}

interface KLineChartProps {
  symbol?: string;
  records?: TradeRecord[];
  count?: number;
  period?: 'DAY' | 'WEEK';
  className?: string;
}

const formatDateKey = (timestamp: number) => {
  const offsetMs = 8 * 60 * 60 * 1000;
  const date = new Date(timestamp + offsetMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateKey = (date: Date) => formatDateKey(date.getTime());

const formatNumber = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return '--';
  return value.toFixed(2);
};

type KLineTooltipProps = TooltipProps<number, string> & {
  dataMap?: Map<number, CandleData>;
};

const KLineTooltip = ({ active, payload, label, dataMap }: KLineTooltipProps) => {
  if (!active) return null;
  const labelNumber = label !== undefined ? Number(label) : NaN;
  const mappedCandle = Number.isFinite(labelNumber) ? dataMap?.get(labelNumber) : undefined;
  const fallbackCandle = payload?.find((item) =>
    (item.payload as CandleData | undefined)?.open !== undefined,
  )?.payload as CandleData | undefined;
  const candle = mappedCandle ?? fallbackCandle;
  const labelValue = Number.isFinite(labelNumber)
    ? formatDateKey(labelNumber)
    : (candle?.date ?? (label !== undefined ? String(label) : ''));

  return (
    <div className='rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-800 dark:bg-slate-900/95'>
      <div className='font-semibold text-slate-700 dark:text-slate-200'>
        {labelValue || '--'}
      </div>
      <div className='mt-2 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300'>
        <div>开：{formatNumber(candle?.open)}</div>
        <div>高：{formatNumber(candle?.high)}</div>
        <div>低：{formatNumber(candle?.low)}</div>
        <div>收：{formatNumber(candle?.close)}</div>
        <div>白线：{formatNumber(candle?.whiteLine)}</div>
        <div>黄线：{formatNumber(candle?.yellowLine)}</div>
        <div>J值：{formatNumber(candle?.jValue)}</div>
      </div>
    </div>
  );
};

const TradeMarkerShape = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: TradeMarker }) => {
  if (!payload || cx === undefined || cy === undefined) return null;
  const isBuy = payload.side === 'BUY';
  const size = 6;
  const color = isBuy ? UP_COLOR : DOWN_COLOR;
  const path = isBuy
    ? `M ${cx} ${cy - size} L ${cx - size} ${cy + size} L ${cx + size} ${cy + size} Z`
    : `M ${cx - size} ${cy - size} L ${cx + size} ${cy - size} L ${cx} ${cy + size} Z`;

  return (
    <g>
      <path d={path} fill={color} stroke='white' strokeWidth={0.8} />
    </g>
  );
};

const B1MarkerShape = ({ cx, cy }: { cx?: number; cy?: number }) => {
  if (cx === undefined || cy === undefined) return null;
  const width = 20;
  const height = 12;
  const x = cx - width / 2;
  const y = cy - height - 6;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill={B1_COLOR} />
      <text
        x={cx}
        y={y + height - 3}
        textAnchor='middle'
        fontSize={8}
        fill='white'
        style={{ fontWeight: 600 }}
      >
        B1
      </text>
    </g>
  );
};

const getBandSize = (
  axis: { bandSize?: number; scale?: ((value: number) => number) | { bandwidth?: () => number } } | undefined,
  width: number,
  count: number,
) => {
  if (axis) {
    if (typeof axis.bandSize === 'number') return axis.bandSize;
    if (axis.scale && typeof axis.scale === 'object' && 'bandwidth' in axis.scale && typeof axis.scale.bandwidth === 'function') {
      return axis.scale.bandwidth();
    }
  }
  if (!count) return 0;
  return width / count;
};

const CandlestickLayer = ({
  xAxisMap,
  yAxisMap,
  offset,
  data,
}: {
  xAxisMap?: Record<string, { scale: (value: number) => number; bandSize?: number; scaleType?: string }>;
  yAxisMap?: Record<string, { scale: (value: number) => number }>;
  offset?: { width: number; height: number; left?: number; top?: number };
  data?: CandleData[];
}) => {
  if (!data || data.length === 0) return null;
  const xAxis = Object.values(xAxisMap || {})[0];
  const yAxis = Object.values(yAxisMap || {})[0];
  if (!offset) return null;
  const bandSize = getBandSize(xAxis, offset.width, data.length);
  const fallbackBand = bandSize || offset.width / data.length;
  const candleWidth = Math.max(3, Math.min(14, fallbackBand * 0.6));
  const offsetLeft = offset.left ?? 0;
  const offsetTop = offset.top ?? 0;
  const valueSet = data.flatMap((entry) => [
    entry.open,
    entry.high,
    entry.low,
    entry.close,
  ]);
  const valueMin = Math.min(...valueSet);
  const valueMax = Math.max(...valueSet);
  const span = valueMax - valueMin;
  const padding = Number.isFinite(span) && span !== 0
    ? span * Y_PADDING_RATIO
    : (Number.isFinite(valueMax) ? Math.abs(valueMax) * Y_PADDING_RATIO : 0);
  const paddedMin = valueMin - padding;
  const paddedMax = valueMax + padding;
  const scaleY = (value: number) => {
    if (yAxis?.scale) return yAxis.scale(value);
    if (!Number.isFinite(paddedMin) || !Number.isFinite(paddedMax) || paddedMax === paddedMin) {
      return offsetTop + offset.height / 2;
    }
    return offsetTop + (paddedMax - value) / (paddedMax - paddedMin) * offset.height;
  };
  const resolveX = (entry: CandleData, index: number) => {
    const fromScale = xAxis?.scale ? xAxis.scale(entry.timestamp) : undefined;
    if (fromScale !== undefined && Number.isFinite(fromScale)) {
      return fromScale + (bandSize ? bandSize / 2 : 0);
    }
    return offsetLeft + fallbackBand * (index + 0.5);
  };

  return (
    <g>
      {data.map((entry, index) => {
        const centerX = resolveX(entry, index);
        if (!Number.isFinite(centerX)) return null;
        const openY = scaleY(entry.open);
        const closeY = scaleY(entry.close);
        const highY = scaleY(entry.high);
        const lowY = scaleY(entry.low);
        if (![openY, closeY, highY, lowY].every(Number.isFinite)) return null;

        const isUp = entry.close >= entry.open;
        const color = isUp ? UP_COLOR : DOWN_COLOR;
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));

        return (
          <g key={entry.timestamp}>
            <line
              x1={centerX}
              x2={centerX}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth={1}
            />
            <rect
              x={centerX - candleWidth / 2}
              y={bodyY}
              width={candleWidth}
              height={bodyHeight}
              fill={isUp ? color : 'transparent'}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
};

export const KLineChart = ({
  symbol,
  records = [],
  count = 44,
  period = 'DAY',
  className,
}: KLineChartProps) => {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  const periodLabel = period === 'WEEK' ? '周线' : '日线';
  const rangeLabel = period === 'DAY' ? '最近两个月' : `最近${count}根`;
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jThreshold, setJThreshold] = useState(20);

  useEffect(() => {
    if (!normalizedSymbol) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const requestCount = Math.min(1000, Math.max(count, 800));
        const params = new URLSearchParams({
          symbol: normalizedSymbol,
          count: String(requestCount),
          period,
        });
        const response = await fetch(`/api/stocks/kline?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('K线数据获取失败');
        }
        const result = await response.json();
        const rawData = Array.isArray(result.data) ? result.data : [];
        const formatted = rawData
          .map((item: any) => {
            const timestamp = Number(item.timestamp);
            if (!Number.isFinite(timestamp)) return null;
            return {
              timestamp,
              date: toDateKey(new Date(timestamp)),
              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
              volume: Number(item.volume ?? 0),
            } as CandleData;
          })
          .filter((item: CandleData | null): item is CandleData => !!item)
          .sort((a: CandleData, b: CandleData) => a.timestamp - b.timestamp);
        if (alive) {
          setData(formatted);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'K线数据获取失败');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [normalizedSymbol, count, period]);

  useEffect(() => {
    let alive = true;
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/user/bbi-settings');
        if (!response.ok) return;
        const result = await response.json();
        if (alive && typeof result.buySignalJThreshold === 'number') {
          setJThreshold(result.buySignalJThreshold);
        }
      } catch (err) {
        console.error('获取B1阈值失败:', err);
      }
    };

    fetchSettings();
    return () => {
      alive = false;
    };
  }, []);

  const displayData = useMemo(() => {
    if (data.length === 0) return [] as CandleData[];
    return data.slice(-count);
  }, [data, count]);

  const indicatorInput = useMemo(
    () =>
      data.map((item) => ({
        timestamp: String(item.timestamp),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      })),
    [data],
  );

  const trendSeries = useMemo(() => {
    if (indicatorInput.length === 0) return [];
    const result = calculateZhixingTrend(indicatorInput, { seriesLimit: 0 });
    return result?.series ?? [];
  }, [indicatorInput]);

  const trendMap = useMemo(() => {
    const map = new Map<number, { whiteLine: number; yellowLine: number }>();
    trendSeries.forEach((point) => {
      const timestamp = Number(point.timestamp);
      if (!Number.isFinite(timestamp)) return;
      map.set(timestamp, {
        whiteLine: point.whiteLine,
        yellowLine: point.yellowLine,
      });
    });
    return map;
  }, [trendSeries]);

  const kdjSeries = useMemo(() => calculateKDJSeries(indicatorInput), [indicatorInput]);

  const kdjMap = useMemo(() => {
    const map = new Map<number, { j: number }>();
    kdjSeries.forEach((point) => {
      const timestamp = Number(point.timestamp);
      if (!Number.isFinite(timestamp)) return;
      map.set(timestamp, { j: point.j });
    });
    return map;
  }, [kdjSeries]);

  const chartData = useMemo(() => {
    if (displayData.length === 0) return [] as CandleData[];
    return displayData.map((item) => {
      const trend = trendMap.get(item.timestamp);
      const kdj = kdjMap.get(item.timestamp);
      return {
        ...item,
        whiteLine: trend?.whiteLine,
        yellowLine: trend?.yellowLine,
        jValue: kdj?.j,
      };
    });
  }, [displayData, trendMap, kdjMap]);

  const dataMap = useMemo(() => {
    const map = new Map<number, CandleData>();
    chartData.forEach((item) => map.set(item.timestamp, item));
    return map;
  }, [chartData]);

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['dataMin', 'dataMax'];
    const values = chartData.flatMap((item) => [
      item.low,
      item.high,
      item.whiteLine,
      item.yellowLine,
    ]);
    const numericValues = values.filter((value): value is number => Number.isFinite(value));
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return ['dataMin', 'dataMax'];
    }
    const span = maxValue - minValue;
    const padding = span !== 0 ? span * Y_PADDING_RATIO : Math.abs(maxValue) * Y_PADDING_RATIO;
    return [minValue - padding, maxValue + padding];
  }, [chartData]);

  const recordMarkers = useMemo(() => {
    if (!normalizedSymbol || chartData.length === 0) return [] as TradeMarker[];
    const candleMap = new Map<string, CandleData>();
    chartData.forEach((item) => candleMap.set(item.date, item));

    return records
      .filter((record) => record.symbol?.toUpperCase() === normalizedSymbol)
      .map((record) => {
        const tradedAt = new Date(record.tradedAt);
        if (Number.isNaN(tradedAt.getTime())) return null;
        const dateKey = toDateKey(tradedAt);
        const candle = candleMap.get(dateKey);
        if (!candle) return null;
        return {
          id: record.id,
          date: candle.date,
          timestamp: candle.timestamp,
          price: record.price,
          side: record.side,
          tradedAt: record.tradedAt,
          note: record.note,
        } as TradeMarker;
      })
      .filter((item): item is TradeMarker => !!item);
  }, [records, normalizedSymbol, chartData]);

  const b1Markers = useMemo(() => {
    if (chartData.length === 0) return [] as B1Marker[];
    return chartData
      .filter((item) => {
        if (
          item.whiteLine === undefined ||
          item.yellowLine === undefined ||
          item.jValue === undefined
        ) {
          return false;
        }
        return (
          item.close > item.yellowLine &&
          item.whiteLine > item.yellowLine &&
          item.jValue < jThreshold
        );
      })
      .map((item) => ({
        timestamp: item.timestamp,
        price: item.low,
      }));
  }, [chartData, jThreshold]);

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70',
        className,
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h4 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
            K线图
          </h4>
          <p className='text-xs text-slate-500 dark:text-slate-400'>
            {normalizedSymbol
              ? `展示 ${normalizedSymbol} ${rangeLabel}${periodLabel}走势`
              : '输入完整股票代码后显示对应K线'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400'>
          <span className='flex items-center gap-1'>
            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: UP_COLOR }} />
            涨
          </span>
          <span className='flex items-center gap-1'>
            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: DOWN_COLOR }} />
            跌
          </span>
          <span className='flex items-center gap-1'>
            <span className='h-0.5 w-4 rounded-full' style={{ backgroundColor: ZHIXING_WHITE }} />
            白线
          </span>
          <span className='flex items-center gap-1'>
            <span className='h-0.5 w-4 rounded-full' style={{ backgroundColor: ZHIXING_YELLOW }} />
            黄线
          </span>
          <span className='flex items-center gap-1'>
            <span className='text-[10px]' style={{ color: B1_COLOR }}>B1</span>
          </span>
          <span className='flex items-center gap-1'>
            <span className='text-[10px]' style={{ color: UP_COLOR }}>▲</span>
            买入
          </span>
          <span className='flex items-center gap-1'>
            <span className='text-[10px]' style={{ color: DOWN_COLOR }}>▼</span>
            卖出
          </span>
        </div>
      </div>

      <div className='mt-3 min-h-[260px]'>
        {!normalizedSymbol ? (
          <div className='flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'>
            选择或输入股票代码后即可查看 K 线图
          </div>
        ) : loading ? (
          <div className='flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'>
            正在加载 K 线数据…
          </div>
        ) : error ? (
          <div className='flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-rose-300 bg-rose-50 text-sm text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200'>
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className='flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'>
            暂无 K 线数据
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' />
              <XAxis
                dataKey='timestamp'
                type='category'
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval='preserveStartEnd'
                minTickGap={24}
                tickFormatter={(value) => formatDateKey(Number(value))}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                domain={yDomain}
                tickFormatter={(value) => Number(value).toFixed(2)}
                width={48}
              />
              <Tooltip content={<KLineTooltip dataMap={dataMap} />} />
              <Line dataKey='close' stroke='transparent' dot={false} activeDot={false} isAnimationActive={false} />
              <Customized component={CandlestickLayer} />
              <Line
                dataKey='whiteLine'
                stroke={ZHIXING_WHITE}
                dot={false}
                strokeWidth={1.6}
                isAnimationActive={false}
              />
              <Line
                dataKey='yellowLine'
                stroke={ZHIXING_YELLOW}
                dot={false}
                strokeWidth={1.6}
                isAnimationActive={false}
              />
              <Scatter data={b1Markers} dataKey='price' shape={<B1MarkerShape />} />
              <Scatter data={recordMarkers} dataKey='price' shape={<TradeMarkerShape />} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
