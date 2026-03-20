import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth.config';
import { getQuoteProvider, type DataSourceType } from '@/server/datasource';
import {
  fetchAndStoreStockData,
  fetchSaveAndUpdateStock,
  saveStockDataToDatabase,
} from '@/server/stock/service';

const stockWithLatestQuoteInclude = {
  quotes: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
    include: {
      dailyKdj: true,
      weeklyKdj: true,
      bbi: true,
      zhixingTrend: true,
    },
  },
} satisfies Prisma.StockInclude;

type UserStockWithLatestQuote = Prisma.StockGetPayload<{
  include: typeof stockWithLatestQuoteInclude;
}>;

async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  return session;
}

async function getUserStocks(userId: string) {
  return prisma.stock.findMany({
    where: {
      userId,
    },
    include: stockWithLatestQuoteInclude,
  });
}

function serializeStocks(stocks: UserStockWithLatestQuote[]) {
  return stocks.map((stock) => {
    const latestQuote = stock.quotes[0];
    return {
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      price: latestQuote?.price,
      volume: latestQuote?.volume,
      changePercent: latestQuote?.changePercent,
      kdj: latestQuote?.dailyKdj
        ? {
            k: latestQuote.dailyKdj.k,
            d: latestQuote.dailyKdj.d,
            j: latestQuote.dailyKdj.j,
          }
        : undefined,
      weeklyKdj: latestQuote?.weeklyKdj
        ? {
            k: latestQuote.weeklyKdj.k,
            d: latestQuote.weeklyKdj.d,
            j: latestQuote.weeklyKdj.j,
          }
        : undefined,
      bbi: latestQuote?.bbi
        ? {
            bbi: latestQuote.bbi.bbi,
            ma3: latestQuote.bbi.ma3,
            ma6: latestQuote.bbi.ma6,
            ma12: latestQuote.bbi.ma12,
            ma24: latestQuote.bbi.ma24,
            aboveBBIConsecutiveDays: latestQuote.bbi.aboveBBIConsecutiveDays,
            belowBBIConsecutiveDays: latestQuote.bbi.belowBBIConsecutiveDays,
            aboveBBIConsecutiveDaysCount: latestQuote.bbi.aboveBBIConsecutiveDaysCount,
            belowBBIConsecutiveDaysCount: latestQuote.bbi.belowBBIConsecutiveDaysCount,
          }
        : undefined,
      zhixingTrend: latestQuote?.zhixingTrend
        ? {
            whiteLine: latestQuote.zhixingTrend.whiteLine,
            yellowLine: latestQuote.zhixingTrend.yellowLine,
            previousWhiteLine: latestQuote.zhixingTrend.previousWhiteLine,
            previousYellowLine: latestQuote.zhixingTrend.previousYellowLine,
            isGoldenCross: latestQuote.zhixingTrend.isGoldenCross,
            isDeathCross: latestQuote.zhixingTrend.isDeathCross,
            updatedAt: latestQuote.zhixingTrend.updatedAt.toISOString(),
          }
        : undefined,
      updatedAt: latestQuote?.updatedAt,
    };
  });
}

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const stocks = await getUserStocks(session.user.id);
    const stocksData = serializeStocks(stocks);

    return NextResponse.json(stocksData);
  } catch (error) {
    console.error('获取股票数据失败:', error);
    return NextResponse.json({ error: '获取股票数据失败' }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const [user, stocks] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { dataSource: true },
      }),
      prisma.stock.findMany({
        where: { userId: session.user.id },
        select: { id: true, symbol: true, market: true },
      }),
    ]);

    if (stocks.length === 0) {
      return NextResponse.json({
        data: [],
        refreshedCount: 0,
        failedCount: 0,
      });
    }

    const provider = await getQuoteProvider(
      (user?.dataSource as DataSourceType | null) ?? 'longbridge',
    );

    let refreshedCount = 0;
    let failedCount = 0;

    for (const stock of stocks) {
      try {
        await fetchSaveAndUpdateStock(
          stock.id,
          stock.symbol,
          stock.market,
          provider,
        );
        refreshedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`刷新股票 ${stock.symbol} 失败:`, error);
      }
    }

    const latestStocks = await getUserStocks(session.user.id);

    return NextResponse.json({
      data: serializeStocks(latestStocks),
      refreshedCount,
      failedCount,
    });
  } catch (error) {
    console.error('刷新股票数据失败:', error);
    return NextResponse.json({ error: '刷新股票数据失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { symbol, market } = await request.json();
    const normalizedSymbol = String(symbol).toUpperCase();

    const [user, existingStock] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { dataSource: true },
      }),
      prisma.stock.findFirst({
        where: {
          userId: session.user.id,
          symbol: normalizedSymbol,
        },
      }),
    ]);

    if (existingStock) {
      return NextResponse.json(
        { error: '该股票已在您的监控列表中' },
        { status: 400 },
      );
    }

    const provider = await getQuoteProvider(
      (user?.dataSource as DataSourceType | null) ?? 'longbridge',
    );
    const staticInfo = await provider.getStockInfo(normalizedSymbol);

    if (!staticInfo?.nameCn) {
      return NextResponse.json({ error: '找不到股票信息' }, { status: 404 });
    }

    const resolvedMarket =
      market || staticInfo.market || normalizedSymbol.split('.').at(-1) || 'UNKNOWN';

    const stockData = await fetchAndStoreStockData(
      normalizedSymbol,
      resolvedMarket,
      provider,
    );

    if (!stockData) {
      return NextResponse.json({ error: '获取股票数据失败' }, { status: 500 });
    }

    const stock = await prisma.stock.create({
      data: {
        symbol: normalizedSymbol,
        name: staticInfo.nameCn,
        market: resolvedMarket,
        userId: session.user.id,
      },
    });

    await saveStockDataToDatabase(stock.id, stockData);

    const createdStock = await prisma.stock.findUnique({
      where: { id: stock.id },
      include: stockWithLatestQuoteInclude,
    });

    if (!createdStock) {
      return NextResponse.json({ error: '创建股票失败' }, { status: 500 });
    }

    return NextResponse.json(serializeStocks([createdStock])[0]);
  } catch (error) {
    console.error('创建股票失败:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create stock',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 },
      );
    }

    // 确保只能删除自己的股票
    const stock = await prisma.stock.findFirst({
      where: {
        symbol,
        userId: session.user.id,
      },
    });

    if (!stock) {
      return NextResponse.json(
        { error: '未找到该股票或无权限删除' },
        { status: 404 },
      );
    }

    // Delete in the correct order to handle foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications related to monitors of this stock
      await tx.notification.deleteMany({
        where: {
          monitor: {
            stockId: stock.id
          }
        }
      });

      // 2. Delete monitors for this stock
      await tx.monitor.deleteMany({
        where: {
          stockId: stock.id
        }
      });

      // 3. Delete quotes for this stock (this will also handle KDJ relations)
      await tx.quote.deleteMany({
        where: {
          stockId: stock.id
        }
      });

      // 4. Delete KDJ records for this stock
      await tx.kdj.deleteMany({
        where: {
          stockId: stock.id
        }
      });

      // 5. Delete BBI records for this stock
      await tx.bbi.deleteMany({
        where: {
          stockId: stock.id
        }
      });

      // 6. Delete Zhixing trend records for this stock
      await tx.zhixingTrend.deleteMany({
        where: {
          stockId: stock.id,
        },
      });

      // 7. Finally delete the stock
      await tx.stock.delete({
        where: {
          id: stock.id
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete stock:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock' },
      { status: 500 },
    );
  }
}
