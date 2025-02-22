import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/auth.config';
import { sendMessageByPushDeer } from '@/server/pushdeer';

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

    // 发送测试消息
    await sendMessageByPushDeer(
      '🎉 测试推送成功',
      '恭喜您！如果您收到这条消息，说明 PushDeer 推送功能配置成功。\n\n当股票满足您设置的条件时，您将收到类似的通知。',
      'markdown',
      pushDeerKey
    );

    console.log('测试推送发送成功');
    return NextResponse.json({ message: '测试推送发送成功' });
  } catch (error) {
    console.error('测试推送失败:', error);
    return NextResponse.json(
      { error: '测试推送失败' },
      { status: 500 }
    );
  }
} 
