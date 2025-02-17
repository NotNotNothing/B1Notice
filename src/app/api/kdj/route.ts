import { getLongBridgeClient } from '../../../server/longbridge/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const dateStr = searchParams.get('date');

  if (!symbol) {
    return NextResponse.json({ error: '请提供股票代码' }, { status: 400 });
  }

  try {
    const client = getLongBridgeClient();
    const kdjResults = await client.calculateKDJ(symbol);

    if (dateStr) {
      const targetDate = new Date(dateStr);
      const targetTimestamp = targetDate.getTime();

      // 找到最接近目标日期的结果
      const closestResult = kdjResults.reduce((prev, curr) => {
        return Math.abs(curr.timestamp - targetTimestamp) <
          Math.abs(prev.timestamp - targetTimestamp)
          ? curr
          : prev;
      });

      return NextResponse.json(closestResult);
    }

    return NextResponse.json(kdjResults);
  } catch (error) {
    console.error('Error calculating KDJ:', error);
    return NextResponse.json({ error: '计算KDJ时发生错误' }, { status: 500 });
  }
}
