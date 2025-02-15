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

export class MonitorScheduler {
  private readonly longBridgeClient: LongBridgeClient;

  constructor() {
    this.longBridgeClient = getLongBridgeClient();
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

  // @ts-ignore
  private getIndicatorValue(type: Monitor['type'], data: any): number {
    switch (type) {
      case 'KDJ_J':
        return data.j;
      case 'PRICE':
        return data.close;
      case 'VOLUME':
        return data.volume;
      case 'CHANGE_PERCENT':
        return data.changePercent;
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

  async startMonitoring() {
    // 每分钟检查一次活跃的监控规则
    schedule.scheduleJob('* * * * *', async () => {
      const activeMonitors = await prisma.monitor.findMany({
        where: { isActive: true },
        include: {
          stock: true,
        },
      });

      // 映射数据库结果到 Monitor 类型
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

      for (const monitor of monitors) {
        await this.checkIndicator(monitor);
      }
    });
  }
}

export const createMonitorScheduler = () => {
  return new MonitorScheduler();
};
