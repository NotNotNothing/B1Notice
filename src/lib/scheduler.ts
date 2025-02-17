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

interface Monitor {
  id: string;
  stockId: string;
  isActive: boolean;
  condition: 'ABOVE' | 'BELOW';
  type: 'PRICE' | 'VOLUME' | 'CHANGE_PERCENT' | 'KDJ_J';
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

  private async checkKDJJ(symbol: string): Promise<number | null> {
    try {
      const kdjData = await this.longBridgeClient.calculateKDJ(symbol);
      if (!kdjData.length) return null;
      return kdjData[kdjData.length - 1].j;
    } catch (error) {
      console.error(`获取${symbol}KDJ数据失败:`, error);
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
        return this.checkKDJJ(monitor.stock.symbol);
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

  async checkIndicator(monitor: Monitor) {
    try {
      const currentValue = await this.getCurrentValue(monitor);
      if (currentValue === null) return;

      if (this.checkCondition(currentValue, monitor.condition, monitor.value)) {
        await this.createNotification(monitor, currentValue);
      }

      // 保存监控记录
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      console.error('检查指标失败:', error);
      // 记录错误到数据库
      await prisma.notification.create({
        data: {
          monitorId: monitor.id,
          message: `监控检查失败: ${
            error instanceof Error ? error.message : '未知错误'
          }`,
          status: 'FAILED',
        },
      });
    }
  }

  private async createNotification(monitor: Monitor, value: number) {
    const message = this.generateNotificationMessage(monitor, value);

    await prisma.notification.create({
      data: {
        monitorId: monitor.id,
        message,
        status: 'PENDING',
      },
    });
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
      default:
        return type;
    }
  }

  private async calculateDailyKDJ(scope: string[] = []) {
    try {
      // 获取所有股票
      const stocks = await prisma.stock.findMany({
        where: {
          market: {
            in: scope,
          },
        },
      });
      console.log(`开始处理${stocks.length}支股票的KDJ数据`);

      if (!stocks || stocks.length === 0) {
        console.error('没有找到任何股票数据');
        return;
      }

      for (const stock of stocks) {
        try {
          console.log(`开始计算 ${stock.symbol} 的KDJ数据`);

          // 确保 longBridgeClient 已正确初始化
          if (!this.longBridgeClient) {
            console.error(
              'LongBridge client not initialized, reinitializing...',
            );
            this.longBridgeClient = getLongBridgeClient();
            if (!this.longBridgeClient) {
              throw new Error('Failed to reinitialize LongBridge client');
            }
          }

          // 添加延迟以避免API限制
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const kdjData = await this.longBridgeClient.calculateKDJ(
            stock.symbol,
          );

          if (!kdjData || !Array.isArray(kdjData) || kdjData.length === 0) {
            console.error(`${stock.symbol} 的KDJ数据计算结果为空`);
            continue;
          }

          const latestKDJ = kdjData[kdjData.length - 1];

          if (
            !latestKDJ ||
            typeof latestKDJ.k !== 'number' ||
            typeof latestKDJ.d !== 'number' ||
            typeof latestKDJ.j !== 'number'
          ) {
            console.error(`${stock.symbol} 的KDJ数据格式不正确:`, latestKDJ);
            continue;
          }

          if (latestKDJ.j < 0) {
            await sendCanBuyMessageByPushDeer(
              stock.symbol,
              stock.name,
              latestKDJ.j,
            );
          }

          // 保存KDJ数据到数据库
          await prisma.kdj.create({
            data: {
              stockId: stock.id,
              k: latestKDJ.k,
              d: latestKDJ.d,
              j: latestKDJ.j,
            },
          });

          console.log(
            `成功计算并保存 ${stock.symbol} 的KDJ数据: K=${latestKDJ.k}, D=${latestKDJ.d}, J=${latestKDJ.j}`,
          );
        } catch (error) {
          console.error(`计算 ${stock.symbol} 的KDJ数据失败:`, error);
          // 继续处理下一支股票
          continue;
        }
      }
    } catch (error) {
      console.error('执行每日KDJ计算任务失败:', error);
      throw error;
    }
  }

  async startMonitoring() {
    // // A股上午盘监控（9:30-11:30）/ 每30分钟
    // schedule.scheduleJob('30-59/30 9,10 * * 1-5', async () => {
    //   await this.monitorMarket(['SH', 'SZ']);
    // });
    // schedule.scheduleJob('*/30 10 * * 1-5', async () => {
    //   await this.monitorMarket(['SH', 'SZ']);
    // });
    // schedule.scheduleJob('0-30 11 * * 1-5', async () => {
    //   await this.monitorMarket(['SH', 'SZ']);
    // });

    // // A股下午盘监控（13:00-15:00）
    // schedule.scheduleJob('*/30 13,14 * * 1-5', async () => {
    //   await this.monitorMarket(['SH', 'SZ']);
    // });
    // schedule.scheduleJob('0-0 15 * * 1-5', async () => {
    //   await this.monitorMarket(['SH', 'SZ']);
    // });

    // // 港股上午盘监控（9:30-12:00）
    // schedule.scheduleJob('30-59/30 9,10,11 * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });
    // schedule.scheduleJob('*/30 10,11 * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });
    // schedule.scheduleJob('0-0 12 * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });

    // // 港股下午盘监控（13:00-16:00）
    // schedule.scheduleJob('*/30 13,14,15 * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });
    // schedule.scheduleJob('0-0/30 16 * * 1-5', async () => {
    //   await this.monitorMarket(['HK']);
    // });

    // 每天凌晨2点清理7天前的通知
    schedule.scheduleJob('0 2 * * *', async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        await prisma.notification.deleteMany({
          where: {
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        });

        console.log('已清理7天前的通知');
      } catch (error) {
        console.error('清理通知失败:', error);
      }
    });

    // A股 KDJ 计算任务
    schedule.scheduleJob('55 14 * * 1-5', async () => {
      console.log('开始执行 A 股每日 KDJ 计算任务');
      try {
        await this.calculateDailyKDJ(['SH', 'SZ']);
      } catch (error) {
        console.error('A股 KDJ 计算任务执行失败:', error);
      }
    });

    // 港股 KDJ 计算任务
    schedule.scheduleJob('55 14 * * 1-5', async () => {
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
          stock: {
            market: {
              in: markets,
            },
          },
        },
        include: {
          stock: true,
        },
      });

      const monitors: Monitor[] = activeMonitors.map((dbMonitor) => ({
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
      }));

      await Promise.all(
        monitors.map((monitor) => this.checkIndicator(monitor)),
      );
    } catch (error) {
      console.error(
        `监控任务执行失败 (markets: ${markets.join(', ')}):`,
        error,
      );
    }
  }
}

export const createMonitorScheduler = () => {
  return new MonitorScheduler();
};
