import type { NotificationProvider, NotificationMessage, NotificationConfig, NotificationResult } from './types';
import { PushDeerProvider } from './providers/pushdeer';

export class NotificationCenter {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new PushDeerProvider());
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`[NotificationCenter] 注册通知提供者: ${provider.name}`);
  }

  async send(
    message: NotificationMessage,
    config: NotificationConfig,
    preferredProvider?: string
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider) {
        const success = await provider.send(message, config);
        results.push({
          success,
          provider: provider.name,
          error: success ? undefined : '发送失败',
        });
        return results;
      }
    }

    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.log(`[NotificationCenter] ${name} 不可用，跳过`);
          continue;
        }

        const success = await provider.send(message, config);
        results.push({
          success,
          provider: name,
          error: success ? undefined : '发送失败',
        });

        if (success) {
          break;
        }
      } catch (error) {
        console.error(`[NotificationCenter] ${name} 发送异常:`, error);
        results.push({
          success: false,
          provider: name,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }

  async sendToMultipleChannels(
    message: NotificationMessage,
    configs: Array<{ provider: string; config: NotificationConfig }>
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    await Promise.all(
      configs.map(async ({ provider: providerName, config }) => {
        const provider = this.providers.get(providerName);
        if (!provider) {
          results.push({
            success: false,
            provider: providerName,
            error: '未找到该通知提供者',
          });
          return;
        }

        const success = await provider.send(message, config);
        results.push({
          success,
          provider: providerName,
          error: success ? undefined : '发送失败',
        });
      })
    );

    return results;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const notificationCenter = new NotificationCenter();
