'use client';
import { StockCard } from '../components/StockCard';
import { AlertForm } from '../components/AlertForm';
import { AlertList } from '../components/AlertList';
import { useStockStore } from '../store/useStockStore';
import {
  Grid,
  Title,
  Tab,
  TabList,
  TabGroup,
  TabPanel,
  TabPanels,
  Text,
  Badge,
} from '@tremor/react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { StockData } from '../types/stock';

// 模拟数据（添加 KDJ 数据）
const mockStocks: StockData[] = [
  {
    symbol: '600000',
    name: '浦发银行',
    price: 7.85,
    change: 0.15,
    changePercent: 1.95,
    volume: 234567,
    marketCap: 230000000000,
    lastUpdate: new Date().toISOString(),
    kdj: { k: 45.23, d: 42.56, j: -4.89 },
  },
  {
    symbol: '601318',
    name: '中国平安',
    price: 45.67,
    change: -0.89,
    changePercent: -1.91,
    volume: 789012,
    marketCap: 890000000000,
    lastUpdate: new Date().toISOString(),
    kdj: { k: 38.12, d: 40.45, j: -6.21 },
  },
  {
    symbol: '000001',
    name: '平安银行',
    price: 12.34,
    change: 0.23,
    changePercent: 1.9,
    volume: 456789,
    marketCap: 340000000000,
    lastUpdate: new Date().toISOString(),
    kdj: { k: 52.34, d: 48.67, j: -3.45 },
  },
];

export default function Home() {
  const { data: stocks, loading, error, setData } = useStockStore();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // 加载模拟数据
  useEffect(() => {
    setData(mockStocks);
  }, [setData]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen text-red-500'>
        {error}
      </div>
    );
  }

  return (
    <main className='min-h-screen p-4 sm:p-8'>
      <div className='max-w-7xl mx-auto'>
        <Title className='text-3xl font-bold text-white mb-8'>
          股市指标监控
        </Title>

        <TabGroup>
          <TabList className='flex space-x-2 mb-8 border-none'>
            <Tab className='glassmorphism-tab'>股票列表</Tab>
            <Tab className='glassmorphism-tab'>预警设置</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <div className='flex flex-wrap w-full justify-between'>
                {stocks.map((stock: StockData) => (
                  <Dialog key={stock.symbol}>
                    <DialogTrigger asChild>
                      <div className='w-[32%]'>
                        <StockCard
                          data={stock}
                          onClick={() => setSelectedStock(stock.symbol)}
                        />
                      </div>
                    </DialogTrigger>
                    <DialogContent className='glassmorphism-dialog'>
                      <VisuallyHidden>
                        <DialogTitle>
                          {stock.name} ({stock.symbol}) 预警设置
                        </DialogTitle>
                      </VisuallyHidden>
                      {selectedStock && (
                        <div className='space-y-6'>
                          <AlertForm
                            symbol={selectedStock}
                            onClose={() => setSelectedStock(null)}
                          />
                          <div className='mt-8'>
                            <Text className='text-xl font-semibold text-white mb-4'>
                              当前预警
                            </Text>
                            <AlertList symbol={selectedStock} />
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </TabPanel>

            <TabPanel>
              <div className='space-y-6'>
                {stocks.map((stock: StockData) => (
                  <div key={stock.symbol} className='glassmorphism-card p-6'>
                    <div className='flex items-center justify-between mb-6'>
                      <div>
                        <Text className='text-2xl font-semibold text-white'>
                          {stock.name}
                        </Text>
                        <Text className='text-gray-400'>{stock.symbol}</Text>
                      </div>
                      <Badge
                        color={
                          stock.kdj?.j && stock.kdj.j < -5 ? 'emerald' : 'gray'
                        }
                        className='glassmorphism px-3 py-1'
                      >
                        {stock.kdj?.j && stock.kdj.j < -5 ? 'B1区间' : '观察中'}
                      </Badge>
                    </div>

                    <div className='mb-6'>
                      <Text className='text-gray-400 mb-3'>KDJ 指标</Text>
                      <div className='flex justify-between gap-4'>
                        <div className='glassmorphism p-3 rounded-lg flex-1'>
                          <Text className='text-gray-400 text-sm'>K值</Text>
                          <Text className='text-white text-lg font-medium mt-1'>
                            {stock.kdj?.k.toFixed(2)}
                          </Text>
                        </div>
                        <div className='glassmorphism p-3 rounded-lg flex-1'>
                          <Text className='text-gray-400 text-sm'>D值</Text>
                          <Text className='text-white text-lg font-medium mt-1'>
                            {stock.kdj?.d.toFixed(2)}
                          </Text>
                        </div>
                        <div className='glassmorphism p-3 rounded-lg flex-1'>
                          <Text className='text-gray-400 text-sm'>J值</Text>
                          <Text
                            className={`text-lg font-medium mt-1 ${
                              stock.kdj?.j && stock.kdj.j < -5
                                ? 'text-emerald-400'
                                : 'text-white'
                            }`}
                          >
                            {stock.kdj?.j.toFixed(2)}
                          </Text>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Text className='text-gray-400 mb-3'>预警设置</Text>
                      <AlertList symbol={stock.symbol} />
                    </div>
                  </div>
                ))}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </main>
  );
}
