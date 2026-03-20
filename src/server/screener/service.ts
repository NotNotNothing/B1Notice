import 'server-only';

import { prisma } from '@/lib/prisma';
import { getQuoteProvider, KLINE_PERIOD } from '@/server/datasource';
import type { MarketStockInfo } from '@/server/datasource/types';
import { sendClosingScreenerListByPushDeer } from '@/server/pushdeer';
import type { TaskExecutionContext } from '@/server/tasks/types';
import type { Prisma } from '@prisma/client';
import { getBeijingDayStart } from '@/lib/time';
import { calculateBBISeries, calculateKDJSeries, checkBBIConsecutiveDays } from '@/utils/indicators';
import {
  evaluateTdxFormula,
  type FormulaSeriesContext,
  validateTdxFormula,
} from '@/server/screener/tdx-formula';

type UserClosingScreenerConfig = {
  closingScreenerEnabled: boolean;
  closingScreenerNotifyEnabled: boolean;
  closingScreenerMode: string;
  closingScreenerFormula: string | null;
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
  mode: 'BASIC' | 'FORMULA';
  formula: string;
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

type SnapshotEvaluationContext = SnapshotCreateInput & {
  formulaContext: FormulaSeriesContext;
};

const A_SHARE_MARKET = 'A';
const COMPLETED_STATUS = 'COMPLETED';
const RUNNING_STATUS = 'RUNNING';
const FAILED_STATUS = 'FAILED';
const SNAPSHOT_BATCH_SIZE = 200;
const SCAN_BATCH_SIZE = 8;
const DEFAULT_DEV_SCREENING_LIMIT = 20;

function getTradeDate(date = new Date()): Date {
  return getBeijingDayStart(date);
}

function isSameDate(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

function roundNumber(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeIndicatorKlines(
  klineData: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>,
) {
  return klineData.map((item) => ({
    timestamp: String(item.timestamp),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume,
  }));
}

function getClosingScreenerSymbolLimit(): number | null {
  const configured = process.env.CLOSING_SCREENER_MAX_SYMBOLS?.trim();

  if (!configured) {
    return process.env.NODE_ENV === 'development' ? DEFAULT_DEV_SCREENING_LIMIT : null;
  }

  const parsed = Number.parseInt(configured, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function mapRuleFromUser(user: UserClosingScreenerConfig): ClosingScreenerRule {
  return {
    enabled: user.closingScreenerEnabled,
    notifyEnabled: user.closingScreenerNotifyEnabled,
    mode: user.closingScreenerMode === 'FORMULA' ? 'FORMULA' : 'BASIC',
    formula: user.closingScreenerFormula?.trim() ?? '',
    maxDailyJ: user.closingScreenerMaxDailyJ,
    maxWeeklyJ: user.closingScreenerMaxWeeklyJ,
    requirePriceAboveBBI: user.closingScreenerRequirePriceAboveBBI,
    minAboveBBIDays: user.closingScreenerMinAboveBBIDays,
    minVolumeRatio: user.closingScreenerMinVolumeRatio,
  };
}

function hasActiveCriteria(rule: ClosingScreenerRule): boolean {
  if (rule.mode === 'FORMULA') {
    return rule.formula.trim().length > 0;
  }

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
  formulaContext?: FormulaSeriesContext,
): { matched: boolean; reasons: string[] } {
  if (!rule.enabled || !hasActiveCriteria(rule)) {
    return { matched: false, reasons: [] };
  }

  if (rule.mode === 'FORMULA') {
    if (!formulaContext) {
      return { matched: false, reasons: [] };
    }

    const evaluation = evaluateTdxFormula(rule.formula, formulaContext);
    return evaluation.matched
      ? { matched: true, reasons: [evaluation.reason] }
      : { matched: false, reasons: [] };
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
        closingScreenerMode: true,
        closingScreenerFormula: true,
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
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        closingScreenerMode: true,
        closingScreenerFormula: true,
      },
    });

    if (!currentUser) {
      throw new Error('用户不存在');
    }

    if (input.enabled !== undefined) {
      updateData.closingScreenerEnabled = input.enabled;
    }

    if (input.notifyEnabled !== undefined) {
      updateData.closingScreenerNotifyEnabled = input.notifyEnabled;
    }

    if (input.mode !== undefined) {
      updateData.closingScreenerMode = input.mode;
    }

    if (input.formula !== undefined) {
      updateData.closingScreenerFormula = input.formula.trim() || null;
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

    const nextMode = input.mode ?? (currentUser.closingScreenerMode === 'FORMULA' ? 'FORMULA' : 'BASIC');
    const nextFormula =
      input.formula !== undefined
        ? input.formula.trim()
        : currentUser.closingScreenerFormula?.trim() ?? '';
    if (nextMode === 'FORMULA' && !nextFormula) {
      throw new Error('通达信公式模式下必须填写公式');
    }

    if (nextFormula) {
      validateTdxFormula(nextFormula);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        closingScreenerEnabled: true,
        closingScreenerNotifyEnabled: true,
        closingScreenerMode: true,
        closingScreenerFormula: true,
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
          closingScreenerMode: true,
          closingScreenerFormula: true,
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
      }),
    ]);

    if (!user) {
      throw new Error('用户不存在');
    }

    const rule = mapRuleFromUser(user);

    if (!latestRun) {
      return { rule, run: null, matchedStocks: [] };
    }

    const resultRows = await prisma.marketScreeningResult.findMany({
      where: {
        runId: latestRun.id,
        userId,
      },
      include: {
        snapshot: true,
      },
    });

    const matchedStocks = resultRows
      .map((result) => ({
        symbol: result.snapshot.symbol,
        name: result.snapshot.name,
        market: result.snapshot.market,
        price: result.snapshot.price,
        changePercent: result.snapshot.changePercent,
        volume: result.snapshot.volume,
        dailyK: result.snapshot.dailyK,
        dailyD: result.snapshot.dailyD,
        dailyJ: result.snapshot.dailyJ,
        weeklyJ: result.snapshot.weeklyJ,
        bbi: result.snapshot.bbi,
        aboveBBIConsecutiveDaysCount: result.snapshot.aboveBBIConsecutiveDaysCount,
        belowBBIConsecutiveDaysCount: result.snapshot.belowBBIConsecutiveDaysCount,
        volumeRatio: result.snapshot.volumeRatio,
        reasons: result.reasons.split(' | ').filter(Boolean),
      }))
      .sort((left, right) => {
        if (left.dailyJ !== right.dailyJ) {
          return left.dailyJ - right.dailyJ;
        }
        return right.volumeRatio - left.volumeRatio;
      });

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

  async runDailyAShareScreening(options?: {
    force?: boolean;
    taskContext?: TaskExecutionContext;
  }): Promise<{ runId: string; reused: boolean }> {
    const tradeDate = getTradeDate();
    const force = options?.force ?? false;
    const taskContext = options?.taskContext;

    const existingRun = await prisma.marketScreeningRun.findUnique({
      where: {
        market_tradeDate: {
          market: A_SHARE_MARKET,
          tradeDate,
        },
      },
    });

    if (existingRun?.status === COMPLETED_STATUS && !force) {
      await taskContext?.setMetadata({
        market: A_SHARE_MARKET,
        marketScreeningRunId: existingRun.id,
        tradeDate: tradeDate.toISOString(),
        reused: true,
      });
      await taskContext?.updateProgress({
        current: existingRun.snapshotCount,
        total: existingRun.totalSymbols,
        label: 'A股收盘选股',
        summary: '今日收盘选股结果已存在，复用历史结果',
      });
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
      await taskContext?.setMetadata({
        market: A_SHARE_MARKET,
        marketScreeningRunId: run.id,
        tradeDate: tradeDate.toISOString(),
        reused: false,
      });
      await taskContext?.updateProgress({
        current: 0,
        total: 0,
        label: 'A股收盘选股',
        summary: '开始准备股票池与样本快照',
      });

      await prisma.marketScreeningSnapshot.deleteMany({ where: { runId: run.id } });
      await prisma.marketScreeningResult.deleteMany({ where: { runId: run.id } });

      const provider = await getQuoteProvider('akshare');
      if (!provider.getMarketStocks) {
        throw new Error('当前数据源不支持获取 A 股股票池');
      }

      const marketStocks = await this.limitMarketStocks(await provider.getMarketStocks(A_SHARE_MARKET));
      if (marketStocks.length === 0) {
        throw new Error('未获取到可用于收盘选股的 A 股股票池');
      }

      await taskContext?.updateProgress({
        current: 0,
        total: marketStocks.length,
        label: 'A股收盘选股',
        summary: `已获取股票池，共 ${marketStocks.length} 只股票`,
      });

      const snapshots = await this.collectSnapshots(marketStocks, taskContext);

      await createSnapshotsInBatches(
        snapshots.map((snapshotContext) => {
          const { formulaContext, ...snapshot } = snapshotContext;
          void formulaContext;

          return {
            ...snapshot,
            runId: run.id,
          };
        }),
      );

      await taskContext?.updateProgress({
        current: snapshots.length,
        total: marketStocks.length,
        label: 'A股收盘选股',
        summary: `已写入 ${snapshots.length} 条有效快照`,
      });

      await prisma.marketScreeningRun.update({
        where: { id: run.id },
        data: {
          status: COMPLETED_STATUS,
          totalSymbols: marketStocks.length,
          snapshotCount: snapshots.length,
          finishedAt: new Date(),
        },
      });

      await this.createUserResultsAndNotify(run.id, tradeDate, snapshots, taskContext);
      await taskContext?.setSummary(
        `收盘选股完成，共扫描 ${marketStocks.length} 只股票，生成 ${snapshots.length} 条有效样本`,
      );
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

  private async limitMarketStocks(marketStocks: MarketStockInfo[]): Promise<MarketStockInfo[]> {
    const symbolLimit = getClosingScreenerSymbolLimit();
    if (!symbolLimit || marketStocks.length <= symbolLimit) {
      return marketStocks;
    }

    const trackedStocks = await prisma.stock.findMany({
      where: {
        market: { in: ['SH', 'SZ'] },
      },
      select: {
        symbol: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const stockMap = new Map(marketStocks.map((stock) => [stock.symbol, stock] as const));
    const limitedStocks: MarketStockInfo[] = [];

    for (const trackedStock of trackedStocks) {
      const matched = stockMap.get(trackedStock.symbol);
      if (!matched) {
        continue;
      }

      limitedStocks.push(matched);
      stockMap.delete(trackedStock.symbol);

      if (limitedStocks.length >= symbolLimit) {
        break;
      }
    }

    if (limitedStocks.length < symbolLimit) {
      limitedStocks.push(...Array.from(stockMap.values()).slice(0, symbolLimit - limitedStocks.length));
    }

    console.warn(
      `[ClosingScreener] 当前环境限制扫描股票数量为 ${symbolLimit}，实际股票池 ${marketStocks.length}，本次执行 ${limitedStocks.length}`,
    );

    return limitedStocks;
  }

  private async collectSnapshots(
    marketStocks: MarketStockInfo[],
    taskContext?: TaskExecutionContext,
  ): Promise<SnapshotEvaluationContext[]> {
    const provider = await getQuoteProvider('akshare');
    const snapshots: SnapshotEvaluationContext[] = [];

    for (let index = 0; index < marketStocks.length; index += SCAN_BATCH_SIZE) {
      await taskContext?.throwIfStopRequested();
      const batch = marketStocks.slice(index, index + SCAN_BATCH_SIZE);
      const batchSnapshots = await Promise.all(
        batch.map(async (stock) => this.collectSingleSnapshot(stock, provider)),
      );

      batchSnapshots.forEach((snapshot) => {
        if (snapshot) {
          snapshots.push(snapshot);
        }
      });

      await taskContext?.updateProgress({
        current: Math.min(index + batch.length, marketStocks.length),
        total: marketStocks.length,
        label: 'A股收盘选股',
        summary: `已处理 ${Math.min(index + batch.length, marketStocks.length)}/${marketStocks.length} 只股票`,
      });
    }

    return snapshots;
  }

  private async collectSingleSnapshot(
    stock: MarketStockInfo,
    provider: Awaited<ReturnType<typeof getQuoteProvider>>,
  ): Promise<SnapshotEvaluationContext | null> {
    try {
      const [dailyKlineData, weeklyKlineData] = await Promise.all([
        provider.getKLineData(stock.symbol, 120, KLINE_PERIOD.DAY),
        provider.getKLineData(stock.symbol, 120, KLINE_PERIOD.WEEK),
      ]);

      if (dailyKlineData.length < 24 || weeklyKlineData.length < 9) {
        return null;
      }

      const indicatorDailyKlines = normalizeIndicatorKlines(dailyKlineData);
      const indicatorWeeklyKlines = normalizeIndicatorKlines(weeklyKlineData);
      const dailyKdj = calculateKDJSeries(indicatorDailyKlines);
      const weeklyKdj = calculateKDJSeries(indicatorWeeklyKlines);
      const bbiSeries = calculateBBISeries(indicatorDailyKlines);

      if (!dailyKdj.length || !weeklyKdj.length || !bbiSeries.length) {
        return null;
      }

      const latestDaily = dailyKdj[dailyKdj.length - 1];
      const latestWeekly = weeklyKdj[weeklyKdj.length - 1];
      const latestBar = dailyKlineData[dailyKlineData.length - 1];
      const previousBar = dailyKlineData[dailyKlineData.length - 2];
      const latestBbi = bbiSeries[bbiSeries.length - 1];

      if (!latestBar || !previousBar || latestBbi === null) {
        return null;
      }

      const bbiHistory = indicatorDailyKlines
        .map((item, index) => {
          const bbi = bbiSeries[index];
          if (bbi === null) {
            return null;
          }

          return {
            close: item.close,
            bbi,
            date: item.timestamp,
          };
        })
        .filter(
          (item): item is { close: number; bbi: number; date: string } => item !== null,
        );
      const bbiData = checkBBIConsecutiveDays(bbiHistory);
      const previousClose = previousBar.close;
      const changePercent = previousClose
        ? ((latestBar.close - previousClose) / previousClose) * 100
        : 0;
      const volumeRatio = calculateVolumeRatio(dailyKlineData);

      return {
        runId: '',
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: roundNumber(latestBar.close),
        changePercent: roundNumber(changePercent),
        volume: roundNumber(latestBar.volume),
        dailyK: roundNumber(latestDaily.k),
        dailyD: roundNumber(latestDaily.d),
        dailyJ: roundNumber(latestDaily.j),
        weeklyJ: roundNumber(latestWeekly.j),
        bbi: roundNumber(latestBbi),
        aboveBBIConsecutiveDaysCount: bbiData.aboveBBIConsecutiveDaysCount,
        belowBBIConsecutiveDaysCount: bbiData.belowBBIConsecutiveDaysCount,
        volumeRatio,
        formulaContext: {
          open: dailyKlineData.map((item) => roundNumber(item.open)),
          high: dailyKlineData.map((item) => roundNumber(item.high)),
          low: dailyKlineData.map((item) => roundNumber(item.low)),
          close: dailyKlineData.map((item) => roundNumber(item.close)),
          volume: dailyKlineData.map((item) => roundNumber(item.volume)),
          dailyK: dailyKdj.map((item) => roundNumber(item.k)),
          dailyD: dailyKdj.map((item) => roundNumber(item.d)),
          dailyJ: dailyKdj.map((item) => roundNumber(item.j)),
          bbi: bbiSeries,
          price: roundNumber(latestBar.close),
          changePercent: roundNumber(changePercent),
          volumeRatio,
          aboveBBIConsecutiveDaysCount: bbiData.aboveBBIConsecutiveDaysCount,
          belowBBIConsecutiveDaysCount: bbiData.belowBBIConsecutiveDaysCount,
          weeklyJ: roundNumber(latestWeekly.j),
        },
      };
    } catch (error) {
      console.error(`[ClosingScreener] 处理 ${stock.symbol} 失败:`, error);
      return null;
    }
  }

  private async createUserResultsAndNotify(
    runId: string,
    tradeDate: Date,
    snapshotContexts: SnapshotEvaluationContext[],
    taskContext?: TaskExecutionContext,
  ): Promise<void> {
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
          closingScreenerMode: true,
          closingScreenerFormula: true,
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

    const contextMap = new Map(
      snapshotContexts.map((snapshot) => [snapshot.symbol, snapshot.formulaContext] as const),
    );

    const resultRows: Array<{
      runId: string;
      snapshotId: string;
      userId: string;
      symbol: string;
      name: string;
      reasons: string;
    }> = [];

    for (const user of users) {
      await taskContext?.throwIfStopRequested();
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

          const evaluation = evaluateSnapshot(
            baseSnapshot,
            rule,
            contextMap.get(snapshot.symbol),
          );
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
      await taskContext?.throwIfStopRequested();
      await prisma.marketScreeningResult.createMany({
        data: resultRows.slice(index, index + SNAPSHOT_BATCH_SIZE),
      });
    }
  }

  async testFormulaWithWatchlist(
    userId: string,
    formula: string,
  ): Promise<{
    totalTested: number;
    matchedCount: number;
    matchedStocks: ScreeningSnapshotView[];
    errors: string[];
  }> {
    try {
      validateTdxFormula(formula);
    } catch (error) {
      throw new Error(`通达信公式验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    const watchlistStocks = await prisma.stock.findMany({
      where: { userId },
      select: {
        symbol: true,
        name: true,
        market: true,
      },
    });

    if (watchlistStocks.length === 0) {
      return {
        totalTested: 0,
        matchedCount: 0,
        matchedStocks: [],
        errors: ['您的自选股列表为空，请先添加股票到自选股'],
      };
    }

    const provider = await getQuoteProvider('akshare');
    const matchedStocks: ScreeningSnapshotView[] = [];
    const errors: string[] = [];

    for (const stock of watchlistStocks) {
      try {
        const snapshot = await this.collectSingleSnapshot(
          {
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market,
          },
          provider,
        );

        if (!snapshot) {
          errors.push(`${stock.symbol} (${stock.name}): 数据不足，无法计算指标`);
          continue;
        }

        const evaluation = evaluateTdxFormula(formula, snapshot.formulaContext);
        
        if (evaluation.matched) {
          matchedStocks.push({
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
            reasons: [evaluation.reason],
          });
        }
      } catch (error) {
        errors.push(
          `${stock.symbol} (${stock.name}): ${error instanceof Error ? error.message : '处理失败'}`,
        );
      }
    }

    return {
      totalTested: watchlistStocks.length,
      matchedCount: matchedStocks.length,
      matchedStocks: matchedStocks.sort((a, b) => a.dailyJ - b.dailyJ),
      errors,
    };
  }
}

export const closingScreenerService = new ClosingScreenerService();
