import { IQuoteProvider, DataSourceType } from './types';

const providers: Map<DataSourceType, IQuoteProvider> = new Map();

export function registerProvider(provider: IQuoteProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: DataSourceType): IQuoteProvider | undefined {
  return providers.get(name);
}

export function getAvailableProviders(): DataSourceType[] {
  return Array.from(providers.keys());
}

export function clearProviders(): void {
  providers.clear();
}
