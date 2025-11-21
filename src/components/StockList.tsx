import { useState, useEffect, useCallback } from 'react';
import { StockCard } from './StockCard';
import { AlertForm } from './AlertForm';
import { StockData } from '../types/stock';
import { useStockStore } from '../store/useStockStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

interface StockListProps {
  stocks: StockData[];
  onStocksChange: () => void;
  showBBITrendSignal?: boolean;
}

interface StockSignalApiItem {
  symbol: string;
  buySignal?: {
    hasBuySignal?: boolean;
    conditions?: {
      whiteAboveYellow: boolean;
      jBelowThreshold: boolean;
      volumeContraction: boolean;
    };
    whiteLine: number;
    yellowLine: number;
    jValue: number;
    volume: number;
    avgVolume: number;
    jThreshold?: number;
  } | null;
  sellSignal?: StockData['sellSignal'] | null;
  errors?: {
    sell?: string | null;
  };
}

export const StockList = ({ stocks, onStocksChange, showBBITrendSignal = true }: StockListProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockMarket, setNewStockMarket] = useState('HK');
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [stocksWithSignals, setStocksWithSignals] = useState<StockData[]>(stocks);
  const removeStock = useStockStore((state) => state.removeStock);

  const fetchSignals = useCallback(async () => {
    if (stocks.length === 0) return;

    try {
      setIsLoadingSignals(true);
      const response = await fetch('/api/stocks/signals');

      if (!response.ok) {
        throw new Error('获取信号失败');
      }

      const data: { results: StockSignalApiItem[] } = await response.json();

      const updatedStocks = stocks.map((stock) => {
        const signalData = data.results.find(
          (result) => result.symbol === stock.symbol,
        );

        const buySignalData = signalData?.buySignal;
        const sellSignalData = signalData?.sellSignal;

        const hasBuySignal = !!buySignalData?.hasBuySignal;
        const buySignal = hasBuySignal
          ? {
              hasBuySignal: true,
              conditions: buySignalData.conditions,
              whiteLine: buySignalData.whiteLine,
              yellowLine: buySignalData.yellowLine,
              jValue: buySignalData.jValue,
              volume: buySignalData.volume,
              avgVolume: buySignalData.avgVolume,
              jThreshold: buySignalData.jThreshold ?? 20,
            }
          : undefined;

        const sellSignal = sellSignalData?.hasSellSignal
          ? sellSignalData
          : undefined;

        return {
          ...stock,
          buySignal,
          sellSignal,
        };
      });

      setStocksWithSignals(updatedStocks);
    } catch (error) {
      console.error('获取信号失败:', error);
      toast.error('获取信号失败');
    } finally {
      setIsLoadingSignals(false);
    }
  }, [stocks]);

  useEffect(() => {
    setStocksWithSignals(stocks);
    if (stocks.length > 0) {
      fetchSignals();
    }
  }, [stocks, fetchSignals]);

  const handleAddStock = async () => {
    if (!newStockSymbol) {
      toast.error('请输入股票代码');
      return;
    }

    try {
      setIsAddingStock(true);

      // 检查股票代码是否包含市场后缀
      const symbolParts = newStockSymbol.split('.');
      const symbol = symbolParts[0];
      const market = symbolParts.length > 1 ? symbolParts[1].toUpperCase() : newStockMarket;

      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: `${symbol}.${market}`,
          market: market,
        }),
      });

      if (!response.ok) {
        throw new Error('添加股票失败');
      }

      toast.success('添加股票成功');
      setShowAddStockDialog(false);
      setNewStockSymbol('');
      onStocksChange();
    } catch (error) {
      console.error('添加股票失败:', error);
      toast.error('添加股票失败');
    } finally {
      setIsAddingStock(false);
    }
  };

  const handleDeleteStock = async (symbol: string) => {
    removeStock(symbol);

    try {
      const response = await fetch(`/api/stocks?symbol=${symbol}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除股票失败');
      }

      toast.success('删除股票成功');
      return true;
    } catch (error) {
      console.error('删除股票失败:', error);
      toast.error('删除股票失败');
      onStocksChange();
      return false;
    }
  };

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 dark:border-slate-800 dark:bg-slate-900/80'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <h2 className='text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white'>
              股票列表
            </h2>
            <p className='text-sm text-slate-500 dark:text-slate-300'>
              快速浏览实时指标，点击卡片即可配置监控规则。
            </p>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
            {stocks.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={fetchSignals}
                disabled={isLoadingSignals}
                className='h-10 flex-1 rounded-xl border-slate-200 bg-white/70 text-slate-700 shadow-sm sm:flex-none sm:px-4 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200'
              >
                {isLoadingSignals ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <RefreshCw className='mr-2 h-4 w-4' />
                )}
                刷新交易信号
              </Button>
            )}
            <Dialog
              open={showAddStockDialog}
              onOpenChange={setShowAddStockDialog}
            >
              <DialogTrigger asChild>
                <Button className='h-10 rounded-xl'>添加股票</Button>
              </DialogTrigger>
              <DialogContent className='w-[95vw] max-w-md rounded-2xl border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95'>
                <DialogHeader>
                  <DialogTitle>添加新股票</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Input
                      placeholder='股票代码'
                      value={newStockSymbol}
                      onChange={(e) => setNewStockSymbol(e.target.value)}
                      className='flex-1 rounded-xl'
                    />
                    <Select value={newStockMarket} onValueChange={setNewStockMarket}>
                      <SelectTrigger className='w-full rounded-xl sm:w-24'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='HK'>港股</SelectItem>
                        <SelectItem value='SH'>沪市</SelectItem>
                        <SelectItem value='SZ'>深市</SelectItem>
                        <SelectItem value='US'>美股</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    disabled={isAddingStock}
                    onClick={handleAddStock}
                    className='h-11 w-full rounded-xl'
                  >
                    {isAddingStock && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    确认添加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className='flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 text-center backdrop-blur dark:border-slate-700 dark:bg-slate-900/50'>
          <h3 className='text-lg font-semibold text-slate-600 dark:text-slate-200'>
            暂未添加股票
          </h3>
          <p className='mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-300'>
            点击上方「添加股票」即可开启监控。移动端同样支持完整配置。
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {stocksWithSignals.map((stock) => {
            const isDialogOpen = selectedStock?.symbol === stock.symbol;

            return (
              <Dialog
                key={stock.symbol}
                open={isDialogOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setSelectedStock(stock);
                  } else if (isDialogOpen) {
                    setSelectedStock(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <StockCard
                    data={stock}
                    onClick={() => setSelectedStock(stock)}
                    showBBITrendSignal={showBBITrendSignal}
                  />
                </DialogTrigger>
                {isDialogOpen && (
                  <DialogContent className='mx-auto max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto rounded-3xl border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95'>
                    <DialogHeader>
                      <DialogTitle>添加监控规则</DialogTitle>
                      <DialogDescription>
                        为 {selectedStock.name} ({selectedStock.symbol}) 设置监控规则
                      </DialogDescription>
                    </DialogHeader>
                    <AlertForm
                      stock={selectedStock}
                      onClose={() => setSelectedStock(null)}
                    />
                    <DialogFooter className='mt-4 flex justify-end'>
                      <Button
                        variant='destructive'
                        onClick={async () => {
                          const success = await handleDeleteStock(stock.symbol);
                          if (success) {
                            setSelectedStock(null);
                          }
                        }}
                      >
                        删除股票
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
};
