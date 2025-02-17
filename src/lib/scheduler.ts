/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-15 13:47:23
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-15 13:47:45
 * @FilePath: /B1Notice/b1notice/src/lib/scheduler.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { prisma } from './prisma';
import { getLongBridgeClient } from '../server/longbridge/client';
import schedule from 'node-schedule';
import { LongBridgeClient } from '../server/longbridge/client';
import { sendCanBuyMessageByPushDeer } from '@/server/pushdeer';
import { info } from 'console';

// K线周期定义
const KLINE_PERIOD = {
  DAY: 14,
  WEEK: 6,
} as const;

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
  error: (message: string, error: unknown) => {
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
  }

  private async checkPrice(symbol: string): Promise<number | null> {
    try {
      const quote = await this.longBridgeClient.getQuote(symbol);
      return quote?.price || null;
    } catch (error) {
      console.error(`获取${symbol}价格失败:`, error);
      return null;
    }
  }

  private async checkVolume(symbol: string): Promise<number | null> {
    try {
      const quote = await this.longBridgeClient.getQuote(symbol);
      return quote?.volume || null;
    } catch (error) {
      console.error(`获取${symbol}成交量失败:`, error);
      return null;
    }
  }

  private async checkChangePercent(symbol: string): Promise<number | null> {
    try {
      const quote = await this.longBridgeClient.getQuote(symbol);
      return quote?.changeRate || null;
    } catch (error) {
      console.error(`获取${symbol}涨跌幅失败:`, error);
      return null;
    }
  }

  private async checkKDJJ(
    symbol: string,
    isWeekly: boolean = false,
  ): Promise<number | null> {
    try {
      const kdjData = await this.longBridgeClient.calculateKDJ(
        symbol,
        9,
        isWeekly ? KLINE_PERIOD.WEEK : KLINE_PERIOD.DAY,
      );
      if (!kdjData.length) return null;
      return kdjData[kdjData.length - 1].j;
    } catch (error) {
      console.error(
        `获取${symbol}${isWeekly ? '周线' : '日线'}KDJ数据失败:`,
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
      logger.info(`计算${isWeekly ? '周线' : '日线'} KDJ 数据`, {
        symbol: monitor.stock.symbol,
      });

      if (!this.longBridgeClient) {
        this.longBridgeClient = getLongBridgeClient();
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const kdjData = await this.longBridgeClient.calculateKDJ(
        monitor.stock.symbol,
        9,
        isWeekly ? KLINE_PERIOD.WEEK : KLINE_PERIOD.DAY,
      );

      if (!this.validateKDJData(kdjData)) {
        logger.error(`KDJ数据无效`, {
          symbol: monitor.stock.symbol,
          data: kdjData,
        });
        return;
      }

      const latestKDJ = kdjData[kdjData.length - 1];
      await this.processKDJResult(monitor, latestKDJ);
    } catch (error) {
      logger.error(`处理 KDJ 监控失败: ${monitor.stock.symbol}`, error);
    }
  }

  private validateKDJData(kdjData: any[]): boolean {
    if (!Array.isArray(kdjData) || !kdjData.length) return false;

    const latest = kdjData[kdjData.length - 1];
    return (
      typeof latest?.k === 'number' &&
      typeof latest?.d === 'number' &&
      typeof latest?.j === 'number'
    );
  }

  private async processKDJResult(monitor: any, latestKDJ: any) {
    try {
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

      // 保存KDJ数据到数据库
      await prisma.kdj.create({
        data: {
          stockId: monitor.stockId,
          k: latestKDJ.k,
          d: latestKDJ.d,
          j: latestKDJ.j,
        },
      });

      logger.info(
        `成功计算并保存 KDJ 数据: K=${latestKDJ.k}, D=${latestKDJ.d}, J=${latestKDJ.j}`,
        {
          symbol: monitor.stock.symbol,
        },
      );
    } catch (error) {
      logger.error(`处理 KDJ 结果失败: ${monitor.stock.symbol}`, error);
    }
  }

  async startMonitoring() {
    // 每5分钟执行一次监控任务
    schedule.scheduleJob('*/5 9-15 * * 1-5', async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeValue = hour * 100 + minute; // 例如 9:30 => 930

      // A股市场监控 (9:30-11:30, 13:00-15:00)
      if (
        (timeValue >= 930 && timeValue <= 1130) ||
        (timeValue >= 1300 && timeValue <= 1500)
      ) {
        console.log('执行 A 股市场监控...');
        await this.monitorMarket(['SH', 'SZ']);
      }

      // 港股市场监控 (9:30-12:00, 13:00-16:00)
      if (
        (timeValue >= 930 && timeValue <= 1200) ||
        (timeValue >= 1300 && timeValue <= 1600)
      ) {
        console.log('执行港股市场监控...');
        await this.monitorMarket(['HK']);
      }
    });

    // schedule.scheduleJob('*/1 * * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });

    // A股 KDJ 计算任务
    schedule.scheduleJob('50,55 14 * * 1-5', async () => {
      console.log('开始执行 A 股每日 KDJ 计算任务');
      try {
        await this.calculateDailyKDJ(['SH', 'SZ']);
      } catch (error) {
        console.error('A股 KDJ 计算任务执行失败:', error);
      }
    });

    // 港股 KDJ 计算任务
    schedule.scheduleJob('50,55 15 * * 1-5', async () => {
      console.log('开始执行港股每日 KDJ 计算任务');
      try {
        await this.calculateDailyKDJ(['HK']);
      } catch (error) {
        console.error('港股 KDJ 计算任务执行失败:', error);
      }
    });
  }

  private async monitorMarket(markets: string[]) {
    try {
      const activeMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          stock: { market: { in: markets } },
        },
        include: { stock: true },
      });

      const monitors: Monitor[] = activeMonitors.map(this.mapToMonitor);

      // 过滤出非 KDJ 类型的监控
      const regularMonitors = monitors.filter((m) => m.type !== 'KDJ_J');

      // 对于 KDJ 类型的监控，只在特定时间执行
      const kdjMonitors = monitors.filter((m) => m.type === 'KDJ_J');
      if (kdjMonitors.length > 0) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // 检查是否在收盘前10分钟或5分钟
        const isCheckTime =
          (markets.includes('HK') &&
            hour === 15 &&
            (minute === 50 || minute === 55)) ||
          ((markets.includes('SH') || markets.includes('SZ')) &&
            hour === 14 &&
            (minute === 50 || minute === 55));

        if (!isCheckTime) {
          logger.info('跳过 KDJ 监控检查 - 不在指定时间', {
            currentTime: `${hour}:${minute}`,
            markets,
          });
          kdjMonitors.length = 0;
        }
      }

      // 合并需要执行的监控
      const monitorsToCheck = [...regularMonitors, ...kdjMonitors];

      await Promise.all(
        monitorsToCheck.map((monitor) => this.checkIndicator(monitor)),
      );
    } catch (error) {
      logger.error(`市场监控任务执行失败`, error);
    }
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
