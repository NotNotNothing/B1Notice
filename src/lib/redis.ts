import { Redis } from 'ioredis';

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    try {
      const redisUrl = process.env.REDIS_URL;
      // 优先使用 Redis URL
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              this.isConnected = false;
              return null; // 停止重试
            }
            return Math.min(times * 100, 3000);
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
        });
        this.client.on('connect', () => {
          this.isConnected = true;
          console.log('Redis connected successfully');
        });

        this.client.on('error', (err) => {
          console.warn('Redis connection error:', err);
          this.isConnected = false;
        });

        this.client.on('ready', () => {
          this.isConnected = true;
          console.log('Redis client ready');
        });

        this.client.on('end', () => {
          this.isConnected = false;
          console.log('Redis connection ended');
        });

        this.client.on('reconnecting', () => {
          console.log('Redis client reconnecting...');
        });
      }
    } catch (error) {
      console.warn('Redis initialization error:', error);
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
      console.warn('Redis get error:', error);
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
