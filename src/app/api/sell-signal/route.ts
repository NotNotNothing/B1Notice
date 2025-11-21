import { NextResponse } from 'next/server';
import { getLongBridgeClient } from '@/server/longbridge/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth.config';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: '股票代码参数缺失' },
        { status: 400 }
      );
    }

    // 验证股票是否属于当前用户
    const stock = await prisma.stock.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        userId: session.user.id,
      },
      include: {
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            zhixingTrend: true,
          },
        },
      },
    });

    if (!stock) {
      return NextResponse.json(
        { error: '未找到该股票或无权限访问' },
        { status: 404 }
      );
    }

    const client = getLongBridgeClient();
    const sellSignalResult = await client.checkSellSignal(symbol.toUpperCase());

    if (!sellSignalResult) {
      return NextResponse.json(
        { error: '无法获取卖出信号数据' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      sellSignal: sellSignalResult,
      currentPrice: stock.quotes[0]?.price || 0,
      whiteLine: stock.quotes[0]?.zhixingTrend?.whiteLine || 0,
      updatedAt: stock.quotes[0]?.updatedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error('获取卖出信号失败:', error);
    return NextResponse.json(
      { error: '获取卖出信号失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: '股票代码列表参数缺失或格式错误' },
        { status: 400 }
      );
    }

    // 批量验证股票是否属于当前用户
    const stocks = await prisma.stock.findMany({
      where: {
        symbol: {
          in: symbols.map(s => s.toUpperCase()),
        },
        userId: session.user.id,
      },
      include: {
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            zhixingTrend: true,
          },
        },
      },
    });

    if (stocks.length === 0) {
      return NextResponse.json(
        { error: '未找到可检测的股票' },
        { status: 404 }
      );
    }

    const client = getLongBridgeClient();
    const sellSignalPromises = stocks.map(async (stock) => {
      try {
        const sellSignalResult = await client.checkSellSignal(stock.symbol);
        return {
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          sellSignal: sellSignalResult,
          currentPrice: stock.quotes[0]?.price || 0,
          whiteLine: stock.quotes[0]?.zhixingTrend?.whiteLine || 0,
          updatedAt: stock.quotes[0]?.updatedAt || new Date().toISOString(),
          error: sellSignalResult ? null : '无法获取卖出信号数据',
        };
      } catch (error) {
        console.error(`检测股票 ${stock.symbol} 卖出信号失败:`, error);
        return {
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          sellSignal: null,
          currentPrice: stock.quotes[0]?.price || 0,
          whiteLine: stock.quotes[0]?.zhixingTrend?.whiteLine || 0,
          updatedAt: stock.quotes[0]?.updatedAt || new Date().toISOString(),
          error: '检测失败',
        };
      }
    });

    const results = await Promise.all(sellSignalPromises);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        withSellSignal: results.filter(r => r.sellSignal?.hasSellSignal).length,
        failed: results.filter(r => r.error).length,
      },
    });
  } catch (error) {
    console.error('批量检测卖出信号失败:', error);
    return NextResponse.json(
      { error: '批量检测卖出信号失败' },
      { status: 500 }
    );
  }
}