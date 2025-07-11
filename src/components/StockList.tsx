import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface StockListProps {
  stocks: StockData[];
  onStocksChange: () => void;
}

export const StockList = ({ stocks, onStocksChange }: StockListProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockMarket, setNewStockMarket] = useState('HK');
  const removeStock = useStockStore((state) => state.removeStock);

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
    } catch (error) {
      toast.error('删除股票失败');
      onStocksChange();
    }
  };

  return (
    <div>
      <div className='mb-4 flex justify-between items-center'>
        <h2 className='text-2xl font-bold'>股票列表</h2>
        <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
          <DialogTrigger asChild>
            <Button>添加股票</Button>
          </DialogTrigger>
          <DialogContent className='w-[95vw] max-w-md mx-auto'>
            <DialogHeader>
              <DialogTitle>添加新股票</DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='flex flex-col sm:flex-row gap-2'>
                <Input
                  placeholder='股票代码'
                  value={newStockSymbol}
                  onChange={(e) => setNewStockSymbol(e.target.value)}
                  className='flex-1'
                />
                <Select
                  value={newStockMarket}
                  onValueChange={setNewStockMarket}
                >
                  <SelectTrigger className='w-full sm:w-24'>
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
              <Button disabled={isAddingStock} onClick={handleAddStock} className='w-full'>
                {isAddingStock && <Loader2 className='animate-spin mr-2 h-4 w-4' />}
                确认添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {stocks.length === 0 ? (
        <div className='flex flex-col justify-center items-center min-h-[200px]'>
          <h3 className='text-lg font-semibold text-gray-500'>
            请添加股票
          </h3>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {stocks.map((stock) => (
            <Dialog key={stock.symbol}>
              <DialogTrigger asChild>
                <div className='relative group'>
                  <StockCard
                    data={stock}
                    onClick={() => setSelectedStock(stock)}
                  />
                  <Button
                    variant='destructive'
                    size='icon'
                    className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 text-xs'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStock(stock.symbol);
                    }}
                  >
                    X
                  </Button>
                </div>
              </DialogTrigger>
              {selectedStock && selectedStock.symbol === stock.symbol && (
                <DialogContent className='w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto'>
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
                </DialogContent>
              )}
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
};
