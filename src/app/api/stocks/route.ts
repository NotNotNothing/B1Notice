import { NextResponse } from 'next/server';
import { getLongBridgeClient } from '@/server/longbridge/client';
import { body } from 'framer-motion/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbols = body.symbols;
    console.log(symbols);
    const client = getLongBridgeClient();
    const stocksData = await client.getStockQuotes(symbols);

    return NextResponse.json(stocksData);
  } catch (error) {
    console.error('获取股票数据失败:', error);
    return NextResponse.json({ error: '获取股票数据失败' }, { status: 500 });
  }
}
