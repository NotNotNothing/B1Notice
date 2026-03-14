import 'server-only';
import { prisma } from '@/lib/prisma';
import { KDJ_TYPE } from '@/utils';
import type { IQuoteProvider } from '@/server/datasource';

export interface MonitorCheckResult {
  monitorId: string;
  symbol: string;
  stockName: string;
  triggered: boolean;
  currentValue?: number;
  error?: string;
}

export class MonitorEvaluator {
  async checkPrice(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: { stock: { symbol } },
        select: { price: true },
      });
      return quote?.price ?? null;
    } catch (error) {
      console.error(`查询 ${symbol} 价格失败:`, error);
      return null;
    }
  }

  async checkVolume(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: { stock: { symbol } },
        select: { volume: true },
      });
      return quote?.volume ?? null;
    } catch (error) {
      console.error(`查询 ${symbol} 成交量失败:`, error);
      return null;
    }
  }

  async checkChangePercent(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: { stock: { symbol } },
        select: { changePercent: true },
      });
      return quote?.changePercent ?? null;
    } catch (error) {
      console.error(`查询 ${symbol} 涨跌幅失败:`, error);
      return null;
    }
  }

  async checkKDJJ(symbol: string, isWeekly: boolean = false): Promise<number | null> {
    try {
      const kdjRecord = await prisma.kdj.findFirst({
        where: {
          stock: { symbol },
          type: isWeekly ? KDJ_TYPE.WEEKLY : KDJ_TYPE.DAILY,
        },
        select: { j: true },
      });

      if (!kdjRecord) {
        console.error(`找不到 ${symbol} ${isWeekly ? '周线' : '日线'} KDJ 记录`);
        return null;
      }
      return kdjRecord.j;
    } catch (error) {
      console.error(`查询 ${symbol} KDJ 数据失败:`, error);
      return null;
    }
  }

  async checkBBIConsecutive(symbol: string, isAbove: boolean): Promise<number | null> {
    try {
      const bbiRecord = await prisma.bbi.findFirst({
        where: { stock: { symbol } },
        select: {
          aboveBBIConsecutiveDaysCount: true,
          belowBBIConsecutiveDaysCount: true,
        },
      });

      if (!bbiRecord) {
        console.error(`找不到 ${symbol} 的 BBI 记录`);
        return null;
      }

      return isAbove
        ? bbiRecord.aboveBBIConsecutiveDaysCount
        : bbiRecord.belowBBIConsecutiveDaysCount;
    } catch (error) {
      console.error(`查询 ${symbol} BBI 连续天数失败:`, error);
      return null;
    }
  }

  async checkSellSignal(symbol: string, provider: IQuoteProvider): Promise<number | null> {
    try {
      const result = await provider.checkSellSignal(symbol);
      return result?.hasSellSignal ? 1 : 0;
    } catch (error) {
      console.error(`检测 ${symbol} 卖出信号失败:`, error);
      return null;
    }
  }

  async getCurrentValue(
    monitor: { type: string; stockId: string; stock: { symbol: string } },
    provider?: IQuoteProvider
  ): Promise<number | null> {
    switch (monitor.type) {
      case 'PRICE':
        return this.checkPrice(monitor.stock.symbol);
      case 'VOLUME':
        return this.checkVolume(monitor.stock.symbol);
      case 'CHANGE_PERCENT':
        return this.checkChangePercent(monitor.stock.symbol);
      case 'KDJ_J':
        return this.checkKDJJ(monitor.stock.symbol, false);
      case 'WEEKLY_KDJ_J':
        return this.checkKDJJ(monitor.stock.symbol, true);
      case 'BBI_ABOVE_CONSECUTIVE':
        return this.checkBBIConsecutive(monitor.stock.symbol, true);
      case 'BBI_BELOW_CONSECUTIVE':
        return this.checkBBIConsecutive(monitor.stock.symbol, false);
      case 'SELL_SIGNAL':
        if (!provider) {
          const stock = await prisma.stock.findFirst({
            where: { id: monitor.stockId },
            select: { market: true },
          });
          throw new Error(`需要 provider 来检查 ${monitor.stock.symbol} 的卖出信号`);
        }
        return this.checkSellSignal(monitor.stock.symbol, provider);
      default:
        return null;
    }
  }

  checkCondition(currentValue: number, condition: string, threshold: number): boolean {
    if (condition === 'ABOVE') {
      return currentValue > threshold;
    }
    return currentValue < threshold;
  }

  async checkMonitor(
    monitor: {
      id: string;
      type: string;
      condition: string;
      threshold: number;
      stock: { symbol: string; name: string };
    },
    provider?: IQuoteProvider
  ): Promise<MonitorCheckResult> {
    try {
      const currentValue = await this.getCurrentValue(
        { type: monitor.type, stockId: '', stock: monitor.stock },
        provider
      );

      if (currentValue === null) {
        return {
          monitorId: monitor.id,
          symbol: monitor.stock.symbol,
          stockName: monitor.stock.name,
          triggered: false,
          error: '获取当前值失败',
        };
      }

      const triggered = this.checkCondition(
        currentValue,
        monitor.condition,
        monitor.threshold
      );

      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { updatedAt: new Date() },
      });

      return {
        monitorId: monitor.id,
        symbol: monitor.stock.symbol,
        stockName: monitor.stock.name,
        triggered,
        currentValue,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        monitorId: monitor.id,
        symbol: monitor.stock.symbol,
        stockName: monitor.stock.name,
        triggered: false,
        error: errorMessage,
      };
    }
  }

  async checkMarketMonitors(markets: string[], provider: IQuoteProvider): Promise<MonitorCheckResult[]> {
    const monitors = await prisma.monitor.findMany({
      where: {
        isActive: true,
        stock: { market: { in: markets } },
      },
      include: { stock: true },
    });

    if (monitors.length === 0) {
      console.log(`[Monitor] ${markets.join(',')} 市场没有需要执行的监控任务`);
      return [];
    }

    console.log(`[Monitor] 找到 ${monitors.length} 个监控任务`, { markets });

    const results: MonitorCheckResult[] = [];

    for (const monitor of monitors) {
      const result = await this.checkMonitor(monitor, provider);
      results.push(result);
    }

    return results;
  }
}
