import { NextResponse } from 'next/server';
import { getLongBridgeClient } from '@/server/longbridge/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取用户的所有股票
    const stocks = await prisma.stock.findMany({
      where: {
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
      return NextResponse.json({ results: [] });
    }

    const client = getLongBridgeClient();
    const sellSignalPromises = stocks.map(async (stock) => {
      try {
        const sellSignalResult = await client.checkSellSignal(stock.symbol);
        return {
          symbol: stock.symbol,
          sellSignal: sellSignalResult,
          error: sellSignalResult ? null : '无法获取卖出信号数据',
        };
      } catch (error) {
        console.error(`检测股票 ${stock.symbol} 卖出信号失败:`, error);
        return {
          symbol: stock.symbol,
          sellSignal: null,
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