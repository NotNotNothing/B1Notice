import 'server-only';
import { prisma } from '@/lib/prisma';

export interface TradeImportItem {
  symbol: string;
  securityName?: string;
  side: string;
  quantity: number | string;
  price: number | string;
  tradedAt: string | Date;
  note?: string;
  stopLossPrice?: number | string | null;
  takeProfitPrice?: number | string | null;
  stopRule?: string | null;
  isLuZhu?: boolean;
}

export interface NormalizedTradeRecord {
  userId: string;
  symbol: string;
  securityName?: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  tradedAt: Date;
  note?: string;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  stopRule: string | null;
  isLuZhu: boolean;
}

export function normalizeSide(side: string | undefined): 'BUY' | 'SELL' {
  return side?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
}

export function normalizeSymbol(symbol: string | undefined): string {
  if (!symbol) return '';
  const normalized = symbol.toUpperCase().trim();
  if (normalized.includes('.')) return normalized;
  
  if (normalized.length === 6) {
    if (['6', '5'].includes(normalized[0])) return `${normalized}.SH`;
    if (['0', '2', '3'].includes(normalized[0])) return `${normalized}.SZ`;
  }
  
  return normalized;
}

export function toDate(value: string | Date | undefined): Date {
  const date = value ? new Date(value) : new Date();
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

export function normalizeTradeRecord(
  item: TradeImportItem,
  userId: string
): NormalizedTradeRecord | null {
  const symbol = normalizeSymbol(item.symbol);
  const quantity = Number(item.quantity || 0);
  const price = Number(item.price || 0);

  if (!symbol || !quantity || !price) {
    return null;
  }

  return {
    userId,
    symbol,
    securityName: item.securityName,
    side: normalizeSide(item.side),
    quantity,
    price,
    tradedAt: toDate(item.tradedAt),
    note: item.note,
    stopLossPrice:
      item.stopLossPrice !== undefined && item.stopLossPrice !== null
        ? Number(item.stopLossPrice)
        : null,
    takeProfitPrice:
      item.takeProfitPrice !== undefined && item.takeProfitPrice !== null
        ? Number(item.takeProfitPrice)
        : null,
    stopRule: item.stopRule || null,
    isLuZhu: Boolean(item.isLuZhu),
  };
}

export async function bulkUpsertTradeRecords(
  records: NormalizedTradeRecord[]
): Promise<{ added: number }> {
  if (!records.length) return { added: 0 };

  const userId = records[0]?.userId;
  if (!userId) return { added: 0 };

  const before = await prisma.tradeRecord.count({ where: { userId } });

  await prisma.$transaction(
    records.map((item) =>
      prisma.tradeRecord.upsert({
        where: {
          userId_symbol_side_price_quantity_tradedAt: {
            userId: item.userId,
            symbol: item.symbol,
            side: item.side,
            price: item.price,
            quantity: item.quantity,
            tradedAt: item.tradedAt,
          },
        },
        update: item,
        create: item,
      })
    )
  );

  const after = await prisma.tradeRecord.count({ where: { userId } });
  return { added: Math.max(after - before, 0) };
}

export async function importTradeRecords(
  items: TradeImportItem[],
  userId: string
): Promise<{ added: number; records: NormalizedTradeRecord[] }> {
  const normalizedRecords = items
    .map((item) => normalizeTradeRecord(item, userId))
    .filter((record): record is NormalizedTradeRecord => record !== null);

  if (!normalizedRecords.length) {
    return { added: 0, records: [] };
  }

  const result = await bulkUpsertTradeRecords(normalizedRecords);

  return {
    added: result.added,
    records: normalizedRecords,
  };
}
