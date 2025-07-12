import { StockData } from '../types/stock';
import { AlertList, AlertListRef } from './AlertList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUpDown, TrendingUp, TrendingDown, Plus, Settings } from 'lucide-react';
import { AlertForm } from './AlertForm';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AlertPanelProps {
  stocks: StockData[];
}

export const AlertPanel = ({ stocks }: AlertPanelProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const alertListRefs = useRef<{ [key: string]: AlertListRef }>({});

  const handleAddAlert = (stock: StockData) => {
    setSelectedStock(stock);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedStock(null);
  };

  const handleAlertSaved = (stockSymbol: string) => {
    // 刷新对应股票的AlertList
    const alertListRef = alertListRefs.current[stockSymbol];
    if (alertListRef) {
      alertListRef.fetchMonitors();
    }
  };

  const getStockStatusColor = (stock: StockData) => {
    if (!stock.changePercent || stock.changePercent === 0) return 'border-gray-200/30 dark:border-gray-700/30';
    if (stock.changePercent > 0) return 'border-red-400/30 dark:border-red-500/30';
    if (stock.changePercent < 0) return 'border-green-400/30 dark:border-green-500/30';
    return 'border-gray-200/30 dark:border-gray-700/30';
  };

  const getStockIcon = (stock: StockData) => {
    if (!stock.changePercent) return TrendingUpDown;
    if (stock.changePercent > 0) return TrendingUp;
    if (stock.changePercent < 0) return TrendingDown;
    return TrendingUpDown;
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100'>
            指标监控
          </h2>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            管理您的股票监控规则，实时跟踪重要指标变化
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2'
          >
            <Settings className='h-3 w-3 sm:h-4 sm:w-4' />
            <span className='hidden sm:inline'>批量设置</span>
            <span className='sm:hidden'>批量</span>
          </Button>
        </div>
      </div>

      {stocks.length === 0 ? (
        <Card className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200/50 dark:border-gray-700/50'>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <AlertTriangle className='h-12 w-12 text-gray-400 mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
              暂无股票数据
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
              请先添加股票到监控列表，然后设置相应的指标监控规则
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {stocks.map((stock) => {
            const Icon = getStockIcon(stock);
            return (
              <Card
                key={stock.symbol}
                className={cn(
                  'bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-lg',
                  'border border-gray-200/30 dark:border-gray-700/30 transition-all duration-200 hover:shadow-lg hover:border-gray-300/40 dark:hover:border-gray-600/40',
                  'hover:scale-[1.02] transform',
                  getStockStatusColor(stock)
                )}
              >
                <CardHeader className='pb-3 sm:pb-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <div className={cn(
                        'p-2 sm:p-3 rounded-xl',
                        stock.changePercent > 0 ? 'bg-red-100 dark:bg-red-900/30' :
                        stock.changePercent < 0 ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-gray-100 dark:bg-gray-800'
                      )}>
                        <Icon className={cn(
                          'h-4 w-4 sm:h-6 sm:w-6',
                          stock.changePercent > 0 ? 'text-red-600 dark:text-red-400' :
                          stock.changePercent < 0 ? 'text-green-600 dark:text-green-400' :
                          'text-gray-500 dark:text-gray-400'
                        )} />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <CardTitle className='text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate'>
                          {stock.name}
                        </CardTitle>
                        <div className='flex items-center gap-1 sm:gap-2 mt-1 flex-wrap'>
                          <span className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                            {stock.symbol}
                          </span>
                          {stock.price && (
                            <span className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300'>
                              ¥{stock.price.toFixed(2)}
                            </span>
                          )}
                          {stock.changePercent && (
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium',
                              stock.changePercent > 0 ? 'bg-red-500/20 text-red-400' :
                              stock.changePercent < 0 ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                            )}>
                              {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Dialog open={showDialog && selectedStock?.symbol === stock.symbol} onOpenChange={setShowDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleAddAlert(stock)}
                          className='flex items-center gap-1 sm:gap-2 bg-white/20 hover:bg-white/30 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 border-gray-200/30 dark:border-gray-700/30 text-gray-900 dark:text-gray-100 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 whitespace-nowrap'
                        >
                          <Plus className='h-3 w-3 sm:h-4 sm:w-4' />
                          <span className='hidden sm:inline'>添加监控</span>
                          <span className='sm:hidden'>监控</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className='w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto'>
                        <DialogHeader>
                          <DialogTitle>添加监控规则</DialogTitle>
                          <DialogDescription>
                            为 {stock.name} ({stock.symbol}) 设置监控规则
                          </DialogDescription>
                        </DialogHeader>
                        {selectedStock && (
                          <AlertForm
                            stock={selectedStock}
                            onClose={handleCloseDialog}
                            onSaved={() => handleAlertSaved(selectedStock.symbol)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className='pt-0'>
                  <AlertList
                    symbol={stock.symbol}
                    ref={(ref) => {
                      if (ref) {
                        alertListRefs.current[stock.symbol] = ref;
                      }
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
