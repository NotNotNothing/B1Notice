import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { calculateAllBuySignals } from '@/server/signal/service';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const buySignals = await calculateAllBuySignals(session.user.id);
    return NextResponse.json({ results: buySignals });
  } catch (error) {
    console.error('获取买入信号失败:', error);
    return NextResponse.json(
      { error: '获取买入信号失败' },
      { status: 500 }
    );
  }
}
