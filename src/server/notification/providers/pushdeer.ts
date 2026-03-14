import axios from 'axios';
import type { NotificationProvider, NotificationMessage, NotificationConfig, NotificationResult } from '../types';

export class PushDeerProvider implements NotificationProvider {
  readonly name = 'pushdeer';
  private readonly baseUrl = 'http://api2.pushdeer.com';

  async send(message: NotificationMessage, config: NotificationConfig): Promise<boolean> {
    if (!config.pushDeerKey) {
      console.warn('[PushDeer] 未配置 pushDeerKey');
      return false;
    }

    try {
      await axios.post(`${this.baseUrl}/message/push`, {
        pushkey: config.pushDeerKey,
        text: message.title,
        type: message.type === 'html' ? 'text' : message.type || 'markdown',
        desp: message.body,
      });

      console.log('[PushDeer] 通知发送成功');
      return true;
    } catch (error) {
      console.error('[PushDeer] 通知发送失败:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(this.baseUrl, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export async function sendPushDeerNotification(
  title: string,
  body: string,
  pushDeerKey: string,
  type: 'text' | 'markdown' | 'html' = 'markdown'
): Promise<NotificationResult> {
  const provider = new PushDeerProvider();
  const config: NotificationConfig = { pushDeerKey };

  const success = await provider.send({ title, body, type }, config);
  return {
    success,
    provider: provider.name,
    error: success ? undefined : '发送失败',
  };
}
