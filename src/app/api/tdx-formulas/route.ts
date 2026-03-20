import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTdxFormula } from '@/server/screener/tdx-formula';
import { auth } from '@/lib/auth';

// 获取用户的通达信公式列表
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const formulas = await prisma.tdxFormula.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error('获取通达信公式列表失败:', error);
    return NextResponse.json({ error: '获取通达信公式列表失败' }, { status: 500 });
  }
}

// 创建新的通达信公式
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { name, formula, description, isDefault } = body;

    if (!name || !formula) {
      return NextResponse.json({ error: '公式名称和公式内容不能为空' }, { status: 400 });
    }

    // 验证公式语法
    try {
      validateTdxFormula(formula);
    } catch (error) {
      return NextResponse.json(
        {
          error: `公式语法错误: ${error instanceof Error ? error.message : '未知错误'}`,
        },
        { status: 400 }
      );
    }

    // 如果设置为默认公式，先取消其他默认公式
    if (isDefault) {
      await prisma.tdxFormula.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const tdxFormula = await prisma.tdxFormula.create({
      data: {
        userId: session.user.id,
        name,
        formula,
        description: description || null,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(tdxFormula);
  } catch (error) {
    console.error('创建通达信公式失败:', error);
    return NextResponse.json({ error: '创建通达信公式失败' }, { status: 500 });
  }
}
