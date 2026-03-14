import 'server-only';
import { prisma } from '@/lib/prisma';
import type { IQuoteProvider } from '@/server/datasource';

export interface BuySignalConditions {
  priceAboveYellow: boolean;
  whiteAboveYellow: boolean;
  jBelowThreshold: boolean;
}

export interface BuySignalResult {
  hasBuySignal: boolean;
  conditions?: BuySignalConditions;
  whiteLine?: number;
  yellowLine?: number;
  jValue?: number;
  price?: number;
  jThreshold?: number;
}

export interface SellSignalResult {
  hasSellSignal: boolean;
  reason?: string;
}

export async function calculateBuySignal(
  symbol: string,
  userId: string,
  provider?: IQuoteProvider
): Promise<BuySignalResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { buySignalJThreshold: true },
  });

  if (!user) {
    return { hasBuySignal: false };
  }

  const stock = await prisma.stock.findFirst({
    where: { symbol, userId },
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

  const quote = stock?.quotes[0];
  const kdj = quote?.dailyKdj;
  const trend = quote?.zhixingTrend;

  if (!quote || !kdj || !trend) {
    return { hasBuySignal: false };
  }

  const priceAboveYellow = quote.price > trend.yellowLine;
  const whiteAboveYellow = trend.whiteLine > trend.yellowLine;
  const jBelowThreshold = kdj.j < user.buySignalJThreshold;

  const hasBuySignal = priceAboveYellow && whiteAboveYellow && jBelowThreshold;

  return {
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
}

export async function calculateSellSignal(
  symbol: string,
  provider: IQuoteProvider
): Promise<SellSignalResult> {
  try {
    const result = await provider.checkSellSignal(symbol);
    return result || { hasSellSignal: false };
  } catch (error) {
    console.error(`计算卖出信号失败 [${symbol}]:`, error);
    return { hasSellSignal: false };
  }
}

export async function calculateAllSignals(
  userId: string,
  provider: IQuoteProvider
): Promise<Array<{ symbol: string; buySignal: BuySignalResult; sellSignal: SellSignalResult }>> {
  const stocks = await prisma.stock.findMany({
    where: { userId },
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

  const results: Array<{
    symbol: string;
    buySignal: BuySignalResult;
    sellSignal: SellSignalResult;
  }> = [];

  for (const stock of stocks) {
    const [buySignal, sellSignal] = await Promise.all([
      calculateBuySignal(stock.symbol, userId, provider),
      calculateSellSignal(stock.symbol, provider),
    ]);

    results.push({
      symbol: stock.symbol,
      buySignal,
      sellSignal,
    });
  }

  return results;
}

export async function calculateAllBuySignals(
  userId: string
): Promise<Array<{ symbol: string } & BuySignalResult>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { buySignalJThreshold: true },
  });

  if (!user) {
    return [];
  }

  const stocks = await prisma.stock.findMany({
    where: { userId },
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

  return stocks.map((stock) => {
    const quote = stock.quotes[0];
    const kdj = quote?.dailyKdj;
    const trend = quote?.zhixingTrend;

    if (!quote || !kdj || !trend) {
      return {
        symbol: stock.symbol,
        hasBuySignal: false,
      };
    }

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
}
