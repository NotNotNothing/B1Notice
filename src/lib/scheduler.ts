/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-15 13:47:23
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-15 13:47:45
 * @FilePath: /B1Notice/b1notice/src/lib/scheduler.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { prisma } from './prisma';
import { createLongBridgeClient } from './longbridge';
import schedule from 'node-schedule';

export class MonitorScheduler {
  private readonly longBridgeClient: any;

  constructor(apiKey: string) {
    this.longBridgeClient = createLongBridgeClient(apiKey);
  }

  async checkIndicator(monitor: any) {
    try {
      const stock = await prisma.stock.findUnique({
        where: { id: monitor.stockId }
      });

      if (!stock) return;

      const indicators = await this.longBridgeClient.getIndicators(stock.symbol);
      const currentValue = this.evaluateFormula(monitor.indicator.formula, indicators);

      if (this.checkCondition(currentValue, monitor.condition, monitor.threshold)) {
        await this.createNotification(monitor, currentValue);
      }
    } catch (error) {
      console.error('Error checking indicator:', error);
    }
  }

  private evaluateFormula(formula: string, data: any) {
    // 这里需要根据实际的指标数据结构来实现公式计算
    return parseFloat(data[formula] || '0');
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater':
        return value > threshold;
      case 'less':
        return value < threshold;
      case 'equal':
        return value === threshold;
      default:
        return false;
    }
  }

  private async createNotification(monitor: any, value: number) {
    await prisma.notification.create({
      data: {
        monitorId: monitor.id,
        message: `${monitor.stock.symbol} ${monitor.indicator.name} is ${value}`,
        status: 'pending'
      }
    });
  }

  async startMonitoring() {
    // 每分钟检查一次活跃的监控规则
    schedule.scheduleJob('* * * * *', async () => {
      const activeMonitors = await prisma.monitor.findMany({
        where: { isActive: true },
        include: {
          stock: true,
          indicator: true
        }
      });

      for (const monitor of activeMonitors) {
        await this.checkIndicator(monitor);
      }
    });
  }
}

export const createMonitorScheduler = (apiKey: string) => {
  return new MonitorScheduler(apiKey);
};
