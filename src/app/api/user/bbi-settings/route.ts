import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET Session:', session);

    if (!session?.user?.id) {
      console.log('未登录或用户ID不存在');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        showBBITrendSignal: true,
        buySignalJThreshold: true,
        b1NotifyEnabled: true,
      },
    });

    if (!user) {
      console.log('未找到用户:', session.user.id);
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      showBBITrendSignal: user.showBBITrendSignal,
      buySignalJThreshold: user.buySignalJThreshold,
      b1NotifyEnabled: user.b1NotifyEnabled,
    });
  } catch (error) {
    console.error('获取BBI趋势信号设置失败:', error);
    return NextResponse.json(
      { error: '获取BBI趋势信号设置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('POST Session:', session);

    if (!session?.user?.id) {
      console.log('未登录或用户ID不存在');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { showBBITrendSignal, buySignalJThreshold, b1NotifyEnabled } = body;

    if (
      showBBITrendSignal === undefined &&
      buySignalJThreshold === undefined &&
      b1NotifyEnabled === undefined
    ) {
      return NextResponse.json(
        { error: '请提供要更新的设置项' },
        { status: 400 },
      );
    }

    if (showBBITrendSignal !== undefined && typeof showBBITrendSignal !== 'boolean') {
      return NextResponse.json(
        { error: '请提供有效的BBI趋势信号设置值' },
        { status: 400 }
      );
    }

    if (b1NotifyEnabled !== undefined && typeof b1NotifyEnabled !== 'boolean') {
      return NextResponse.json(
        { error: '请提供有效的B1通知设置值' },
        { status: 400 }
      );
    }

    if (buySignalJThreshold !== undefined && (typeof buySignalJThreshold !== 'number' || buySignalJThreshold < 0 || buySignalJThreshold > 100)) {
      return NextResponse.json(
        { error: '请提供有效的买入信号J值阈值（0-100之间）' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!existingUser) {
      console.log('未找到用户:', session.user.id);
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 更新设置
    const updateData: any = {};

    if (showBBITrendSignal !== undefined) {
      updateData.showBBITrendSignal = showBBITrendSignal;
    }

    if (b1NotifyEnabled !== undefined) {
      updateData.b1NotifyEnabled = b1NotifyEnabled;
    }

    if (buySignalJThreshold !== undefined) {
      updateData.buySignalJThreshold = buySignalJThreshold;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: updateData,
    });

    console.log('更新成功:', updatedUser.id);
    return NextResponse.json({
      message: '设置更新成功',
      showBBITrendSignal: updatedUser.showBBITrendSignal,
      buySignalJThreshold: updatedUser.buySignalJThreshold,
      b1NotifyEnabled: updatedUser.b1NotifyEnabled,
    });
  } catch (error) {
    console.error('更新BBI趋势信号设置失败:', error);
    return NextResponse.json(
      { error: '更新BBI趋势信号设置失败' },
      { status: 500 }
    );
  }
}
