import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/auth.config';
import { prisma } from '@/lib/prisma';
import { sendMessageByPushDeer } from '@/server/pushdeer';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pushDeerKey: true },
    });

    if (!user?.pushDeerKey) {
      return NextResponse.json(
        { error: '未配置 PushDeer Key' },
        { status: 400 },
      );
    }

    const { title, desp } = await request.json();
    if (!title || !desp) {
      return NextResponse.json(
        { error: 'title 与 desp 均为必填' },
        { status: 400 },
      );
    }

    await sendMessageByPushDeer(title, desp, 'markdown', user.pushDeerKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('发送交易 PushDeer 失败', error);
    return NextResponse.json(
      { error: '发送 PushDeer 失败' },
      { status: 500 },
    );
  }
}
