import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTdxFormula } from '@/server/screener/tdx-formula';
import { auth } from '@/lib/auth';

// 获取单个公式
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;
    const formula = await prisma.tdxFormula.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!formula) {
      return NextResponse.json({ error: '公式不存在' }, { status: 404 });
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error('获取通达信公式失败:', error);
    return NextResponse.json({ error: '获取通达信公式失败' }, { status: 500 });
  }
}

// 更新公式
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;
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

    // 检查公式是否属于当前用户
    const existing = await prisma.tdxFormula.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '公式不存在' }, { status: 404 });
    }

    // 如果设置为默认公式，先取消其他默认公式
    if (isDefault) {
      await prisma.tdxFormula.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.tdxFormula.update({
      where: { id },
      data: {
        name,
        formula,
        description: description || null,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('更新通达信公式失败:', error);
    return NextResponse.json({ error: '更新通达信公式失败' }, { status: 500 });
  }
}

// 删除公式
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;
    // 检查公式是否属于当前用户
    const existing = await prisma.tdxFormula.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '公式不存在' }, { status: 404 });
    }

    await prisma.tdxFormula.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除通达信公式失败:', error);
    return NextResponse.json({ error: '删除通达信公式失败' }, { status: 500 });
  }
}
