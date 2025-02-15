import { Redis } from 'ioredis';

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    try {
      this.client = new Redis({
        path: process.env.REDIS_PATH,
        db: 0,
        // retryStrategy: (times) => {
        //   if (times > 3) {
        //     this.isConnected = false;
        //     return null; // 停止重试
        //   }
        //   return Math.min(times * 100, 3000);
        // },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
      });
    } catch (error) {
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }
    try {
      await this.client.setex(key, seconds, value);
    } catch (error) {
      console.warn('Redis setex error:', error);
    }
  }
}

export default new RedisClient();
