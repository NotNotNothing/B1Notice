import { useState } from 'react';
import { StockCard } from './StockCard';
import { AlertForm } from './AlertForm';
import { StockData } from '../types/stock';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@radix-ui/react-dialog';

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
              <StockCard
                data={stock}
                onClick={() => setSelectedStock(stock)}
              />
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>设置预警</DialogTitle>
            <AlertForm
              symbol={selectedStock?.symbol || ''}
              onClose={() => setSelectedStock(null)}
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
};
