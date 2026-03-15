import 'server-only';

import { prisma } from '@/lib/prisma';
import { getQuoteProvider, KLINE_PERIOD } from '@/server/datasource';
import type { MarketStockInfo } from '@/server/datasource/types';
import { sendClosingScreenerListByPushDeer } from '@/server/pushdeer';
import type { Prisma } from '@prisma/client';
import { getBeijingDayStart } from '@/lib/time';

type UserClosingScreenerConfig = {
  closingScreenerEnabled: boolean;
  closingScreenerNotifyEnabled: boolean;
  closingScreenerMaxDailyJ: number | null;
  closingScreenerMaxWeeklyJ: number | null;
  closingScreenerRequirePriceAboveBBI: boolean;
  closingScreenerMinAboveBBIDays: number | null;
  closingScreenerMinVolumeRatio: number | null;
  closingScreenerLastNotifiedAt?: Date | null;
  pushDeerKey?: string | null;
};

export interface ClosingScreenerRule {
  enabled: boolean;
  notifyEnabled: boolean;
  maxDailyJ: number | null;
  maxWeeklyJ: number | null;
  requirePriceAboveBBI: boolean;
  minAboveBBIDays: number | null;
  minVolumeRatio: number | null;
}

export interface ScreeningSnapshotView {
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePercent: number;
  volume: number;
  dailyK: number;
  dailyD: number;
  dailyJ: number;
  weeklyJ: number;
  bbi: number;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
  volumeRatio: number;
  reasons: string[];
}

export interface ClosingScreenerResults {
  rule: ClosingScreenerRule;
  run: {
    id: string;
    tradeDate: string;
    status: string;
    snapshotCount: number;
    totalSymbols: number;
    finishedAt: string | null;
  } | null;
  matchedStocks: ScreeningSnapshotView[];
}

type SnapshotCreateInput = {
  runId: string;
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePercent: number;
  volume: number;
  dailyK: number;
  dailyD: number;
  dailyJ: number;
  weeklyJ: number;
  bbi: number;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
  volumeRatio: number;
};

const A_SHARE_MARKET = 'A';
const COMPLETED_STATUS = 'COMPLETED';
const RUNNING_STATUS = 'RUNNING';
const FAILED_STATUS = 'FAILED';
const SNAPSHOT_BATCH_SIZE = 200;
const SCAN_BATCH_SIZE = 8;

function getTradeDate(date = new Date()): Date {
  return getBeijingDayStart(date);
}

