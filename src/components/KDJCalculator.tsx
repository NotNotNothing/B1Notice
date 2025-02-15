import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/DatePicker';

interface KDJResult {
  k: number;
  d: number;
  j: number;
  timestamp: number;
}

export const KDJCalculator = () => {
  const [symbol, setSymbol] = useState<string>('01810.HK');
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
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className='p-6 space-y-4'>
      <div className='space-y-2'>
        <p className='text-sm text-gray-500'>股票代码</p>
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder='输入股票代码'
          className='w-full'
        />
      </div>

      <div className='space-y-2'>
        <p className='text-sm text-gray-500'>日期</p>
        <DatePicker value={date} onChange={setDate} maxDate={new Date()} />
      </div>

      {error && <p className='text-sm text-red-500'>{error}</p>}

      <Button onClick={calculateKDJ} disabled={loading} className='w-full'>
        {loading ? '计算中...' : '计算KDJ'}
      </Button>

      {result && (
        <div className='space-y-2'>
          <p className='text-sm text-gray-500'>计算结果</p>
          <div className='grid grid-cols-3 gap-4'>
            <div>
              <p className='text-sm text-gray-500'>K值</p>
              <p className='text-2xl font-semibold'>{result.k.toFixed(2)}</p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>D值</p>
              <p className='text-2xl font-semibold'>{result.d.toFixed(2)}</p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>J值</p>
              <p className='text-2xl font-semibold'>{result.j.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
