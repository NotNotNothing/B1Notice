import { useState } from 'react';
import { Card, Text, TextInput, Button } from '@tremor/react';
import { DatePicker } from './DatePicker';

interface KDJResult {
  k: number;
  d: number;
  j: number;
  timestamp: number;
}

export const KDJCalculator = () => {
  const [symbol, setSymbol] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KDJResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateKDJ = async () => {
    if (!symbol) {
      setError('请输入股票代码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol,
        date: date.toISOString(),
      });

      const response = await fetch(`/api/kdj?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '计算KDJ时发生错误');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算KDJ时发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <Text className='text-2xl font-semibold  mb-4'>KDJ指标计算器</Text>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <TextInput
          placeholder='请输入股票代码（如：600000）'
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <DatePicker value={date} onChange={setDate} maxDate={new Date()} />
      </div>

      <Button
        className='w-full'
        onClick={calculateKDJ}
        loading={loading}
        disabled={loading || !symbol}
      >
        计算KDJ
      </Button>

      {error && <Text className='text-red-500'>{error}</Text>}

      {result && (
        <Card className='glassmorphism mt-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div>
              <Text className='text-gray-400'>K值</Text>
              <Text className='text-2xl font-semibold'>
                {result.k.toFixed(2)}
              </Text>
            </div>
            <div>
              <Text className='text-gray-400'>D值</Text>
              <Text className='text-2xl font-semibold'>
                {result.d.toFixed(2)}
              </Text>
            </div>
            <div>
              <Text className='text-gray-400'>J值</Text>
              <Text className='text-2xl font-semibold'>
                {result.j.toFixed(2)}
              </Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
