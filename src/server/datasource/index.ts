import 'server-only';
import { IQuoteProvider, DataSourceType, KLINE_PERIOD } from './types';
import { getProvider, registerProvider, getAvailableProviders } from './registry';
import { createLongbridgeProvider } from './providers/longbridge';
import { createAKShareProvider } from './providers/akshare';

export { KLINE_PERIOD };
export type { KlinePeriodType } from './types';

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureProvidersInitialized(): Promise<void> {
  if (initialized) return;
  
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const longbridgeProvider = createLongbridgeProvider();
    registerProvider(longbridgeProvider);

    const akshareProvider = createAKShareProvider();
    registerProvider(akshareProvider);

    initialized = true;
  })();

  return initPromise;
}

export async function getQuoteProvider(
  preferredSource?: DataSourceType,
): Promise<IQuoteProvider> {
  await ensureProvidersInitialized();

  const sourceName = preferredSource || 'longbridge';
  const provider = getProvider(sourceName);

  if (!provider) {
    throw new Error(`Unknown data source: ${sourceName}`);
  }

  await provider.initialize();
  return provider;
}

export async function getAvailableDataSources(): Promise<
  { name: DataSourceType; displayName: string; available: boolean }[]
> {
  await ensureProvidersInitialized();

  const providers = getAvailableProviders();

  const results = await Promise.all(
    providers.map(async (name) => {
      const provider = getProvider(name);
      const available = provider ? await provider.isAvailable() : false;
      return {
        name,
        displayName: provider?.displayName || name,
        available,
      };
    }),
  );

  return results;
}

export type { IQuoteProvider, DataSourceType };

/**
 * 根据股票代码和市场推断应使用的数据源。
 *
 * 规则：
 * - SH / SZ / BJ → AKShare（A 股）
 * - HK / US       → Longbridge（港股 / 美股）
 * - 无市场后缀时按代码模式推断：
 *   6 位纯数字 → AKShare（A 股）
 *   5 位纯数字 → Longbridge（港股）
 *   纯字母     → Longbridge（美股）
 * - 兜底返回 longbridge
 */
export function inferDataSourceFromSymbol(
  symbol: string,
  market?: string | null,
): DataSourceType {
  const upper = symbol.toUpperCase();

  // 优先使用显式传入的 market
  const effectiveMarket =
    market ||
    (() => {
      const parts = upper.split('.');
      return parts.length > 1 ? parts[1] : undefined;
    })();

  if (effectiveMarket) {
    if (['SH', 'SZ', 'BJ'].includes(effectiveMarket)) return 'akshare';
    if (['HK', 'US'].includes(effectiveMarket)) return 'longbridge';
  }

  // 无市场信息时按代码模式推断
  if (/^\d{6}$/.test(upper)) return 'akshare';   // 6 位纯数字 → A 股
  if (/^\d{5}$/.test(upper)) return 'longbridge'; // 5 位纯数字 → 港股
  if (/^[A-Z]+$/.test(upper)) return 'longbridge'; // 纯字母 → 美股

  return 'longbridge';
}
