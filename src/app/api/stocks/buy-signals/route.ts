import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET Session for buy signals:', session);

    if (!session?.user?.id) {
      console.log('未登录或用户ID不存在');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取用户的买入信号设置
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { buySignalJThreshold: true },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取所有股票数据
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

    const buySignals = stocks.map(stock => {
      const quote = stock.quotes[0];
      const kdj = quote?.dailyKdj;
      const trend = quote?.zhixingTrend;

      if (!quote || !kdj || !trend) {
        return {
          symbol: stock.symbol,
          hasBuySignal: false,
        };
      }

      // 检测买入信号条件
      const priceAboveYellow = quote.price > trend.yellowLine;
      const whiteAboveYellow = trend.whiteLine > trend.yellowLine;
      const jBelowThreshold = kdj.j < user.buySignalJThreshold;

      const hasBuySignal = priceAboveYellow && whiteAboveYellow && jBelowThreshold;

      return {
        symbol: stock.symbol,
        hasBuySignal,
        conditions: {
          priceAboveYellow,
          whiteAboveYellow,
          jBelowThreshold,
        },
        whiteLine: trend.whiteLine,
        yellowLine: trend.yellowLine,
        jValue: kdj.j,
        price: quote.price,
        jThreshold: user.buySignalJThreshold,
      };
    });

    return NextResponse.json({ results: buySignals });
  } catch (error) {
    console.error('获取买入信号失败:', error);
    return NextResponse.json(
      { error: '获取买入信号失败' },
      { status: 500 }
    );
  }
}
