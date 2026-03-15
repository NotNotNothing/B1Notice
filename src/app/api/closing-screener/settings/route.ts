import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '../../auth/auth.config';
import { closingScreenerService } from '@/server/screener/service';

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  notifyEnabled: z.boolean().optional(),
  maxDailyJ: z.number().min(-100).max(200).nullable().optional(),
  maxWeeklyJ: z.number().min(-100).max(200).nullable().optional(),
  requirePriceAboveBBI: z.boolean().optional(),
  minAboveBBIDays: z.number().int().min(0).max(30).nullable().optional(),
  minVolumeRatio: z.number().min(0).max(20).nullable().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const rule = await closingScreenerService.getUserRule(session.user.id);
    return NextResponse.json(rule);
  } catch (error) {
    console.error('获取收盘选股配置失败:', error);
    return NextResponse.json({ error: '获取收盘选股配置失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '收盘选股配置不合法', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const nextRule = await closingScreenerService.updateUserRule(session.user.id, parsed.data);
    return NextResponse.json(nextRule);
  } catch (error) {
    console.error('更新收盘选股配置失败:', error);
    return NextResponse.json({ error: '更新收盘选股配置失败' }, { status: 500 });
  }
}
