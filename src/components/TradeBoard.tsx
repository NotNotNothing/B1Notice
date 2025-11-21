'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TradeRecord, StopRule } from '@/types/trade';
import { StockData } from '@/types/stock';
import { useTradeRecords } from '@/hooks/useTradeRecords';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface TradeBoardProps {
  stocks: StockData[];
}

const formatNumber = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return '--';
  return value.toFixed(2);
};

export const TradeBoard = ({ stocks }: TradeBoardProps) => {
  const { records, addRecord, removeRecord, importRecords } = useTradeRecords();
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState('');
  const [tradedAt, setTradedAt] = useState('');
  const [note, setNote] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopRule, setStopRule] = useState<StopRule | undefined>(undefined);
  const [importText, setImportText] = useState('');
  const notifiedIds = useRef<Set<string>>(new Set());
  const [hasPushDeer, setHasPushDeer] = useState(false);
  const silentWarned = useRef(false);

  const stockMap = useMemo(() => {
    const map = new Map<string, StockData>();
    stocks.forEach((stock) => map.set(stock.symbol, stock));
    return map;
  }, [stocks]);

  const resetForm = () => {
    setSymbol('');
    setPrice('');
    setTradedAt('');
    setNote('');
    setStopLossPrice('');
    setTakeProfitPrice('');
    setStopRule(undefined);
    setSide('BUY');
    setQuantity(100);
  };

  const handleSubmit = () => {
    if (!symbol || !price || !tradedAt) {
      toast.error('请填写必填字段：代码 / 价格 / 日期时间');
      return;
    }

    const record: TradeRecord = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase(),
      side,
      quantity,
      price: Number(price),
      tradedAt,
      note,
      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined,
      stopRule,
    };

    addRecord(record);
    toast.success('已添加交易记录');
    resetForm();
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: TradeRecord[] = [];
    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length < 4) return;
      const [rawSymbol, rawSide, qty, px, datetime, sl, tp] = parts.map((p) =>
        p.trim(),
      );
      parsed.push({
        id: crypto.randomUUID(),
        symbol: rawSymbol.toUpperCase(),
        side: rawSide.toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
        quantity: Number(qty) || 0,
        price: Number(px) || 0,
        tradedAt: datetime || new Date().toISOString(),
        stopLossPrice: sl ? Number(sl) : undefined,
        takeProfitPrice: tp ? Number(tp) : undefined,
      });
    });

    if (parsed.length === 0) {
      toast.error('未解析出有效记录，格式示例：600519.SH,BUY,100,1800,2024-11-21 10:30,1750,1900');
      return;
    }

    importRecords(parsed);
    toast.success(`已导入 ${parsed.length} 条记录`);
    setImportText('');
  };

  const sendPushDeer = useCallback(async (title: string, desp: string) => {
    if (!hasPushDeer) {
      if (!silentWarned.current) {
        toast.error('未配置 PushDeer Key，无法发送推送');
        silentWarned.current = true;
      }
      return;
    }
    try {
      const response = await fetch('/api/user/pushdeer/trade-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp }),
      });
      if (!response.ok) {
        throw new Error('PushDeer 推送失败');
      }
    } catch (error) {
      console.error('PushDeer 推送失败', error);
      toast.error('PushDeer 推送失败');
    }
  }, [hasPushDeer]);

  useEffect(() => {
    const fetchPushKey = async () => {
      try {
        const res = await fetch('/api/user/pushdeer');
        if (!res.ok) return;
        const data = await res.json();
        setHasPushDeer(!!data.pushDeerKey);
      } catch (error) {
        console.error('获取 PushDeer Key 失败', error);
      }
    };
    fetchPushKey();
  }, []);

  useEffect(() => {
    const checkCloseAlert = () => {
      const now = new Date();
      const close = new Date();
      close.setHours(15, 0, 0, 0); // 统一默认收盘 15:00，本地时间
      if (now > close) return;
      const minutesToClose = (close.getTime() - now.getTime()) / 60000;
      if (minutesToClose > 10 || minutesToClose < 0) return;

      records.forEach((record) => {
        if (notifiedIds.current.has(record.id)) return;
        const stock = stockMap.get(record.symbol);
        const currentPrice = stock?.price ?? record.price;
        let reason = '';

        if (record.stopLossPrice && currentPrice <= record.stopLossPrice) {
          reason = `跌破止损价 ${formatNumber(record.stopLossPrice)}`;
        } else if (
          record.stopRule === 'whiteLine' &&
          stock?.zhixingTrend &&
          currentPrice <= stock.zhixingTrend.whiteLine
        ) {
          reason = `跌破白线 ${formatNumber(stock.zhixingTrend.whiteLine)}`;
        } else if (
          record.stopRule === 'yellowLine' &&
          stock?.zhixingTrend &&
          currentPrice <= stock.zhixingTrend.yellowLine
        ) {
          reason = `跌破黄线 ${formatNumber(stock.zhixingTrend.yellowLine)}`;
        } else if (
          record.takeProfitPrice &&
          currentPrice >= record.takeProfitPrice
        ) {
          reason = `触发止盈价 ${formatNumber(record.takeProfitPrice)}`;
        }

        if (reason) {
          notifiedIds.current.add(record.id);
          const title = `${record.symbol} 需处理：${reason}`;
          const desp = [
            `- 成交价：${formatNumber(record.price)} 数量：${record.quantity}`,
            `- 当前价：${formatNumber(currentPrice)}`,
            record.stopLossPrice
              ? `- 止损价：${formatNumber(record.stopLossPrice)}`
              : null,
            record.takeProfitPrice
              ? `- 止盈价：${formatNumber(record.takeProfitPrice)}`
              : null,
            record.stopRule === 'whiteLine' && stock?.zhixingTrend
              ? `- 白线：${formatNumber(stock.zhixingTrend.whiteLine)}`
              : null,
            record.stopRule === 'yellowLine' && stock?.zhixingTrend
              ? `- 黄线：${formatNumber(stock.zhixingTrend.yellowLine)}`
              : null,
            `- 方向：${record.side === 'BUY' ? '买入' : '卖出'}`,
            record.note ? `- 备注：${record.note}` : null,
          ]
            .filter(Boolean)
            .join('\n');

          sendPushDeer(title, desp);
        }
      });
    };

    const timer = setInterval(checkCloseAlert, 60 * 1000);
    checkCloseAlert();
    return () => clearInterval(timer);
  }, [records, sendPushDeer, stockMap]);

  return (
    <section className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 dark:border-slate-800 dark:bg-slate-900/80'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <h3 className='text-lg font-semibold text-slate-900 sm:text-xl dark:text-white'>
            交易记录中心
          </h3>
          <p className='text-sm text-slate-500 dark:text-slate-300'>
            导入、记录并跟踪每笔订单，收盘前 10 分钟自动提醒需处理的单子。
          </p>
        </div>
        <Badge className='rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
          本地存储，表单导入
        </Badge>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <div className='rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
          <h4 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
            新增/编辑
          </h4>
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Input
              placeholder='代码（如 600519.SH）'
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className='rounded-lg'
            />
            <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800'>
              <Button
                type='button'
                variant={side === 'BUY' ? 'default' : 'ghost'}
                className='flex-1 rounded-md'
                onClick={() => setSide('BUY')}
              >
                买入
              </Button>
              <Button
                type='button'
                variant={side === 'SELL' ? 'destructive' : 'ghost'}
                className='flex-1 rounded-md'
                onClick={() => setSide('SELL')}
              >
                卖出
              </Button>
            </div>
            <Input
              type='number'
              placeholder='数量'
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className='rounded-lg'
            />
            <Input
              type='number'
              placeholder='成交价'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className='rounded-lg'
            />
            <Input
              type='datetime-local'
              placeholder='成交时间'
              value={tradedAt}
              onChange={(e) => setTradedAt(e.target.value)}
              className='rounded-lg'
            />
            <Input
              placeholder='备注（可选）'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className='rounded-lg'
            />
            <Input
              type='number'
              placeholder='止损价（可选）'
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className='rounded-lg'
            />
            <Input
              type='number'
              placeholder='止盈价（可选）'
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              className='rounded-lg'
            />
            <Tabs
              value={stopRule || 'none'}
              onValueChange={(value) =>
                setStopRule(value === 'none' ? undefined : (value as StopRule))
              }
              className='sm:col-span-2'
            >
              <TabsList className='grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800'>
                <TabsTrigger value='none' className='rounded-lg text-xs'>
                  不跟随均线
                </TabsTrigger>
                <TabsTrigger value='whiteLine' className='rounded-lg text-xs'>
                  跌破白线止损
                </TabsTrigger>
                <TabsTrigger value='yellowLine' className='rounded-lg text-xs'>
                  跌破黄线止损
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button onClick={handleSubmit} className='mt-3 w-full rounded-xl'>
            保存记录
          </Button>
        </div>

        <div className='rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
          <h4 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
            批量导入
          </h4>
          <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
            每行格式：代码,side,数量,价格,时间,止损价,止盈价
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            className='mt-2 rounded-lg'
            placeholder='600519.SH,BUY,100,1800,2024-11-21 10:30,1750,1900'
          />
          <Button
            variant='outline'
            className='mt-3 w-full rounded-xl'
            onClick={handleImport}
          >
            导入记录
          </Button>
        </div>
      </div>

      <div className='mt-5 space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
            最近交易
          </h4>
          <span className='text-xs text-slate-500 dark:text-slate-400'>
            {records.length} 笔
          </span>
        </div>

        {records.length === 0 ? (
          <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'>
            暂无记录，先添加或导入吧。
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {records.map((record) => {
              const stock = stockMap.get(record.symbol);
              const currentPrice = stock?.price ?? record.price;
              const pnl =
                record.side === 'BUY'
                  ? (currentPrice - record.price) * record.quantity
                  : (record.price - currentPrice) * record.quantity;
              return (
                <div
                  key={record.id}
                  className='rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70'
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-semibold text-slate-800 dark:text-slate-100'>
                        {record.symbol}
                      </p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                        {record.tradedAt}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'rounded-full',
                        record.side === 'BUY'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                      )}
                    >
                      {record.side === 'BUY' ? '买入' : '卖出'}
                    </Badge>
                  </div>
                  <div className='mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300'>
                    <div className='rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60'>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        成交价 / 数量
                      </p>
                      <p className='font-semibold text-slate-800 dark:text-slate-100'>
                        {formatNumber(record.price)} · {record.quantity}
                      </p>
                    </div>
                    <div className='rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60'>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        当前价 / 盈亏
                      </p>
                      <p
                        className={cn(
                          'font-semibold',
                          pnl >= 0
                            ? 'text-emerald-600 dark:text-emerald-200'
                            : 'text-rose-600 dark:text-rose-200',
                        )}
                      >
                        {formatNumber(currentPrice)} · {pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400'>
                    {record.stopLossPrice && (
                      <span className='rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'>
                        止损 {formatNumber(record.stopLossPrice)}
                      </span>
                    )}
                    {record.takeProfitPrice && (
                      <span className='rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'>
                        止盈 {formatNumber(record.takeProfitPrice)}
                      </span>
                    )}
                    {record.stopRule === 'whiteLine' && (
                      <span className='rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'>
                        跌破白线止损
                      </span>
                    )}
                    {record.stopRule === 'yellowLine' && (
                      <span className='rounded-full bg-indigo-100 px-2 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'>
                        跌破黄线止损
                      </span>
                    )}
                    {record.note && (
                      <span className='rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                        {record.note}
                      </span>
                    )}
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='mt-2 w-full rounded-lg text-xs text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300'
                    onClick={() => removeRecord(record.id)}
                  >
                    删除这笔记录
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
