import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/auth.config';
import { taskCenterService } from '@/server/tasks';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: '收盘选股任务已触发',
      data: await taskCenterService.triggerTaskByKey('closing-screener-a-share', {
        triggeredBy: 'USER',
        reason: `用户 ${session.user.id} 手动触发收盘选股`,
        awaitCompletion: false,
        metadata: {
          initiatedByUserId: session.user.id,
          source: 'closing-screener-panel',
        },
      }),
    }, { status: 202 });
  } catch (error) {
    console.error('执行收盘选股失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '执行收盘选股失败' },
      { status: 500 },
    );
  }
}
