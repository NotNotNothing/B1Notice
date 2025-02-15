'use client';
import { useStockStore } from '../store/useStockStore';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KDJCalculator } from '../components/KDJCalculator';
import { StockList } from '../components/StockList';
import { AlertPanel } from '../components/AlertPanel';

export default function Home() {
  const { stocks, fetchStocks } = useStockStore();

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  return (
    <main className='container mx-auto p-4 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>股票监控</h1>
          <p className='text-sm text-gray-500'>实时监控您关注的股票</p>
        </div>
        <Badge variant='outline'>Beta</Badge>
      </div>

      <Tabs defaultValue='stocks'>
        <TabsList>
          <TabsTrigger value='stocks'>股票列表</TabsTrigger>
          <TabsTrigger value='alerts'>预警设置</TabsTrigger>
          <TabsTrigger value='kdj'>KDJ计算</TabsTrigger>
        </TabsList>

        <TabsContent value='stocks'>
          <StockList stocks={stocks} />
        </TabsContent>

        <TabsContent value='alerts'>
          <AlertPanel stocks={stocks} />
        </TabsContent>

        <TabsContent value='kdj'>
          <KDJCalculator />
        </TabsContent>
      </Tabs>
    </main>
  );
}
