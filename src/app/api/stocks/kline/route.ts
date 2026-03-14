import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { getLongBridgeClient, KLINE_PERIOD } from '@/server/longbridge/client';

const parseCount = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 160;
  return Math.min(Math.max(Math.floor(parsed), 30), 1000);
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: '缺少股票代码' }, { status: 400 });
  }

  const periodParam = searchParams.get('period')?.trim().toUpperCase();
  const period = periodParam === 'WEEK' ? KLINE_PERIOD.WEEK : KLINE_PERIOD.DAY;
  const count = parseCount(searchParams.get('count'));

  try {
    const client = getLongBridgeClient();
    const data = await client.getKLineData(symbol, count, period);
    return NextResponse.json({
      symbol,
      period: periodParam === 'WEEK' ? 'WEEK' : 'DAY',
      count,
      data,
    });
  } catch (error) {
    console.error('获取 K 线数据失败:', error);
    return NextResponse.json({ error: '获取 K 线数据失败' }, { status: 500 });
  }
}
