import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/auth.config';
import { closingScreenerService } from '@/server/screener/service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const results = await closingScreenerService.getLatestResultsForUser(session.user.id);
    return NextResponse.json(results);
  } catch (error) {
    console.error('获取收盘选股结果失败:', error);
    return NextResponse.json({ error: '获取收盘选股结果失败' }, { status: 500 });
  }
}
