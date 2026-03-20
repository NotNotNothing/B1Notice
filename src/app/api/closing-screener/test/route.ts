import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '../../auth/auth.config';
import { closingScreenerService } from '@/server/screener/service';

const testSchema = z.object({
  formula: z.string().min(1, '通达信公式不能为空').max(4000),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '通达信公式不合法', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const results = await closingScreenerService.testFormulaWithWatchlist(
      session.user.id,
      parsed.data.formula,
    );

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('测试通达信公式失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '测试通达信公式失败' },
      { status: 500 },
    );
  }
}
