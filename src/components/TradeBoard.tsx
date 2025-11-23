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
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import type { ChangeEvent } from 'react';

interface TradeBoardProps {
  stocks: StockData[];
  focusSymbol?: string;
}

const formatNumber = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return '--';
  return value.toFixed(2);
};

const cleanCell = (raw: string) =>
  raw?.replace(/^="?/, '').replace(/"?$/, '').trim();

const normalizeSymbol = (code: string) => {
  if (!code) return code;
  const normalized = code.toUpperCase().trim();
  if (normalized.includes('.')) return normalized;
  if (normalized.length === 6) {
    if (['6', '5'].includes(normalized[0])) return `${normalized}.SH`;
    if (['0', '2', '3'].includes(normalized[0])) return `${normalized}.SZ`;
  }
  return normalized;
};

const parseTongDaXinText = (text: string): TradeRecord[] => {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const rows = lines.map((line) => line.split('\t').map(cleanCell));
  const header = rows[0] || [];
  const indexMap = {
    date: header.indexOf('发生日期'),
    business: header.indexOf('业务名称'),
    code: header.indexOf('证券代码'),
    name: header.indexOf('证券名称'),
    price: header.indexOf('成交均价'),
    quantity: header.indexOf('成交数量'),
  };

  const requiredIndexes = Object.values(indexMap).every((v) => v >= 0);
  if (!requiredIndexes) return [];

  const allowedBusiness = ['证券买入清算', '证券卖出清算'];
  const records: TradeRecord[] = [];

  rows.slice(1).forEach((cells) => {
    const business = cells[indexMap.business];
    if (!allowedBusiness.includes(business)) return;
    const date = cells[indexMap.date];
    const code = cells[indexMap.code];
    const price = Number(cells[indexMap.price] || 0);
    const qty = Number(cells[indexMap.quantity] || 0);
    if (!date || !code || !qty || !price) return;

    const name = cells[indexMap.name];
    records.push({
      id: '',
      symbol: normalizeSymbol(code),
      securityName: name,
      side: business === '证券买入清算' ? 'BUY' : 'SELL',
      quantity: qty,
      price,
      tradedAt: `${date} 15:00`,
      note: name ? `导入：通达信对账单（${name}）` : '导入：通达信对账单',
    });
  });

  return records;
};

const parseTongDaXinFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  let text = '';
  try {
    text = new TextDecoder('gb18030').decode(buffer);
  } catch (error) {
    console.warn('TextDecoder 不支持 gb18030，尝试 UTF-8');
    text = new TextDecoder().decode(buffer);
  }
  return parseTongDaXinText(text);
};

