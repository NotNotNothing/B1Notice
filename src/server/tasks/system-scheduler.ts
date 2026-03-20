import 'server-only';

import schedule from 'node-schedule';

import { getBeijingTimeValue } from '@/lib/time';

import { taskCenterService } from './service';

function shouldRunAfterRefresh(status: string): boolean {
  return status === 'COMPLETED';
}

export class TaskSystemScheduler {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    schedule.scheduleJob('*/5 * * * 1-5', async () => {
      try {
        const timeValue = getBeijingTimeValue();

        if (
          (timeValue >= 930 && timeValue <= 1130) ||
          (timeValue >= 1300 && timeValue <= 1500)
        ) {
          const refreshRun = await taskCenterService.triggerTaskByKey(
            'stock-refresh-a-share',
            {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时刷新 A 股行情',
              awaitCompletion: true,
            },
          );

          if (shouldRunAfterRefresh(refreshRun.status)) {
            await taskCenterService.triggerTaskByKey('monitor-check-a-share', {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时检查 A 股监控',
              awaitCompletion: true,
            });
          }
        }

        if (timeValue >= 1450 && timeValue <= 1500) {
          await taskCenterService.triggerTaskByKey('kdj-calc-a-share', {
            triggeredBy: 'SYSTEM',
            reason: '收盘前计算 A 股 KDJ',
            awaitCompletion: true,
          });
        }

        if (timeValue >= 1510 && timeValue <= 1600) {
          await taskCenterService.triggerTaskByKey('closing-screener-a-share', {
            triggeredBy: 'SYSTEM',
            reason: '收盘后执行 A 股选股',
            awaitCompletion: true,
          });
        }

        if (
          (timeValue >= 930 && timeValue <= 1200) ||
          (timeValue >= 1300 && timeValue <= 1600)
        ) {
          const refreshRun = await taskCenterService.triggerTaskByKey(
            'stock-refresh-hk',
            {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时刷新港股行情',
              awaitCompletion: true,
            },
          );

          if (shouldRunAfterRefresh(refreshRun.status)) {
            await taskCenterService.triggerTaskByKey('monitor-check-hk', {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时检查港股监控',
              awaitCompletion: true,
            });
          }
        }

        if (timeValue >= 1550 && timeValue <= 1600) {
          await taskCenterService.triggerTaskByKey('kdj-calc-hk', {
            triggeredBy: 'SYSTEM',
            reason: '收盘前计算港股 KDJ',
            awaitCompletion: true,
          });
        }

        if (timeValue >= 2130 || timeValue <= 400) {
          const refreshRun = await taskCenterService.triggerTaskByKey(
            'stock-refresh-us',
            {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时刷新美股行情',
              awaitCompletion: true,
            },
          );

          if (shouldRunAfterRefresh(refreshRun.status)) {
            await taskCenterService.triggerTaskByKey('monitor-check-us', {
              triggeredBy: 'SYSTEM',
              reason: '盘中定时检查美股监控',
              awaitCompletion: true,
            });
          }
        }
      } catch (error) {
        console.error('[TaskSystemScheduler] 执行定时任务失败:', error);
      }
    });

    this.started = true;
  }
}

export const taskSystemScheduler = new TaskSystemScheduler();
