import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const { id } = await params;

  const existing = await prisma.tradeRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  const updated = await prisma.tradeRecord.update({
    where: { id },
    data: {
      securityName: body.securityName ?? existing.securityName,
      quantity: body.quantity !== undefined ? Number(body.quantity) : existing.quantity,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      tradedAt: body.tradedAt ? new Date(body.tradedAt) : existing.tradedAt,
      note: body.note ?? existing.note,
      stopLossPrice:
        body.stopLossPrice !== undefined
          ? Number(body.stopLossPrice)
          : existing.stopLossPrice,
      takeProfitPrice:
        body.takeProfitPrice !== undefined
          ? Number(body.takeProfitPrice)
          : existing.takeProfitPrice,
      stopRule: body.stopRule ?? existing.stopRule,
      isLuZhu: body.isLuZhu !== undefined ? Boolean(body.isLuZhu) : existing.isLuZhu,
    },
  });

  return NextResponse.json({ record: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.tradeRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  await prisma.tradeRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
