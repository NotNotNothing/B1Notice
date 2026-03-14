import 'server-only';
import { prisma } from '@/lib/prisma';
import { KDJ_TYPE } from '@/utils';
import type { IQuoteProvider } from '@/server/datasource';
import { KLINE_PERIOD } from '@/server/datasource';

export interface StockDataResult {
  stockId: string;
  symbol: string;
  name: string;
  market: string;
  price: number;
  volume: number;
  changePercent: number;
  dailyKdj: { k: number; d: number; j: number };
  weeklyKdj: { k: number; d: number; j: number };
  bbi?: {
    bbi: number;
    ma3: number;
    ma6: number;
    ma12: number;
    ma24: number;
    aboveBBIConsecutiveDays: boolean;
    belowBBIConsecutiveDays: boolean;
    aboveBBIConsecutiveDaysCount: number;
    belowBBIConsecutiveDaysCount: number;
  };
  zhixingTrend?: {
    whiteLine: number;
    yellowLine: number;
    previousWhiteLine: number;
    previousYellowLine: number;
    isGoldenCross: boolean;
    isDeathCross: boolean;
  };
}

export async function fetchAndStoreStockData(
  symbol: string,
  market: string,
  provider: IQuoteProvider
): Promise<StockDataResult | null> {
  try {
    const quote = await provider.getQuote(symbol);
    if (!quote) {
      console.error(`获取股票 ${symbol} 报价失败`);
      return null;
    }

    const dailyKdj = await provider.calculateKDJ(symbol, KLINE_PERIOD.DAY);
    const weeklyKdj = await provider.calculateKDJ(symbol, KLINE_PERIOD.WEEK);
    const bbiData = await provider.calculateBBI(symbol);
    const zhixingTrendData = await provider.calculateZhixingTrend(symbol);

    if (!dailyKdj.length || !weeklyKdj.length) {
      console.error(`获取股票 ${symbol} KDJ 数据失败`);
      return null;
    }

    return {
      stockId: '',
      symbol,
      name: '',
      market,
      price: quote.price,
      volume: quote.volume,
      changePercent: quote.changeRate,
      dailyKdj: dailyKdj[dailyKdj.length - 1],
      weeklyKdj: weeklyKdj[weeklyKdj.length - 1],
      bbi: bbiData || undefined,
      zhixingTrend: zhixingTrendData || undefined,
    };
  } catch (error) {
    console.error(`获取股票 ${symbol} 数据失败:`, error);
    return null;
  }
}

