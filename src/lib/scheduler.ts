/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-15 13:47:23
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-15 13:47:45
 * @FilePath: /B1Notice/b1notice/src/lib/scheduler.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { prisma } from './prisma';
import { getLongBridgeClient, KLINE_PERIOD } from '../server/longbridge/client';
import schedule from 'node-schedule';
import { LongBridgeClient } from '../server/longbridge/client';
import { sendCanBuyMessageByPushDeer } from '@/server/pushdeer';
import { KDJ_TYPE } from '@/utils';

interface Monitor {
  id: string;
  stockId: string;
  isActive: boolean;
  condition: 'ABOVE' | 'BELOW';
  type: 'PRICE' | 'VOLUME' | 'CHANGE_PERCENT' | 'KDJ_J' | 'WEEKLY_KDJ_J';
  value: number;
  stock: {
    symbol: string;
    name: string;
  };
}

interface IndicatorData {
  j?: number; // for KDJ_J
  close?: number; // for PRICE
  volume?: number; // for VOLUME
  changePercent?: number; // for CHANGE_PERCENT
}

// 添加日志工具
const logger = {
  info: (message: string, meta?: any) => {
    console.info(`[Monitor] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(
      `[Monitor Error] ${message}:`,
      error instanceof Error ? error.message : error,
    );
  },
};

export class MonitorScheduler {
  private longBridgeClient: LongBridgeClient;

  constructor() {
    this.longBridgeClient = getLongBridgeClient();
    this.fetchAndStoreStockData(['SH', 'SZ', 'HK', 'US']);
  }

  private async checkPrice(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: {
          stock: { symbol },
        },
        select: { price: true },
      });
      return quote?.price ?? null;
    } catch (error) {
      logger.error(`从数据库查询${symbol}价格失败`, error);
      return null;
    }
  }

  private async checkVolume(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: {
          stock: { symbol },
        },
        select: { volume: true },
      });
      return quote?.volume ?? null;
    } catch (error) {
      logger.error(`从数据库查询${symbol}成交量失败`, error);
      return null;
    }
  }

  private async checkChangePercent(symbol: string): Promise<number | null> {
    try {
      const quote = await prisma.quote.findFirst({
        where: {
          stock: { symbol },
        },
        select: { changePercent: true },
      });
      return quote?.changePercent ?? null;
    } catch (error) {
      logger.error(`从数据库查询${symbol}涨跌幅失败`, error);
      return null;
    }
  }

  private async checkKDJJ(
    symbol: string,
    isWeekly: boolean = false,
  ): Promise<number | null> {
    try {
      const kdjRecord = await prisma.kdj.findFirst({
        where: {
          stock: { symbol },
          type: isWeekly ? KDJ_TYPE.WEEKLY : KDJ_TYPE.DAILY,
        },
        select: { j: true },
      });

      if (!kdjRecord) {
        logger.error(`找不到${symbol}${isWeekly ? '周线' : '日线'}KDJ记录`);
        return null;
      }
      return kdjRecord.j;
    } catch (error) {
      logger.error(
        `查询${symbol}${isWeekly ? '周线' : '日线'}KDJ数据失败:`,
        error,
      );
      return null;
    }
  }

  private async getCurrentValue(monitor: Monitor): Promise<number | null> {
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
      default:
        return null;
    }
  }

  private checkCondition(
    currentValue: number,
    condition: Monitor['condition'],
    threshold: number,
  ): boolean {
    if (condition === 'ABOVE') {
      return currentValue > threshold;
    }
    return currentValue < threshold;
  }

  private async checkIndicator(monitor: Monitor) {
    try {
      logger.info(`检查指标`, {
        symbol: monitor.stock.symbol,
        type: monitor.type,
        condition: monitor.condition,
      });

      const currentValue = await this.getCurrentValue(monitor);
      if (currentValue === null) {
        logger.error(`获取当前值失败`, { symbol: monitor.stock.symbol });
        return;
      }

      if (this.checkCondition(currentValue, monitor.condition, monitor.value)) {
        await this.createNotification(monitor, currentValue);
      }

      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { updatedAt: new Date() },
      });
    } catch (error: unknown) {
      logger.error(`检查指标失败: ${monitor.stock.symbol}`, error);
      await this.recordError(monitor.id, error);
    }
  }

  private async recordError(monitorId: string, error: unknown) {
    try {
      await prisma.notification.create({
        data: {
          monitorId,
          message: `监控检查失败: ${
            error instanceof Error ? error.message : '未知错误'
          }`,
          status: 'FAILED',
        },
      });
    } catch (dbError) {
      logger.error('记录错误到数据库失败', dbError);
    }
  }

  private async createNotification(monitor: Monitor, value: number) {
    try {
      // 检查最后通知时间
      const monitorData = await prisma.monitor.findUnique({
        where: { id: monitor.id },
        select: { lastNotifiedAt: true },
      });

      const message = this.generateNotificationMessage(monitor, value);
      logger.info(`通知消息`, message);

      const now = new Date();
      if (monitorData?.lastNotifiedAt) {
        const lastNotified = new Date(monitorData.lastNotifiedAt);
        const hoursSinceLastNotification =
          (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

        // 如果距离上次通知不足1小时，则跳过
        if (hoursSinceLastNotification < 1) {
          console.log(
            `跳过通知: ${monitor.stock.symbol} 距离上次通知未满1小时`,
          );
          return;
        }
      }

      // TODO: 先直接发通知，不存队列了
      // await prisma.notification.create({
      //   data: {
      //     monitorId: monitor.id,
      //     message,
      //     status: 'PENDING',
      //   },
      // });

      // 更新最后通知时间
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { lastNotifiedAt: now },
      });

      await sendCanBuyMessageByPushDeer(
        monitor.stock.symbol,
        monitor.stock.name,
        value,
      );
    } catch (error) {
      console.error('创建通知失败:', error);
    }
  }

  private generateNotificationMessage(monitor: Monitor, value: number): string {
    const condition = monitor.condition === 'ABOVE' ? '高于' : '低于';
    const type = this.getIndicatorTypeLabel(monitor.type);

    return `${monitor.stock.name}(${
      monitor.stock.symbol
    }) 的${type}${condition}${monitor.value}，当前值为${value.toFixed(2)}`;
  }

  private getIndicatorTypeLabel(type: Monitor['type']): string {
    switch (type) {
      case 'PRICE':
        return '价格';
      case 'VOLUME':
        return '成交量';
      case 'CHANGE_PERCENT':
        return '涨跌幅';
      case 'KDJ_J':
        return 'KDJ指标(J值)';
      case 'WEEKLY_KDJ_J':
        return '周线KDJ指标(J值)';
      default:
        return type;
    }
  }

  private async calculateDailyKDJ(scope: string[] = []) {
    try {
      const activeMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          type: { in: ['KDJ_J', 'WEEKLY_KDJ_J'] },
          stock: { market: { in: scope } },
        },
        include: { stock: true },
      });

      if (!activeMonitors?.length) {
        logger.info('没有找到激活的 KDJ 监控配置', { scope });
        return;
      }

      logger.info(`开始处理 KDJ 监控配置`, {
        count: activeMonitors.length,
        scope,
      });

      for (const monitor of activeMonitors) {
        await this.processKDJMonitor(monitor);
      }
    } catch (error) {
      logger.error('执行每日KDJ计算任务失败', error);
      throw error;
    }
  }

  private async processKDJMonitor(monitor: any) {
    try {
      const isWeekly = monitor.type === 'WEEKLY_KDJ_J';

      // 如果是周线KDJ，只在周五计算
      if (isWeekly) {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 是周日，5 是周五
        if (dayOfWeek !== 5) {
          logger.info('非周五，跳过周线KDJ计算', {
            symbol: monitor.stock.symbol,
            dayOfWeek,
          });
          return;
        }
      }

      logger.info(`获取${isWeekly ? '周线' : '日线'} KDJ 数据`, {
        symbol: monitor.stock.symbol,
      });

      // 从数据库获取最新的 KDJ 数据
      const latestKDJ = await prisma.kdj.findFirst({
        where: {
          stockId: monitor.stockId,
          type: isWeekly ? KDJ_TYPE.WEEKLY : KDJ_TYPE.DAILY,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!latestKDJ) {
        logger.error(`数据库中未找到 KDJ 数据`, {
          symbol: monitor.stock.symbol,
          type: isWeekly ? 'WEEKLY' : 'DAILY',
        });
        return;
      }

      await this.processKDJResult(monitor, latestKDJ, isWeekly);
    } catch (error) {
      logger.error(`处理 KDJ 监控失败: ${monitor.stock.symbol}`, error);
    }
  }

  private validateKDJData(kdjData: any): boolean {
    return (
      typeof kdjData?.k === 'number' &&
      typeof kdjData?.d === 'number' &&
      typeof kdjData?.j === 'number'
    );
  }

  private async processKDJResult(
    monitor: any,
    latestKDJ: any,
    isWeekly: boolean,
  ) {
    try {
      if (!this.validateKDJData(latestKDJ)) {
        logger.error(`KDJ数据无效`, {
          symbol: monitor.stock.symbol,
          data: latestKDJ,
        });
        return;
      }

      // 检查是否满足监控条件
      const isTriggered =
        monitor.condition === 'ABOVE'
          ? latestKDJ.j > monitor.threshold
          : latestKDJ.j < monitor.threshold;

      if (isTriggered) {
        await this.createNotification(
          {
            id: monitor.id,
            stockId: monitor.stockId,
            isActive: monitor.isActive,
            condition: monitor.condition as Monitor['condition'],
            type: monitor.type as Monitor['type'],
            value: monitor.threshold,
            stock: {
              symbol: monitor.stock.symbol,
              name: monitor.stock.name,
            },
          },
          latestKDJ.j,
        );
      }

      logger.info(
        `成功处理 KDJ 数据: K=${latestKDJ.k}, D=${latestKDJ.d}, J=${latestKDJ.j}`,
        {
          symbol: monitor.stock.symbol,
        },
      );
    } catch (error) {
      logger.error(`处理 KDJ 结果失败: ${monitor.stock.symbol}`, error);
    }
  }

  private async fetchAndStoreStockData(markets: string[]) {
    try {
      // 获取所有需要监控的股票
      const stocks = await prisma.stock.findMany({
        where: {
          market: { in: markets },
        },
      });

      logger.info(`开始获取${markets.join(',')}市场的股票数据`, {
        stockCount: stocks.length,
      });

      for (const stock of stocks) {
        try {
          logger.info(`开始处理股票: ${stock.symbol}`, { stockId: stock.id });

          // 获取股票报价
          const quote = await this.longBridgeClient.getQuote(stock.symbol);
          if (!quote) {
            logger.error(`获取股票${stock.symbol}报价失败`);
            continue;
          }

          // 获取日线KDJ
          const dailyKdj = await this.longBridgeClient.calculateKDJ(
            stock.symbol,
            KLINE_PERIOD.DAY,
          );

          // 获取周线KDJ
          const weeklyKdj = await this.longBridgeClient.calculateKDJ(
            stock.symbol,
            KLINE_PERIOD.WEEK,
          );

          if (!dailyKdj.length || !weeklyKdj.length) {
            logger.error(`获取股票${stock.symbol}KDJ数据失败`);
            continue;
          }

          try {
            // 存储日线KDJ
            const existingDailyKdj = await prisma.kdj.findFirst({
              where: {
                stockId: stock.id,
                type: 'DAILY',
              },
              select: { id: true },
            });

            const latestDailyKdj = await prisma.kdj.upsert({
              where: {
                id: existingDailyKdj?.id ?? 'new',
              },
              update: {
                k: dailyKdj[dailyKdj.length - 1].k,
                d: dailyKdj[dailyKdj.length - 1].d,
                j: dailyKdj[dailyKdj.length - 1].j,
                date: new Date(),
              },
              create: {
                stockId: stock.id,
                k: dailyKdj[dailyKdj.length - 1].k,
                d: dailyKdj[dailyKdj.length - 1].d,
                j: dailyKdj[dailyKdj.length - 1].j,
                type: 'DAILY',
                date: new Date(),
              },
            });

            logger.info(`成功存储日线KDJ数据: ${stock.symbol}`, {
              kdjId: latestDailyKdj.id,
            });

            // 存储周线KDJ
            const existingWeeklyKdj = await prisma.kdj.findFirst({
              where: {
                stockId: stock.id,
                type: 'WEEKLY',
              },
              select: { id: true },
            });

            const latestWeeklyKdj = await prisma.kdj.upsert({
              where: {
                id: existingWeeklyKdj?.id ?? 'new',
              },
              update: {
                k: weeklyKdj[weeklyKdj.length - 1].k,
                d: weeklyKdj[weeklyKdj.length - 1].d,
                j: weeklyKdj[weeklyKdj.length - 1].j,
                date: new Date(),
              },
              create: {
                stockId: stock.id,
                k: weeklyKdj[weeklyKdj.length - 1].k,
                d: weeklyKdj[weeklyKdj.length - 1].d,
                j: weeklyKdj[weeklyKdj.length - 1].j,
                type: 'WEEKLY',
                date: new Date(),
              },
            });

            logger.info(`成功存储周线KDJ数据: ${stock.symbol}`, {
              kdjId: latestWeeklyKdj.id,
            });

            // 存储股票报价
            const existingQuote = await prisma.quote.findFirst({
              where: {
                stockId: stock.id,
              },
              select: { id: true },
            });

            await prisma.quote.upsert({
              where: {
                id: existingQuote?.id ?? 'new',
              },
              update: {
                price: quote.price,
                volume: quote.volume,
                changePercent: quote.changeRate,
                dailyKdjId: latestDailyKdj.id,
                weeklyKdjId: latestWeeklyKdj.id,
              },
              create: {
                stockId: stock.id,
                price: quote.price,
                volume: quote.volume,
                changePercent: quote.changeRate,
                dailyKdjId: latestDailyKdj.id,
                weeklyKdjId: latestWeeklyKdj.id,
              },
            });

            logger.info(`成功更新股票${stock.symbol}数据`);
          } catch (dbError) {
            logger.error(`数据库操作失败: ${stock.symbol}`, {
              error: dbError,
              stockId: stock.id,
              symbol: stock.symbol,
            });
          }
        } catch (error) {
          logger.error(`处理股票${stock.symbol}数据失败`, {
            error,
            stockId: stock.id,
            symbol: stock.symbol,
          });
        }

        // 添加延迟以避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error(`获取股票数据失败`, error);
    }
  }

  async startMonitoring() {
    // 每5分钟执行一次监控任务
    schedule.scheduleJob('*/2 * * * 1-5', async () => {
      // schedule.scheduleJob('*/2 * * * 1-5', async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeValue = hour * 100 + minute; // 例如 9:30 => 930
      console.log('当前时间：', timeValue);
      // A股市场监控 (9:30-11:30, 13:00-15:00)
      if (
        (timeValue >= 930 && timeValue <= 1130) ||
        (timeValue >= 1300 && timeValue <= 1500)
      ) {
        console.log('执行 A 股市场监控...');
        await this.fetchAndStoreStockData(['SH', 'SZ']);
        await this.monitorMarket(['SH', 'SZ']);
      }

      // A股收盘前计算 KDJ (14:50-14:55)
      if (timeValue >= 1450 && timeValue <= 1500) {
        console.log('开始执行 A 股每日 KDJ 计算任务');
        try {
          await this.calculateDailyKDJ(['SH', 'SZ']);
        } catch (error) {
          console.error('A股 KDJ 计算任务执行失败:', error);
        }
      }

      // 港股市场监控 (9:30-12:00, 13:00-16:00)
      if (
        (timeValue >= 930 && timeValue <= 1200) ||
        (timeValue >= 1300 && timeValue <= 1600)
      ) {
        console.log('执行港股市场监控...');
        await this.fetchAndStoreStockData(['HK']);
        await this.monitorMarket(['HK']);
      }
      // 港股收盘前计算 KDJ (15:50-15:55)
      if (timeValue >= 1550 && timeValue <= 1600) {
        console.log('开始执行港股每日 KDJ 计算任务');
        try {
          await this.calculateDailyKDJ(['HK']);
        } catch (error) {
          console.error('港股 KDJ 计算任务执行失败:', error);
        }
      }

      // 美股市场监控 (21:30-04:00)
      if (timeValue >= 2130 || timeValue <= 400) {
        console.log('执行美股市场监控...');
        await this.fetchAndStoreStockData(['US']);
        await this.monitorMarket(['US']);
      }
    });
  }

  private async monitorMarket(markets: string[]) {
    try {
      logger.info(`开始执行市场监控`, { markets });

      // 获取常规监控配置（非KDJ类型）
      const regularMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          type: { not: 'KDJ_J' },
          stock: { market: { in: markets } },
        },
        include: { stock: true },
      });

      // 获取KDJ类型监控配置
      const kdjMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          type: 'KDJ_J',
          stock: { market: { in: markets } },
        },
        include: { stock: true },
      });

      // 转换类型
      const monitorsToCheck: Monitor[] = [
        ...regularMonitors.map(this.mapToMonitor),
        ...(this.shouldCheckKDJ(markets)
          ? kdjMonitors.map(this.mapToMonitor)
          : []),
      ];

      if (monitorsToCheck.length === 0) {
        logger.info('没有需要执行的监控任务', { markets });
        return;
      }

      logger.info(`找到${monitorsToCheck.length}个监控任务`, {
        markets,
        regular: regularMonitors.length,
        kdj: kdjMonitors.length,
      });

      // 并行执行监控检查
      await Promise.all(
        monitorsToCheck.map((monitor) =>
          this.checkIndicator(monitor).catch((error) =>
            logger.error(`监控任务执行异常: ${monitor.stock.symbol}`, error),
          ),
        ),
      );
    } catch (error) {
      logger.error(`市场监控任务执行失败`, error);
    }
  }

  private shouldCheckKDJ(markets: string[]): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // A股市场检查时间（14:50, 14:55）
    if (markets.some((m) => ['SH', 'SZ'].includes(m))) {
      return hour === 14 && (minute === 50 || minute === 55);
    }

    // 港股市场检查时间（15:50, 15:55）
    if (markets.includes('HK')) {
      return hour === 15 && (minute === 50 || minute === 55);
    }

    return false;
  }

  private mapToMonitor(dbMonitor: any): Monitor {
    return {
      id: dbMonitor.id,
      stockId: dbMonitor.stockId,
      isActive: dbMonitor.isActive,
      condition: dbMonitor.condition as Monitor['condition'],
      type: dbMonitor.type as Monitor['type'],
      value: dbMonitor.threshold,
      stock: {
        symbol: dbMonitor.stock.symbol,
        name: dbMonitor.stock.name,
      },
    };
  }
}

export const createMonitorScheduler = () => {
  return new MonitorScheduler();
};