function isSameDate(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

function roundNumber(value: number): number {
  return Number(value.toFixed(2));
}

function mapRuleFromUser(user: UserClosingScreenerConfig): ClosingScreenerRule {
  return {
    enabled: user.closingScreenerEnabled,
    notifyEnabled: user.closingScreenerNotifyEnabled,
    maxDailyJ: user.closingScreenerMaxDailyJ,
    maxWeeklyJ: user.closingScreenerMaxWeeklyJ,
    requirePriceAboveBBI: user.closingScreenerRequirePriceAboveBBI,
    minAboveBBIDays: user.closingScreenerMinAboveBBIDays,
    minVolumeRatio: user.closingScreenerMinVolumeRatio,
  };
}

function hasActiveCriteria(rule: ClosingScreenerRule): boolean {
  return (
    rule.maxDailyJ !== null ||
    rule.maxWeeklyJ !== null ||
    rule.requirePriceAboveBBI ||
    rule.minAboveBBIDays !== null ||
    rule.minVolumeRatio !== null
  );
}

function evaluateSnapshot(
  snapshot: Omit<ScreeningSnapshotView, 'reasons'>,
  rule: ClosingScreenerRule,
): { matched: boolean; reasons: string[] } {
  if (!rule.enabled || !hasActiveCriteria(rule)) {
    return { matched: false, reasons: [] };
  }

  const reasons: string[] = [];

  if (rule.maxDailyJ !== null) {
    if (snapshot.dailyJ > rule.maxDailyJ) {
      return { matched: false, reasons: [] };
    }
    reasons.push(`日线 J ${snapshot.dailyJ.toFixed(2)} <= ${rule.maxDailyJ.toFixed(2)}`);
  }

  if (rule.maxWeeklyJ !== null) {
    if (snapshot.weeklyJ > rule.maxWeeklyJ) {
      return { matched: false, reasons: [] };
    }
    reasons.push(`周线 J ${snapshot.weeklyJ.toFixed(2)} <= ${rule.maxWeeklyJ.toFixed(2)}`);
  }

  if (rule.requirePriceAboveBBI) {
    if (snapshot.price <= snapshot.bbi) {
      return { matched: false, reasons: [] };
    }
    reasons.push(`股价 ${snapshot.price.toFixed(2)} 站上 BBI ${snapshot.bbi.toFixed(2)}`);
  }

  if (rule.minAboveBBIDays !== null) {
    if (snapshot.aboveBBIConsecutiveDaysCount < rule.minAboveBBIDays) {
      return { matched: false, reasons: [] };
    }
    reasons.push(`连续站上 BBI ${snapshot.aboveBBIConsecutiveDaysCount} 天`);
  }

  if (rule.minVolumeRatio !== null) {
    if (snapshot.volumeRatio < rule.minVolumeRatio) {
      return { matched: false, reasons: [] };
    }
    reasons.push(`量比 ${snapshot.volumeRatio.toFixed(2)} >= ${rule.minVolumeRatio.toFixed(2)}`);
  }

  return { matched: reasons.length > 0, reasons };
}

function calculateVolumeRatio(
  klineData: Array<{ volume: number }>,
  windowSize = 5,
): number {
  if (klineData.length < windowSize + 1) {
    return 0;
  }

  const latestVolume = klineData[klineData.length - 1]?.volume ?? 0;
  const historyVolumes = klineData
    .slice(-(windowSize + 1), -1)
    .map((item) => item.volume)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!latestVolume || historyVolumes.length === 0) {
    return 0;
  }

  const averageVolume =
    historyVolumes.reduce((sum, current) => sum + current, 0) / historyVolumes.length;

  if (!averageVolume) {
    return 0;
  }

  return roundNumber(latestVolume / averageVolume);
}

async function createSnapshotsInBatches(snapshots: SnapshotCreateInput[]): Promise<void> {
  for (let index = 0; index < snapshots.length; index += SNAPSHOT_BATCH_SIZE) {
    const batch = snapshots.slice(index, index + SNAPSHOT_BATCH_SIZE);
    await prisma.marketScreeningSnapshot.createMany({ data: batch });
  }
}