export async function saveStockDataToDatabase(
  stockId: string,
  data: StockDataResult
): Promise<void> {
  try {
    const existingDailyKdj = await prisma.kdj.findFirst({
      where: { stockId, type: KDJ_TYPE.DAILY },
      select: { id: true },
    });

    const latestDailyKdj = await prisma.kdj.upsert({
      where: { id: existingDailyKdj?.id ?? 'new' },
      update: {
        k: data.dailyKdj.k,
        d: data.dailyKdj.d,
        j: data.dailyKdj.j,
        date: new Date(),
      },
      create: {
        stockId,
        k: data.dailyKdj.k,
        d: data.dailyKdj.d,
        j: data.dailyKdj.j,
        type: KDJ_TYPE.DAILY,
        date: new Date(),
      },
    });

    const existingWeeklyKdj = await prisma.kdj.findFirst({
      where: { stockId, type: KDJ_TYPE.WEEKLY },
      select: { id: true },
    });

    const latestWeeklyKdj = await prisma.kdj.upsert({
      where: { id: existingWeeklyKdj?.id ?? 'new' },
      update: {
        k: data.weeklyKdj.k,
        d: data.weeklyKdj.d,
        j: data.weeklyKdj.j,
        date: new Date(),
      },
      create: {
        stockId,
        k: data.weeklyKdj.k,
        d: data.weeklyKdj.d,
        j: data.weeklyKdj.j,
        type: KDJ_TYPE.WEEKLY,
        date: new Date(),
      },
    });

    let latestBbi = null;
    if (data.bbi) {
      const existingBbi = await prisma.bbi.findFirst({
        where: { stockId },
        select: { id: true },
      });

      latestBbi = await prisma.bbi.upsert({
        where: { id: existingBbi?.id ?? 'new' },
        update: {
          bbi: data.bbi.bbi,
          ma3: data.bbi.ma3,
          ma6: data.bbi.ma6,
          ma12: data.bbi.ma12,
          ma24: data.bbi.ma24,
          aboveBBIConsecutiveDays: data.bbi.aboveBBIConsecutiveDays,
          belowBBIConsecutiveDays: data.bbi.belowBBIConsecutiveDays,
          aboveBBIConsecutiveDaysCount: data.bbi.aboveBBIConsecutiveDaysCount,
          belowBBIConsecutiveDaysCount: data.bbi.belowBBIConsecutiveDaysCount,
          date: new Date(),
        },
        create: {
          stockId,
          bbi: data.bbi.bbi,
          ma3: data.bbi.ma3,
          ma6: data.bbi.ma6,
          ma12: data.bbi.ma12,
          ma24: data.bbi.ma24,
          aboveBBIConsecutiveDays: data.bbi.aboveBBIConsecutiveDays,
          belowBBIConsecutiveDays: data.bbi.belowBBIConsecutiveDays,
          aboveBBIConsecutiveDaysCount: data.bbi.aboveBBIConsecutiveDaysCount,
          belowBBIConsecutiveDaysCount: data.bbi.belowBBIConsecutiveDaysCount,
          date: new Date(),
        },
      });
    }

    let latestZhixingTrend = null;
    if (data.zhixingTrend) {
      const existingTrend = await prisma.zhixingTrend.findFirst({
        where: { stockId },
        select: { id: true },
      });

      latestZhixingTrend = await prisma.zhixingTrend.upsert({
        where: { id: existingTrend?.id ?? 'new' },
        update: {
          whiteLine: data.zhixingTrend.whiteLine,
          yellowLine: data.zhixingTrend.yellowLine,
          previousWhiteLine: data.zhixingTrend.previousWhiteLine,
          previousYellowLine: data.zhixingTrend.previousYellowLine,
          isGoldenCross: data.zhixingTrend.isGoldenCross,
          isDeathCross: data.zhixingTrend.isDeathCross,
          date: new Date(),
        },
        create: {
          stockId,
          whiteLine: data.zhixingTrend.whiteLine,
          yellowLine: data.zhixingTrend.yellowLine,
          previousWhiteLine: data.zhixingTrend.previousWhiteLine,
          previousYellowLine: data.zhixingTrend.previousYellowLine,
          isGoldenCross: data.zhixingTrend.isGoldenCross,
          isDeathCross: data.zhixingTrend.isDeathCross,
          date: new Date(),
        },
      });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: { stockId },
      select: { id: true },
    });

    await prisma.quote.upsert({
      where: { id: existingQuote?.id ?? 'new' },
      update: {
        price: data.price,
        volume: data.volume,
        changePercent: data.changePercent,
        dailyKdjId: latestDailyKdj.id,
        weeklyKdjId: latestWeeklyKdj.id,
        ...(latestBbi ? { bbiId: latestBbi.id } : {}),
        ...(latestZhixingTrend ? { zhixingTrendId: latestZhixingTrend.id } : {}),
      },
      create: {
        stockId,
        price: data.price,
        volume: data.volume,
        changePercent: data.changePercent,
        dailyKdjId: latestDailyKdj.id,
        weeklyKdjId: latestWeeklyKdj.id,
        ...(latestBbi ? { bbiId: latestBbi.id } : {}),
        ...(latestZhixingTrend ? { zhixingTrendId: latestZhixingTrend.id } : {}),
      },
    });
  } catch (error) {
    console.error(`存储股票数据失败 [${data.symbol}]:`, error);
    throw error;
  }
}

export async function fetchSaveAndUpdateStock(
  stockId: string,
  symbol: string,
  market: string,
  provider: IQuoteProvider
): Promise<void> {
  const data = await fetchAndStoreStockData(symbol, market, provider);
  if (data) {
    await saveStockDataToDatabase(stockId, data);
  }
}
