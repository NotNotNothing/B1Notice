import 'server-only';
import { prisma } from '@/lib/prisma';
import { sendCanBuyMessageByPushDeer, sendB1SignalListByPushDeer } from '@/server/pushdeer';

export interface NotificationPayload {
  monitorId: string;
  symbol: string;
  stockName: string;
  currentValue: number;
  condition: string;
  threshold: number;
}

export interface B1SignalPayload {
  symbol: string;
  name: string;
  price: number;
  j: number;
  whiteLine: number;
  yellowLine: number;
}

export class NotificationService {
  async shouldSendNotification(monitorId: string): Promise<boolean> {
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      select: { lastNotifiedAt: true, userId: true },
    });

    if (!monitor?.lastNotifiedAt) {
      return true;
    }

    const now = new Date();
    const lastNotified = new Date(monitor.lastNotifiedAt);
    const hoursSinceLastNotification =
      (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastNotification >= 1;
  }

  async getUserPushDeerKey(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushDeerKey: true },
    });

    return user?.pushDeerKey || null;
  }

  async sendMonitorNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const monitor = await prisma.monitor.findUnique({
        where: { id: payload.monitorId },
        select: { lastNotifiedAt: true, userId: true },
      });

      if (!monitor) {
        console.error(`[Notification] 找不到监控 ${payload.monitorId}`);
        return false;
      }

      if (!(await this.shouldSendNotification(payload.monitorId))) {
        console.log(
          `[Notification] 跳过通知: ${payload.symbol} 距离上次通知未满1小时`
        );
        return false;
      }

      const pushDeerKey = await this.getUserPushDeerKey(monitor.userId);
      if (!pushDeerKey) {
        console.log(`[Notification] 用户未配置 PushDeer Key，跳过推送`, {
          userId: monitor.userId,
          symbol: payload.symbol,
        });
        return false;
      }

      await prisma.monitor.update({
        where: { id: payload.monitorId },
        data: { lastNotifiedAt: new Date() },
      });

      await sendCanBuyMessageByPushDeer(
        payload.symbol,
        payload.stockName,
        payload.currentValue,
        pushDeerKey
      );

      return true;
    } catch (error) {
      console.error('[Notification] 发送通知失败:', error);
      return false;
    }
  }

  async sendB1SignalNotifications(
    stocks: B1SignalPayload[],
    jThreshold: number,
    userId: string
  ): Promise<boolean> {
    try {
      if (stocks.length === 0) {
        return false;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushDeerKey: true, b1LastNotifiedAt: true },
      });

      if (!user?.pushDeerKey) {
        console.log(`[Notification] 用户未配置 PushDeer Key，跳过 B1 通知`, { userId });
        return false;
      }

      const now = new Date();
      if (user.b1LastNotifiedAt) {
        const hoursSinceLastNotification =
          (now.getTime() - new Date(user.b1LastNotifiedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastNotification < 1) {
          return false;
        }
      }

      await sendB1SignalListByPushDeer(stocks, jThreshold, user.pushDeerKey);

      await prisma.user.update({
        where: { id: userId },
        data: { b1LastNotifiedAt: now },
      });

      return true;
    } catch (error) {
      console.error('[Notification] 发送 B1 通知失败:', error);
      return false;
    }
  }

  async recordError(monitorId: string, error: unknown): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          monitorId,
          message: `监控检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
          status: 'FAILED',
        },
      });
    } catch (dbError) {
      console.error('[Notification] 记录错误到数据库失败:', dbError);
    }
  }
}
