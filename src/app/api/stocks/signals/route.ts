import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';
import { getLongBridgeClient } from '@/server/longbridge/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { buySignalJThreshold: true },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const stocks = await prisma.stock.findMany({
      where: { userId: session.user.id },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            dailyKdj: true,
            zhixingTrend: true,
          },
        },
      },
    });

    if (stocks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const client = getLongBridgeClient();

    function buildBuySignal(
      quote: (typeof stocks)[number]['quotes'][number] | undefined,
    ) {
      const kdj = quote?.dailyKdj;
      const trend = quote?.zhixingTrend;

      if (!quote || !kdj || !trend) {
        return { hasBuySignal: false as const };
      }

      const whiteAboveYellow = trend.whiteLine > trend.yellowLine;
      const jBelowThreshold = user ? kdj.j < user.buySignalJThreshold : false;
      const volumeContraction = quote.volume < 1_000_000;
      const hasBuySignal =
        whiteAboveYellow && jBelowThreshold && volumeContraction;

      return {
        hasBuySignal,
        conditions: {
          whiteAboveYellow,
          jBelowThreshold,
          volumeContraction,
        },
        whiteLine: trend.whiteLine,
        yellowLine: trend.yellowLine,
        jValue: kdj.j,
        volume: quote.volume,
        avgVolume: 1_000_000,
        jThreshold: user?.buySignalJThreshold ?? 0,
      };
    }

    type BuySignalResult = ReturnType<typeof buildBuySignal>;
    type SellSignalResponse = Awaited<ReturnType<typeof client.checkSellSignal>>;

    const results: Array<{
      symbol: string;
      buySignal: BuySignalResult;
      sellSignal: SellSignalResponse | null;
      errors: { sell: string | null };
    }> = [];

    for (const stock of stocks) {
      const buySignal = buildBuySignal(stock.quotes[0]);

      let sellSignal = null;
      let sellError: string | null = null;

      try {
        sellSignal = await client.checkSellSignal(stock.symbol);
        if (!sellSignal) {
          sellError = '无法获取卖出信号数据';
        }
      } catch (error) {
        console.error(`检测股票 ${stock.symbol} 卖出信号失败:`, error);
        sellError =
          error instanceof Error ? error.message : '检测失败';
      }

      results.push({
        symbol: stock.symbol,
        buySignal,
        sellSignal,
        errors: {
          sell: sellError,
        },
      });
    }

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        buySignals: results.filter((item) => item.buySignal?.hasBuySignal).length,
        sellSignals: results.filter((item) => item.sellSignal?.hasSellSignal).length,
      },
    });
  } catch (error) {
    console.error('批量检测买卖信号失败:', error);
    return NextResponse.json(
      { error: '批量检测买卖信号失败' },
      { status: 500 },
    );
  }
}
