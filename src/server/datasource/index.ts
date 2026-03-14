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