export class ClosingScreenerService {
  async getUserRule(userId: string): Promise<ClosingScreenerRule> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        closingScreenerEnabled: true,
        closingScreenerNotifyEnabled: true,
        closingScreenerMaxDailyJ: true,
        closingScreenerMaxWeeklyJ: true,
        closingScreenerRequirePriceAboveBBI: true,
        closingScreenerMinAboveBBIDays: true,
        closingScreenerMinVolumeRatio: true,
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return mapRuleFromUser(user);
  }

  async updateUserRule(
    userId: string,
    input: Partial<ClosingScreenerRule>,
  ): Promise<ClosingScreenerRule> {
    const updateData: Prisma.UserUpdateInput = {};

    if (input.enabled !== undefined) {
      updateData.closingScreenerEnabled = input.enabled;
    }

    if (input.notifyEnabled !== undefined) {
      updateData.closingScreenerNotifyEnabled = input.notifyEnabled;
    }

    if (input.maxDailyJ !== undefined) {
      updateData.closingScreenerMaxDailyJ = input.maxDailyJ;
    }

    if (input.maxWeeklyJ !== undefined) {
      updateData.closingScreenerMaxWeeklyJ = input.maxWeeklyJ;
    }

    if (input.requirePriceAboveBBI !== undefined) {
      updateData.closingScreenerRequirePriceAboveBBI = input.requirePriceAboveBBI;
    }

    if (input.minAboveBBIDays !== undefined) {
      updateData.closingScreenerMinAboveBBIDays = input.minAboveBBIDays;
    }

    if (input.minVolumeRatio !== undefined) {
      updateData.closingScreenerMinVolumeRatio = input.minVolumeRatio;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        closingScreenerEnabled: true,
        closingScreenerNotifyEnabled: true,
        closingScreenerMaxDailyJ: true,
        closingScreenerMaxWeeklyJ: true,
        closingScreenerRequirePriceAboveBBI: true,
        closingScreenerMinAboveBBIDays: true,
        closingScreenerMinVolumeRatio: true,
      },
    });

    return mapRuleFromUser(user);
  }

  async getLatestResultsForUser(userId: string): Promise<ClosingScreenerResults> {
    const [user, latestRun] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          closingScreenerEnabled: true,
          closingScreenerNotifyEnabled: true,
          closingScreenerMaxDailyJ: true,
          closingScreenerMaxWeeklyJ: true,
          closingScreenerRequirePriceAboveBBI: true,
          closingScreenerMinAboveBBIDays: true,
          closingScreenerMinVolumeRatio: true,
        },
      }),
      prisma.marketScreeningRun.findFirst({
        where: { market: A_SHARE_MARKET, status: COMPLETED_STATUS },
        orderBy: { tradeDate: 'desc' },
        include: {
          snapshots: {
            orderBy: [{ dailyJ: 'asc' }, { volumeRatio: 'desc' }],
          },
        },
      }),
    ]);

    if (!user) {
      throw new Error('用户不存在');
    }

    const rule = mapRuleFromUser(user);

    if (!latestRun) {
      return { rule, run: null, matchedStocks: [] };
    }

    const matchedStocks = latestRun.snapshots
      .map((snapshot) => {
        const baseSnapshot: Omit<ScreeningSnapshotView, 'reasons'> = {
          symbol: snapshot.symbol,
          name: snapshot.name,
          market: snapshot.market,
          price: snapshot.price,
          changePercent: snapshot.changePercent,
          volume: snapshot.volume,
          dailyK: snapshot.dailyK,
          dailyD: snapshot.dailyD,
          dailyJ: snapshot.dailyJ,
          weeklyJ: snapshot.weeklyJ,
          bbi: snapshot.bbi,
          aboveBBIConsecutiveDaysCount: snapshot.aboveBBIConsecutiveDaysCount,
          belowBBIConsecutiveDaysCount: snapshot.belowBBIConsecutiveDaysCount,
          volumeRatio: snapshot.volumeRatio,
        };

        const evaluation = evaluateSnapshot(baseSnapshot, rule);
        if (!evaluation.matched) {
          return null;
        }

        return {
          ...baseSnapshot,
          reasons: evaluation.reasons,
        };
      })
      .filter((item): item is ScreeningSnapshotView => item !== null);

    return {
      rule,
      run: {
        id: latestRun.id,
        tradeDate: latestRun.tradeDate.toISOString(),
        status: latestRun.status,
        snapshotCount: latestRun.snapshotCount,
        totalSymbols: latestRun.totalSymbols,
        finishedAt: latestRun.finishedAt?.toISOString() ?? null,
      },
      matchedStocks,
    };
  }

  async runDailyAShareScreening(): Promise<{ runId: string; reused: boolean }> {
    const tradeDate = getTradeDate();

    const existingRun = await prisma.marketScreeningRun.findUnique({
      where: {
        market_tradeDate: {
          market: A_SHARE_MARKET,
          tradeDate,
        },
      },
    });

    if (existingRun?.status === COMPLETED_STATUS) {
      return { runId: existingRun.id, reused: true };
    }

    const run = existingRun
      ? await prisma.marketScreeningRun.update({
          where: { id: existingRun.id },
          data: {
            status: RUNNING_STATUS,
            errorMessage: null,
            startedAt: new Date(),
            finishedAt: null,
            totalSymbols: 0,
            snapshotCount: 0,
          },
        })
      : await prisma.marketScreeningRun.create({
          data: {
            market: A_SHARE_MARKET,
            tradeDate,
            status: RUNNING_STATUS,
          },
        });

    try {
      await prisma.marketScreeningSnapshot.deleteMany({ where: { runId: run.id } });
      await prisma.marketScreeningResult.deleteMany({ where: { runId: run.id } });

      const provider = await getQuoteProvider('akshare');
      if (!provider.getMarketStocks) {
        throw new Error('当前数据源不支持获取 A 股股票池');
      }

      const marketStocks = await provider.getMarketStocks(A_SHARE_MARKET);
      const snapshots = await this.collectSnapshots(marketStocks);

      await createSnapshotsInBatches(snapshots.map((snapshot) => ({ ...snapshot, runId: run.id })));

      await prisma.marketScreeningRun.update({
        where: { id: run.id },
        data: {
          status: COMPLETED_STATUS,
          totalSymbols: marketStocks.length,
          snapshotCount: snapshots.length,
          finishedAt: new Date(),
        },
      });

      await this.createUserResultsAndNotify(run.id, tradeDate);
      return { runId: run.id, reused: false };
    } catch (error) {
      await prisma.marketScreeningRun.update({
        where: { id: run.id },
        data: {
          status: FAILED_STATUS,
          errorMessage: error instanceof Error ? error.message : '未知错误',
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async collectSnapshots(marketStocks: MarketStockInfo[]): Promise<SnapshotCreateInput[]> {
    const provider = await getQuoteProvider('akshare');
    const snapshots: SnapshotCreateInput[] = [];

    for (let index = 0; index < marketStocks.length; index += SCAN_BATCH_SIZE) {
      const batch = marketStocks.slice(index, index + SCAN_BATCH_SIZE);
      const batchSnapshots = await Promise.all(
        batch.map(async (stock) => this.collectSingleSnapshot(stock, provider)),
      );

      batchSnapshots.forEach((snapshot) => {
        if (snapshot) {
          snapshots.push(snapshot);
        }
      });
    }

    return snapshots;
  }

  private async collectSingleSnapshot(
    stock: MarketStockInfo,
    provider: Awaited<ReturnType<typeof getQuoteProvider>>,
  ): Promise<SnapshotCreateInput | null> {
    try {
      const [quote, dailyKdj, weeklyKdj, bbiData, klineData] = await Promise.all([
        provider.getQuote(stock.symbol),
        provider.calculateKDJ(stock.symbol, KLINE_PERIOD.DAY),
        provider.calculateKDJ(stock.symbol, KLINE_PERIOD.WEEK),
        provider.calculateBBI(stock.symbol),
        provider.getKLineData(stock.symbol, 10, KLINE_PERIOD.DAY),
      ]);

      if (!quote || !dailyKdj.length || !weeklyKdj.length || !bbiData || klineData.length < 6) {
        return null;
      }

      const latestDaily = dailyKdj[dailyKdj.length - 1];
      const latestWeekly = weeklyKdj[weeklyKdj.length - 1];

      return {
        runId: '',
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: roundNumber(quote.price),
        changePercent: roundNumber(quote.changeRate),
        volume: roundNumber(quote.volume),
        dailyK: roundNumber(latestDaily.k),
        dailyD: roundNumber(latestDaily.d),
        dailyJ: roundNumber(latestDaily.j),
        weeklyJ: roundNumber(latestWeekly.j),
        bbi: roundNumber(bbiData.bbi),
        aboveBBIConsecutiveDaysCount: bbiData.aboveBBIConsecutiveDaysCount,
        belowBBIConsecutiveDaysCount: bbiData.belowBBIConsecutiveDaysCount,
        volumeRatio: calculateVolumeRatio(klineData),
      };
    } catch (error) {
      console.error(`[ClosingScreener] 处理 ${stock.symbol} 失败:`, error);
      return null;
    }
  }

  private async createUserResultsAndNotify(runId: string, tradeDate: Date): Promise<void> {
    const [users, snapshots] = await Promise.all([
      prisma.user.findMany({
        where: {
          closingScreenerEnabled: true,
        },
        select: {
          id: true,
          pushDeerKey: true,
          closingScreenerEnabled: true,
          closingScreenerNotifyEnabled: true,
          closingScreenerMaxDailyJ: true,
          closingScreenerMaxWeeklyJ: true,
          closingScreenerRequirePriceAboveBBI: true,
          closingScreenerMinAboveBBIDays: true,
          closingScreenerMinVolumeRatio: true,
          closingScreenerLastNotifiedAt: true,
        },
      }),
      prisma.marketScreeningSnapshot.findMany({
        where: { runId },
        orderBy: [{ dailyJ: 'asc' }, { volumeRatio: 'desc' }],
      }),
    ]);

    const resultRows: Array<{
      runId: string;
      snapshotId: string;
      userId: string;
      symbol: string;
      name: string;
      reasons: string;
    }> = [];

    for (const user of users) {
      const rule = mapRuleFromUser(user);
      const matchedStocks = snapshots
        .map((snapshot) => {
          const baseSnapshot: Omit<ScreeningSnapshotView, 'reasons'> = {
            symbol: snapshot.symbol,
            name: snapshot.name,
            market: snapshot.market,
            price: snapshot.price,
            changePercent: snapshot.changePercent,
            volume: snapshot.volume,
            dailyK: snapshot.dailyK,
            dailyD: snapshot.dailyD,
            dailyJ: snapshot.dailyJ,
            weeklyJ: snapshot.weeklyJ,
            bbi: snapshot.bbi,
            aboveBBIConsecutiveDaysCount: snapshot.aboveBBIConsecutiveDaysCount,
            belowBBIConsecutiveDaysCount: snapshot.belowBBIConsecutiveDaysCount,
            volumeRatio: snapshot.volumeRatio,
          };

          const evaluation = evaluateSnapshot(baseSnapshot, rule);
          if (!evaluation.matched) {
            return null;
          }

          return {
            snapshotId: snapshot.id,
            reasons: evaluation.reasons,
            stock: baseSnapshot,
          };
        })
        .filter(
          (item): item is { snapshotId: string; reasons: string[]; stock: Omit<ScreeningSnapshotView, 'reasons'> } =>
            item !== null,
        );

      matchedStocks.forEach((item) => {
        resultRows.push({
          runId,
          snapshotId: item.snapshotId,
          userId: user.id,
          symbol: item.stock.symbol,
          name: item.stock.name,
          reasons: item.reasons.join(' | '),
        });
      });

      if (
        !user.closingScreenerNotifyEnabled ||
        !user.pushDeerKey ||
        matchedStocks.length === 0 ||
        (user.closingScreenerLastNotifiedAt && isSameDate(getTradeDate(user.closingScreenerLastNotifiedAt), tradeDate))
      ) {
        continue;
      }

      try {
        await sendClosingScreenerListByPushDeer(
          matchedStocks.slice(0, 20).map((item) => ({
            symbol: item.stock.symbol,
            name: item.stock.name,
            price: item.stock.price,
            dailyJ: item.stock.dailyJ,
            weeklyJ: item.stock.weeklyJ,
            bbi: item.stock.bbi,
            volumeRatio: item.stock.volumeRatio,
          })),
          user.pushDeerKey,
        );

        await prisma.user.update({
          where: { id: user.id },
          data: { closingScreenerLastNotifiedAt: new Date() },
        });
      } catch (error) {
        console.error(`[ClosingScreener] 推送用户 ${user.id} 失败:`, error);
      }
    }

    if (resultRows.length === 0) {
      return;
    }

    for (let index = 0; index < resultRows.length; index += SNAPSHOT_BATCH_SIZE) {
      await prisma.marketScreeningResult.createMany({
        data: resultRows.slice(index, index + SNAPSHOT_BATCH_SIZE),
      });
    }
  }
}

export const closingScreenerService = new ClosingScreenerService();
