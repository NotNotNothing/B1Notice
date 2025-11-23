import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';

const normalizeSide = (side: string | undefined) =>
  side?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';

const normalizeSymbol = (symbol: string | undefined) => {
  if (!symbol) return '';
  const normalized = symbol.toUpperCase().trim();
  if (normalized.includes('.')) return normalized;
  if (normalized.length === 6) {
    if (['6', '5'].includes(normalized[0])) return `${normalized}.SH`;
    if (['0', '2', '3'].includes(normalized[0])) return `${normalized}.SZ`;
  }
  return normalized;
};

const toDate = (value: string | Date | undefined) => {
  const date = value ? new Date(value) : new Date();
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
};

const bulkUpsert = async (records: any[], userId: string) => {
  if (!records.length) return { added: 0 };
  const before = await prisma.tradeRecord.count({ where: { userId } });
  await prisma.$transaction(
    records.map((item) =>
      prisma.tradeRecord.upsert({
        where: {
          userId_symbol_side_price_quantity_tradedAt: {
            userId,
            symbol: item.symbol,
            side: item.side,
            price: item.price,
            quantity: item.quantity,
            tradedAt: item.tradedAt,
          },
        },
        update: item,
        create: item,
      }),
    ),
  );
  const after = await prisma.tradeRecord.count({ where: { userId } });
  return { added: Math.max(after - before, 0) };
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json({ added: 0, records: [] });
  }

  const prepared = body.records
    .map((item: any) => ({
      userId: session.user.id,
      symbol: normalizeSymbol(item.symbol),
      securityName: item.securityName,
      side: normalizeSide(item.side),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      tradedAt: toDate(item.tradedAt),
      note: item.note,
      stopLossPrice:
        item.stopLossPrice !== undefined ? Number(item.stopLossPrice) : null,
      takeProfitPrice:
        item.takeProfitPrice !== undefined ? Number(item.takeProfitPrice) : null,
      stopRule: item.stopRule || null,
      isLuZhu: Boolean(item.isLuZhu),
    }))
    .filter((item) => item.symbol && item.quantity && item.price);

  if (!prepared.length) {
    return NextResponse.json({ added: 0, records: [] });
  }

  const result = await bulkUpsert(prepared, session.user.id);

  const records = await prisma.tradeRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ tradedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ added: result.count, records });
}
