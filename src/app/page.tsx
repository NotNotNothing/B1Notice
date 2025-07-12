'use client';
import { useStockStore } from '../store/useStockStore';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockList } from '../components/StockList';
import { AlertPanel } from '../components/AlertPanel';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { UserSettings } from '@/components/UserSettings';

export default function Home() {
  const { stocks, fetchStocks, isKDJDescending, toggleSortByKDJ } =
    useStockStore();
  const { data: session } = useSession();

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 5 * 60 * 1000); // 每5分钟刷新一次
    return () => clearInterval(interval);
  }, [fetchStocks]);

  return (
    <main className='container mx-auto p-4 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>曼城阵容监控</h1>
          <p className='text-sm text-gray-500'>不追！不慌！不动！不乱摸！</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={toggleSortByKDJ}
            className='flex items-center gap-1'
          >
            <ArrowUpDown className='h-4 w-4' />
            {isKDJDescending ? 'KDJ降序' : 'KDJ升序'}
          </Button>
          {session?.user && (
            <UserSettings username={session.user.username} />
          )}
        </div>
      </div>

      <Tabs defaultValue='stocks'>
        <TabsList>
          <TabsTrigger value='stocks'>股票列表</TabsTrigger>
          <TabsTrigger value='alerts'>指标监控</TabsTrigger>
        </TabsList>

        <TabsContent value='stocks'>
          <StockList stocks={stocks} onStocksChange={fetchStocks} />
        </TabsContent>

        <TabsContent value='alerts'>
          <AlertPanel stocks={stocks} />
        </TabsContent>

      </Tabs>
    </main>
  );
}