import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/auth.config';
import { closingScreenerService } from '@/server/screener/service';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const runResult = await closingScreenerService.runDailyAShareScreening();
    const results = await closingScreenerService.getLatestResultsForUser(session.user.id);

    return NextResponse.json({
      ...runResult,
      results,
    });
  } catch (error) {
    console.error('执行收盘选股失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '执行收盘选股失败' },
      { status: 500 },
    );
  }
}
