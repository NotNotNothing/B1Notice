import { NextResponse } from 'next/server';
import { getLongBridgeClient } from '@/server/longbridge/client';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const KDJ_TYPE = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
} as const;

export async function GET(request: Request) {
  try {
    const stocks = await prisma.stock.findMany({
      include: {
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            dailyKdj: true,
            weeklyKdj: true,
          },
        },
      } as Prisma.StockInclude,
    });

    const stocksData = stocks.map((stock: any) => {
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
        updatedAt: latestQuote?.updatedAt,
      };
    });

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
      // 创建股票基本信息
      const stock = await prisma.stock.create({
        data: {
          symbol: symbol.toUpperCase(),
          name: staticInfo.nameCn,
          market,
        },
      });

      // 获取股票报价
      const quote = await client.getQuote(symbol.toUpperCase());
      if (!quote) {
        throw new Error('获取股票报价失败');
      }

      // 获取日线KDJ
      const dailyKdj = await client.calculateKDJ(symbol.toUpperCase(), 9, 14); // 14 for DAY

      // 获取周线KDJ
      const weeklyKdj = await client.calculateKDJ(symbol.toUpperCase(), 9, 15); // 15 for WEEK

      if (!dailyKdj.length || !weeklyKdj.length) {
        throw new Error('获取KDJ数据失败');
      }

      // 存储日线KDJ
      const latestDailyKdj = await prisma.kdj.create({
        data: {
          stock: {
            connect: {
              id: stock.id,
            },
          },
          k: dailyKdj[dailyKdj.length - 1].k,
          d: dailyKdj[dailyKdj.length - 1].d,
          j: dailyKdj[dailyKdj.length - 1].j,
          type: KDJ_TYPE.DAILY,
          date: new Date(),
        } as Prisma.KdjCreateInput,
      });

      // 存储周线KDJ
      const latestWeeklyKdj = await prisma.kdj.create({
        data: {
          stock: {
            connect: {
              id: stock.id,
            },
          },
          k: weeklyKdj[weeklyKdj.length - 1].k,
          d: weeklyKdj[weeklyKdj.length - 1].d,
          j: weeklyKdj[weeklyKdj.length - 1].j,
          type: KDJ_TYPE.WEEKLY,
          date: new Date(),
        } as Prisma.KdjCreateInput,
      });

      // 存储股票报价
      const stockQuote = await prisma.quote.create({
        data: {
          stock: {
            connect: {
              id: stock.id,
            },
          },
          price: quote.price,
          volume: quote.volume,
          changePercent: quote.changeRate,
          dailyKdj: {
            connect: {
              id: latestDailyKdj.id,
            },
          },
          weeklyKdj: {
            connect: {
              id: latestWeeklyKdj.id,
            },
          },
        } as Prisma.QuoteCreateInput,
      });

      // 返回完整的股票数据
      return NextResponse.json({
        ...stock,
        price: stockQuote.price,
        volume: stockQuote.volume,
        changePercent: stockQuote.changePercent,
        kdj: {
          k: latestDailyKdj.k,
          d: latestDailyKdj.d,
          j: latestDailyKdj.j,
        },
        weeklyKdj: {
          k: latestWeeklyKdj.k,
          d: latestWeeklyKdj.d,
          j: latestWeeklyKdj.j,
        },
      });
    }

    return NextResponse.json({ error: '找不到股票信息' }, { status: 500 });
  } catch (error) {
    console.error('创建股票失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create stock' },
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