export const TradeBoard = ({ stocks, focusSymbol }: TradeBoardProps) => {
  const { records, addRecord, removeRecord, importRecords, updateRecord } = useTradeRecords();
  const [filterSymbol, setFilterSymbol] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState('');
  const [tradedAt, setTradedAt] = useState('');
  const [note, setNote] = useState('');
  const [securityName, setSecurityName] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopRule, setStopRule] = useState<StopRule | undefined>(undefined);
  const [excelImporting, setExcelImporting] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const [hasPushDeer, setHasPushDeer] = useState(false);
  const silentWarned = useRef(false);
  const watchedSymbols = useRef<Set<string>>(new Set());

  const stockMap = useMemo(() => {
    const map = new Map<string, StockData>();
    stocks.forEach((stock) => map.set(stock.symbol, stock));
    return map;
  }, [stocks]);

  useEffect(() => {
    if (focusSymbol) {
      setFilterSymbol(focusSymbol.toUpperCase());
    }
  }, [focusSymbol]);

  useEffect(() => {
    watchedSymbols.current = new Set(stocks.map((s) => s.symbol));
  }, [stocks]);

  const ensureWatch = useCallback(async (symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (watchedSymbols.current.has(normalized)) return;
    watchedSymbols.current.add(normalized);
    const [, market] = normalized.split('.');
    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: normalized,
          market: market || '',
        }),
      });
      if (!response.ok) {
        throw new Error('自动关注失败');
      }
      toast.success(`已自动关注 ${normalized}`);
    } catch (error) {
      console.error('自动关注失败', error);
      watchedSymbols.current.delete(normalized);
      toast.error(`关注 ${normalized} 失败`);
    }
  }, []);

  const resetForm = () => {
    setSymbol('');
    setPrice('');
    setTradedAt('');
    setNote('');
    setSecurityName('');
    setStopLossPrice('');
    setTakeProfitPrice('');
    setStopRule(undefined);
    setSide('BUY');
    setQuantity(100);
  };

  const handleSubmit = async () => {
    if (!symbol || !price || !tradedAt) {
      toast.error('请填写必填字段：代码 / 价格 / 日期时间');
      return;
    }

    const record: TradeRecord = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase(),
      securityName:
        securityName.trim() ||
        stockMap.get(symbol.trim().toUpperCase())?.name,
      side,
      quantity,
      price: Number(price),
      tradedAt,
      note,
      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined,
      stopRule,
    };

    const added = await addRecord(record);
    if (added) {
      toast.success('已添加交易记录');
      resetForm();
    } else {
      toast.info('记录已存在，未重复添加');
    }
    ensureWatch(record.symbol);
  };

  const handleExcelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setExcelImporting(true);
    try {
      const parsed = await parseTongDaXinFile(file);
      if (!parsed.length) {
        toast.error('未解析到交易数据，确认文件为通达信对账单');
        return;
      }
      const uniqueSymbols = Array.from(new Set(parsed.map((p) => p.symbol)));
      uniqueSymbols.forEach(ensureWatch);
      const { added, success, message } = await importRecords(parsed);
      if (!success) {
        toast.error(message || '导入失败，请重试');
      } else if (added === 0) {
        toast.info('没有新记录，已全部去重');
      } else {
        toast.success(`通达信导入完成，新增 ${added} 条记录（已自动去重）`);
      }
    } catch (error) {
      console.error('通达信导入失败', error);
      toast.error('通达信对账单解析失败');
    } finally {
      setExcelImporting(false);
      event.target.value = '';
    }
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
        if (record.isLuZhu) return; // 已完结的订单不再提醒
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
        <div className='flex items-center gap-2'>
          <Input
            placeholder='按股票过滤（如 600570 或 600570.SH）'
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className='h-10 w-56 rounded-xl'
          />
          <Badge className='rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            本地存储，表单导入
          </Badge>
        </div>
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
              placeholder='证券名称（可选）'
              value={securityName}
              onChange={(e) => setSecurityName(e.target.value)}
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
            对账单导入
          </h4>
          <div className='mt-2 space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/60'>
            <div className='flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200'>
              <span>通达信对账单（.xls/.txt）</span>
              <Badge className='rounded-full bg-blue-100 px-3 py-1 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200'>
                自动去重 + 自动关注
              </Badge>
            </div>
            <label className='block rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-inner transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-600'>
              <div className='flex items-center gap-3 text-slate-700 dark:text-slate-200'>
                <span className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm'>
                  选择文件
                </span>
                <span className='text-sm text-slate-500 dark:text-slate-400'>
                  未选择任何文件
                </span>
              </div>
              <Input
                type='file'
                accept='.xls,.txt'
                onChange={handleExcelImport}
                disabled={excelImporting}
                className='mt-2 hidden'
              />
            </label>
            <p className='text-[12px] leading-relaxed text-slate-600 dark:text-slate-300'>
              仅提取“证券买入清算/证券卖出清算”，编码自动识别 GB18030 / UTF-8，导入后自动去重并把未关注的股票加入关注列表。
            </p>
          </div>
        </div>
      </div>

      <div className='mt-5 space-y-3'>
        <h4 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
          最近交易
        </h4>

        {records.length === 0 ? (
          <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'>
            暂无记录，先添加或导入吧。
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {records
              .filter((record) => {
                if (!filterSymbol.trim()) return true;
                const key = filterSymbol.trim().toUpperCase();
                return (
                  record.symbol.toUpperCase().includes(key) ||
                  (record.securityName || '').toUpperCase().includes(key)
                );
              })
              .map((record) => {
              const stock = stockMap.get(record.symbol);
              const currentPrice = stock?.price ?? record.price;
              const pnl =
                record.side === 'BUY'
                  ? (currentPrice - record.price) * record.quantity
                  : (record.price - currentPrice) * record.quantity;
              const handleStopChange = (
                field: 'stopLossPrice' | 'takeProfitPrice',
                value: string,
              ) => {
                updateRecord(record.id, (prev) => ({
                  ...prev,
                  [field]: value ? Number(value) : undefined,
                }));
              };

              const handleStopRuleChange = (value: StopRule | undefined) => {
                updateRecord(record.id, (prev) => ({
                  ...prev,
                  stopRule: value,
                }));
              };

              const displayName =
                record.securityName ||
                stock?.name ||
                record.note?.replace(/导入：通达信对账单（(.+)）/, '$1');

              const toggleLuZhu = () => {
                updateRecord(record.id, (prev) => ({
                  ...prev,
                  isLuZhu: !prev.isLuZhu,
                }));
              };

              return (
                <div
                  key={record.id}
                  className='rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70'
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                        {displayName}
                      </p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                        {record.tradedAt}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {record.isLuZhu && (
                        <Badge className='rounded-full bg-slate-200 px-2 py-1 text-[11px] text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'>
                          卤煮 · 已完结
                        </Badge>
                      )}
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
                            ? 'text-rose-600 dark:text-rose-300'
                            : 'text-emerald-600 dark:text-emerald-200',
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
                  <div className='mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3'>
                    <div className='space-y-1'>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        止损价
                      </p>
                      <Input
                        type='number'
                        value={record.stopLossPrice ?? ''}
                        onChange={(e) =>
                          handleStopChange('stopLossPrice', e.target.value)
                        }
                        placeholder='未设置'
                        className='rounded-lg'
                      />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        止盈价
                      </p>
                      <Input
                        type='number'
                        value={record.takeProfitPrice ?? ''}
                        onChange={(e) =>
                          handleStopChange('takeProfitPrice', e.target.value)
                        }
                        placeholder='未设置'
                        className='rounded-lg'
                      />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        均线止损
                      </p>
                      <Tabs
                        value={record.stopRule || 'none'}
                        onValueChange={(val) =>
                          handleStopRuleChange(
                            val === 'none' ? undefined : (val as StopRule),
                          )
                        }
                        className='w-full'
                      >
                        <TabsList className='grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-800'>
                          <TabsTrigger value='none' className='rounded-md text-[11px]'>
                            无
                          </TabsTrigger>
                          <TabsTrigger
                            value='whiteLine'
                            className='rounded-md text-[11px]'
                          >
                            白线
                          </TabsTrigger>
                          <TabsTrigger
                            value='yellowLine'
                            className='rounded-md text-[11px]'
                          >
                            黄线
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
                    {record.side === 'BUY' && (
                      <Button
                        size='sm'
                        variant={record.isLuZhu ? 'outline' : 'secondary'}
                        className='rounded-lg text-[12px]'
                        onClick={toggleLuZhu}
                      >
                        {record.isLuZhu ? '恢复进行中' : '标记为卤煮'}
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      className='rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30'
                      onClick={() => removeRecord(record.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
