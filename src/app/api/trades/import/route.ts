import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';
import {
  importTradeRecords,
  type TradeImportItem,
} from '@/server/trade/service';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json({ added: 0, records: [] });
  }

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
