import schedule from 'node-schedule';
import { prisma } from './prisma';
import { getQuoteProvider } from '@/server/datasource';
import { MarketDataService } from '@/server/market-data/service';
import { MonitorEvaluator } from '@/server/monitor/service';
import { NotificationService } from '@/server/notification/service';
import { isProd } from './utils';
import { getBeijingTimeValue } from './time';

const logger = {
  info: (message: string, meta?: unknown) => {
    if (!isProd) {
      console.info(`[Scheduler] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(
      `[Scheduler Error] ${message}:`,
      error instanceof Error ? error.message : error,
    );
  },
};

export class MonitorScheduler {
  private marketDataService: MarketDataService;
  private monitorEvaluator: MonitorEvaluator;
  private notificationService: NotificationService;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.monitorEvaluator = new MonitorEvaluator();
    this.notificationService = new NotificationService();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const longbridgeProvider = await getQuoteProvider('longbridge');
      const akshareProvider = await getQuoteProvider('akshare');

      await this.marketDataService.initialize(longbridgeProvider, akshareProvider);
      logger.info('服务初始化完成');

      await this.fetchAndStoreStockData(['SH', 'SZ', 'HK', 'US']);
    } catch (error) {
      logger.error('初始化失败', error);
    }
  }

  private async fetchAndStoreStockData(markets: string[]): Promise<void> {
    try {
      await this.marketDataService.fetchMarketStocks(markets);
    } catch (error) {
      logger.error('获取股票数据失败', error);
    }
  }

  async startMonitoring(): Promise<void> {
    schedule.scheduleJob('*/5 * * * 1-5', async () => {
      const timeValue = getBeijingTimeValue();

      logger.info(`当前时间：${timeValue}`);

      try {
        const longbridgeProvider = await getQuoteProvider('longbridge');
        const akshareProvider = await getQuoteProvider('akshare');

        if (
          (timeValue >= 930 && timeValue <= 1130) ||
          (timeValue >= 1300 && timeValue <= 1500)
        ) {
          logger.info('执行 A 股市场监控...');
          await this.marketDataService.fetchMarketStocks(['SH', 'SZ']);
          await this.monitorMarket(['SH', 'SZ'], akshareProvider);
        }

        if (
          (timeValue >= 930 && timeValue <= 1200) ||
          (timeValue >= 1300 && timeValue <= 1600)
        ) {
          logger.info('执行港股市场监控...');
          await this.marketDataService.fetchMarketStocks(['HK']);
          await this.monitorMarket(['HK'], longbridgeProvider);
        }

        if (timeValue >= 2130 || timeValue <= 400) {
          logger.info('执行美股市场监控...');
          await this.marketDataService.fetchMarketStocks(['US']);
          await this.monitorMarket(['US'], longbridgeProvider);
        }
      } catch (error) {
        logger.error('市场监控执行失败', error);
      }
    });
  }

  private async monitorMarket(markets: string[], provider: unknown): Promise<void> {
    try {
      const results = await this.monitorEvaluator.checkMarketMonitors(
        markets,
        provider as any
      );

      for (const result of results) {
        if (result.triggered && result.currentValue !== undefined) {
          await this.notificationService.sendMonitorNotification({
            monitorId: result.monitorId,
            symbol: result.symbol,
            stockName: result.stockName,
            currentValue: result.currentValue,
            condition: 'ABOVE',
            threshold: 0,
          });
        } else if (result.error) {
          await this.notificationService.recordError(result.monitorId, result.error);
        }
      }

      await this.notifyB1Signals(markets);
    } catch (error) {
      logger.error(`市场监控任务执行失败`, error);
    }
  }

  private async notifyB1Signals(markets: string[]): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: {
          b1NotifyEnabled: true,
          stocks: { some: { market: { in: markets } } },
        },
        select: {
          id: true,
          pushDeerKey: true,
          buySignalJThreshold: true,
          b1LastNotifiedAt: true,
          stocks: {
            where: { market: { in: markets } },
            include: {
              quotes: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  dailyKdj: true,
                  zhixingTrend: true,
                },
              },
            },
          },
        },
      });

      if (!users.length) {
        return;
      }

      const now = new Date();

      for (const user of users) {
        if (!user.pushDeerKey) {
          continue;
        }

        if (user.b1LastNotifiedAt) {
          const hoursSinceLastNotification =
            (now.getTime() - new Date(user.b1LastNotifiedAt).getTime()) /
            (1000 * 60 * 60);
          if (hoursSinceLastNotification < 1) {
            continue;
          }
        }

        const matched = user.stocks.flatMap((stock) => {
          const quote = stock.quotes[0];
          const kdj = quote?.dailyKdj;
          const trend = quote?.zhixingTrend;

          if (!quote || !kdj || !trend) {
            return [];
          }

          const price = quote.price ?? 0;
          if (!Number.isFinite(price)) {
            return [];
          }

          const priceAboveYellow = price > trend.yellowLine;
          const whiteAboveYellow = trend.whiteLine > trend.yellowLine;
          const jBelowThreshold = kdj.j < user.buySignalJThreshold;

          if (priceAboveYellow && whiteAboveYellow && jBelowThreshold) {
            return [
              {
                symbol: stock.symbol,
                name: stock.name,
                price,
                j: kdj.j,
                whiteLine: trend.whiteLine,
                yellowLine: trend.yellowLine,
              },
            ];
          }

          return [];
        });

        if (matched.length > 0) {
          await this.notificationService.sendB1SignalNotifications(
            matched,
            user.buySignalJThreshold,
            user.id
          );
        }
      }
    } catch (error) {
      logger.error('执行 B1 通知失败', error);
    }
  }
}

export const createMonitorScheduler = () => {
  return new MonitorScheduler();
};
