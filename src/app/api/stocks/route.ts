import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth.config';
import { getQuoteProvider, inferDataSourceFromSymbol, type DataSourceType } from '@/server/datasource';
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

    const stocks = await prisma.stock.findMany({
      where: { userId: session.user.id },
      select: { id: true, symbol: true, market: true },
    });

    if (stocks.length === 0) {
      return NextResponse.json({
        data: [],
        refreshedCount: 0,
        failedCount: 0,
      });
    }

    let refreshedCount = 0;
    let failedCount = 0;

    for (const stock of stocks) {
      try {
        const source = inferDataSourceFromSymbol(stock.symbol, stock.market);
        const provider = await getQuoteProvider(source);
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

    const existingStock = await prisma.stock.findFirst({
      where: {
        userId: session.user.id,
        symbol: normalizedSymbol,
      },
    });

    if (existingStock) {
      return NextResponse.json(
        { error: '该股票已在您的监控列表中' },
        { status: 400 },
      );
    }

    const dataSource = inferDataSourceFromSymbol(normalizedSymbol, market);
    const provider = await getQuoteProvider(dataSource);
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
    const symbolsParam = searchParams.get('symbols');

    // 解析要删除的 symbol 列表
    const symbols: string[] = [];
    if (symbolsParam) {
      symbols.push(...symbolsParam.split(',').map(s => s.trim()).filter(Boolean));
    } else if (symbol) {
      symbols.push(symbol);
    }

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的股票代码' },
        { status: 400 },
      );
    }

    // 查询所有要删除的股票
    const stocks = await prisma.stock.findMany({
      where: {
        symbol: { in: symbols },
        userId: session.user.id,
      },
    });

    if (stocks.length === 0) {
      return NextResponse.json(
        { error: '未找到要删除的股票或无权限删除' },
        { status: 404 },
      );
    }

    const stockIds = stocks.map(s => s.id);

    // 在事务中按顺序删除所有关联数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除关联的通知
      await tx.notification.deleteMany({
        where: {
          monitor: {
            stockId: { in: stockIds }
          }
        }
      });

      // 2. 删除监控规则
      await tx.monitor.deleteMany({
        where: {
          stockId: { in: stockIds }
        }
      });

      // 3. 删除报价
      await tx.quote.deleteMany({
        where: {
          stockId: { in: stockIds }
        }
      });

      // 4. 删除 KDJ 记录
      await tx.kdj.deleteMany({
        where: {
          stockId: { in: stockIds }
        }
      });

      // 5. 删除 BBI 记录
      await tx.bbi.deleteMany({
        where: {
          stockId: { in: stockIds }
        }
      });

      // 6. 删除知行趋势记录
      await tx.zhixingTrend.deleteMany({
        where: {
          stockId: { in: stockIds },
        },
      });

      // 7. 删除股票
      await tx.stock.deleteMany({
        where: {
          id: { in: stockIds }
        }
      });
    });

    return NextResponse.json({
      success: true,
      deletedCount: stocks.length,
      notFoundSymbols: symbols.filter(s => !stocks.some(st => st.symbol === s)),
    });
  } catch (error) {
    console.error('删除股票失败:', error);
    return NextResponse.json(
      { error: '删除股票失败' },
      { status: 500 },
    );
  }
}
