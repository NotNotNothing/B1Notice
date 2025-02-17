import { NextResponse } from 'next/server';
import { getLongBridgeClient } from '@/server/longbridge/client';
import { prisma } from '@/lib/prisma';
import type { Stock } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // const { searchParams } = new URL(request.url);
    // const symbols = searchParams.get('symbols')?.split(',') || [];
    const stocks = await prisma.stock.findMany();
    const symbols = stocks.map((stock: Stock) => stock.symbol);
    const client = getLongBridgeClient();
    const stocksData = await client.getStockQuotes(symbols);

    return NextResponse.json(stocksData);
  } catch (error) {
    console.error('获取股票数据失败:', error);
    return NextResponse.json({ error: '获取股票数据失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { symbol, market } = await request.json();
    const client = getLongBridgeClient();
    const staticInfo = await client.getStockInfo(symbol.toUpperCase());

    if (staticInfo?.nameCn) {
      const stock = await prisma.stock.create({
        data: {
          symbol: symbol.toUpperCase(),
          name: staticInfo.nameCn,
          market,
        },
      });
      return NextResponse.json(stock);
    }

    return NextResponse.json({ error: '找不到股票信息' }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create stock' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 },
      );
    }

    await prisma.stock.delete({
      where: { symbol },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete stock' },
      { status: 500 },
    );
  }
}
