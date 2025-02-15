import { StockData } from '../types/stock';
import { AlertList } from './AlertList';

interface AlertPanelProps {
  stocks: StockData[];
}

export const AlertPanel = ({ stocks }: AlertPanelProps) => {
  return (
    <div className='space-y-4'>
      {stocks.map((stock) => (
        <div key={stock.symbol} className='p-4 border rounded-lg'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold'>{stock.nameCn}</h3>
            <p className='text-sm text-gray-500'>{stock.symbol}</p>
          </div>
          <AlertList symbol={stock.symbol} />
        </div>
      ))}
    </div>
  );
};
