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
    try {
      this.longBridgeClient = getLongBridgeClient();
      if (!this.longBridgeClient) {
        throw new Error('Failed to initialize LongBridge client');
      }
    } catch (error) {
      console.error('Error initializing LongBridge client:', error);
      throw error;
    }
  }

  async checkIndicator(monitor: Monitor) {
    try {
      const kdjData = await this.longBridgeClient.calculateKDJ(
        monitor.stock.symbol,
      );
      if (!kdjData.length) return;

      const latestKDJ = kdjData[kdjData.length - 1];
      const currentValue = this.getIndicatorValue(monitor.type, latestKDJ);

      if (this.checkCondition(currentValue, monitor.condition, monitor.value)) {
        await this.createNotification(monitor, currentValue);
      }
    } catch (error) {
      console.error('Error checking indicator:', error);
    }
  }

  private getIndicatorValue(
    type: Monitor['type'],
    data: IndicatorData,
  ): number {
    switch (type) {
      case 'KDJ_J':
        return data.j ?? 0;
      case 'PRICE':
        return data.close ?? 0;
      case 'VOLUME':
        return data.volume ?? 0;
      case 'CHANGE_PERCENT':
        return data.changePercent ?? 0;
      default:
        return 0;
    }
  }

  private checkCondition(
    value: number,
    condition: Monitor['condition'],
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'ABOVE':
        return value > threshold;
      case 'BELOW':
        return value < threshold;
      default:
        return false;
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
    // 每分钟检查一次活跃的监控规则
    // schedule.scheduleJob('* * * * *', async () => {
    //   const activeMonitors = await prisma.monitor.findMany({
    //     where: { isActive: true },
    //     include: {
    //       stock: true,
    //     },
    //   });

    //   // 映射数据库结果到 Monitor 类型
    //   const monitors: Monitor[] = activeMonitors.map((dbMonitor) => ({
    //     id: dbMonitor.id,
    //     stockId: dbMonitor.stockId,
    //     isActive: dbMonitor.isActive,
    //     condition: dbMonitor.condition as Monitor['condition'],
    //     type: dbMonitor.type as Monitor['type'],
    //     value: dbMonitor.threshold,
    //     stock: {
    //       symbol: dbMonitor.stock.symbol,
    //       name: dbMonitor.stock.name,
    //     },
    //   }));

    //   for (const monitor of monitors) {
    //     await this.checkIndicator(monitor);
    //   }
    // });

    // 添加每日KDJ计算任务 - 每天14:55执行
    // schedule.scheduleJob('47 00 * * *', async () => {
    schedule.scheduleJob('55 14 * * *', async () => {
      console.log('开始执行每日KDJ计算任务');
      await this.calculateDailyKDJ(['SH', 'SZ']);
    });
    // 添加每日KDJ计算任务 - 每天14:55执行
    schedule.scheduleJob('55 15 * * *', async () => {
      console.log('开始执行每日KDJ计算任务');
      await this.calculateDailyKDJ(['HK', 'US']);
    });
  }
}

export const createMonitorScheduler = () => {
  return new MonitorScheduler();
};
