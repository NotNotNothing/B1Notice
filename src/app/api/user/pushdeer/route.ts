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
        pushDeerKey: true,
      },
    });

    if (!user) {
      console.log('未找到用户:', session.user.id);
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ pushDeerKey: user.pushDeerKey || '' });
  } catch (error) {
    console.error('获取 PushDeer Key 失败:', error);
    return NextResponse.json(
      { error: '获取 PushDeer Key 失败' },
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

    const { pushDeerKey } = body;

    if (!pushDeerKey) {
      return NextResponse.json(
        { error: '请提供 PushDeer Key' },
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

    // 更新 PushDeer Key
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        pushDeerKey,
      },
    });

    console.log('更新成功:', updatedUser.id);
    return NextResponse.json({ message: 'PushDeer Key 更新成功' });
  } catch (error) {
    console.error('更新 PushDeer Key 失败:', error);
    return NextResponse.json(
      { error: '更新 PushDeer Key 失败' },
      { status: 500 }
    );
  }
}
