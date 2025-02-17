import { useState } from 'react';
import { StockCard } from './StockCard';
import { AlertForm } from './AlertForm';
import { StockData } from '../types/stock';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StockListProps {
  stocks: StockData[];
}

export const StockList = ({ stocks }: StockListProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {stocks.map((stock) => (
        <Dialog key={stock.symbol}>
          <DialogTrigger asChild>
            <div>
              <StockCard data={stock} onClick={() => setSelectedStock(stock)} />
            </div>
          </DialogTrigger>
          {selectedStock && (
            <DialogContent>
              <DialogTitle>设置买点提醒</DialogTitle>

              <AlertForm
                stock={selectedStock}
                onClose={() => setSelectedStock(null)}
              />
            </DialogContent>
          )}
        </Dialog>
      ))}
    </div>
  );
};
