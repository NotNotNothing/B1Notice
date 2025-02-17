import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stockSymbol, type, condition, threshold, isActive } = body;

    // 首先获取股票信息
    const stock = await prisma.stock.findFirst({
      where: {
        symbol: stockSymbol,
      },
    });

    if (!stock) {
      return NextResponse.json(
        { error: '未找到对应的股票信息' },
        { status: 404 },
      );
    }

    // 创建监控规则
    const monitor = await prisma.monitor.create({
      data: {
        stockId: stock.id,
        type,
        condition,
        threshold,
        isActive,
      },
    });

    return NextResponse.json(monitor);
  } catch (error) {
    console.error('创建监控规则失败:', error);
    return NextResponse.json({ error: '创建监控规则失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockSymbol = searchParams.get('stockSymbol');

    const whereClause = stockSymbol
      ? {
          stock: {
            symbol: stockSymbol,
          },
        }
      : {};

    const monitors = await prisma.monitor.findMany({
      where: whereClause,
      include: {
        stock: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!monitors) {
      return NextResponse.json({ error: '没有找到监控规则' }, { status: 404 });
    }

    return NextResponse.json(monitors);
  } catch (error) {
    if (error instanceof Error) {
      console.error('获取监控规则失败:', error.message);
      return NextResponse.json(
        { error: '获取监控规则失败', details: error.message },
        { status: 500 },
      );
    }

    console.error('获取监控规则失败:', error);
    return NextResponse.json({ error: '获取监控规则失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少监控规则ID' }, { status: 400 });
    }

    await prisma.monitor.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除监控规则失败:', error);
    return NextResponse.json({ error: '删除监控规则失败' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少监控规则ID' }, { status: 400 });
    }

    const monitor = await prisma.monitor.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json(monitor);
  } catch (error) {
    console.error('更新监控规则失败:', error);
    return NextResponse.json({ error: '更新监控规则失败' }, { status: 500 });
  }
}
