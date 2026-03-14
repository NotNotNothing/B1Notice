import 'server-only';
import { prisma } from '@/lib/prisma';
import type { IQuoteProvider, KLINE_PERIOD } from '@/server/datasource';
import { fetchAndStoreStockData } from '../stock/service';

export interface MarketDataFetchResult {
  symbol: string;
  success: boolean;
  error?: string;
}

export class MarketDataService {
  private longbridgeProvider: IQuoteProvider | null = null;
  private akshareProvider: IQuoteProvider | null = null;

  async initialize(longbridgeProvider: IQuoteProvider, akshareProvider: IQuoteProvider): Promise<void> {
    this.longbridgeProvider = longbridgeProvider;
    this.akshareProvider = akshareProvider;
  }

  private getProviderForMarket(market: string): IQuoteProvider {
    if (market === 'SH' || market === 'SZ') {
      if (!this.akshareProvider) {
        throw new Error('AKShare 数据源未初始化');
      }
      return this.akshareProvider;
    }

    if (!this.longbridgeProvider) {
      throw new Error('Longbridge 数据源未初始化');
    }
    return this.longbridgeProvider;
  }

  async fetchStockData(symbol: string, market: string): Promise<MarketDataFetchResult> {
    try {
      const provider = this.getProviderForMarket(market);
      const data = await fetchAndStoreStockData(symbol, market, provider);
      
      if (!data) {
        return { symbol, success: false, error: '获取数据失败' };
      }

      return { symbol, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`[MarketData] 获取 ${symbol} 数据失败:`, errorMessage);
      return { symbol, success: false, error: errorMessage };
    }
  }

  async fetchMarketStocks(markets: string[]): Promise<MarketDataFetchResult[]> {
    const stocks = await prisma.stock.findMany({
      where: { market: { in: markets } },
    });

    console.log(`[MarketData] 开始获取 ${markets.join(',')} 市场的股票数据`, {
      stockCount: stocks.length,
    });

    const results: MarketDataFetchResult[] = [];

    for (const stock of stocks) {
      const result = await this.fetchStockData(stock.symbol, stock.market);
      results.push(result);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }
}
