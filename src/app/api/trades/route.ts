import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth.config';
import { prisma } from '@/lib/prisma';
import {
  importTradeRecords,
  normalizeTradeRecord,
  type TradeImportItem,
} from '@/server/trade/service';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const records = await prisma.tradeRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ tradedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();

  // 批量导入
  if (Array.isArray(body.records)) {
    const result = await importTradeRecords(
      body.records as TradeImportItem[],
      session.user.id
    );

    const records = await prisma.tradeRecord.findMany({
      where: { userId: session.user.id },
      orderBy: [{ tradedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ added: result.added, records });
  }

  // 单条创建
  const normalized = normalizeTradeRecord(body as TradeImportItem, session.user.id);

  if (!normalized) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
  }

  try {
    const record = await prisma.tradeRecord.upsert({
      where: {
        userId_symbol_side_price_quantity_tradedAt: {
          userId: normalized.userId,
          symbol: normalized.symbol,
          side: normalized.side,
          price: normalized.price,
          quantity: normalized.quantity,
          tradedAt: normalized.tradedAt,
        },
      },
      update: normalized,
      create: normalized,
    });

    return NextResponse.json({ record, created: true });
  } catch (error: unknown) {
    console.error('创建交易记录失败', error);
    return NextResponse.json(
      { error: '创建交易记录失败' },
      { status: 500 },
    );
  }
}
