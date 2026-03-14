import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';
import { prisma } from '@/lib/prisma';
import { getAvailableDataSources, DataSourceType } from '@/server/datasource';

const DEFAULT_SOURCES = [
  { name: 'longbridge' as DataSourceType, displayName: 'Longbridge (港股/美股)', available: false },
  { name: 'akshare' as DataSourceType, displayName: 'AKShare (A股)', available: false },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dataSource: true },
    });

    let availableSources;
    try {
      availableSources = await getAvailableDataSources();
    } catch (error) {
      console.error('[DataSource API] 获取可用数据源失败，使用默认列表:', error);
      availableSources = DEFAULT_SOURCES;
    }

    const response = {
      currentSource: user?.dataSource || 'longbridge',
      availableSources,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[DataSource API] 获取数据源配置失败:', error);
    return NextResponse.json({ 
      error: '获取数据源配置失败',
      currentSource: 'longbridge',
      availableSources: DEFAULT_SOURCES,
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { dataSource } = body;

    const validSources: DataSourceType[] = ['longbridge', 'akshare'];
    if (!dataSource || !validSources.includes(dataSource)) {
      return NextResponse.json({ error: '无效的数据源' }, { status: 400 });
    }

    const availableSources = await getAvailableDataSources();
    const sourceInfo = availableSources.find((s) => s.name === dataSource);
    
    if (!sourceInfo?.available) {
      return NextResponse.json({ 
        error: `数据源 ${dataSource} 不可用` 
      }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { dataSource },
    });

    return NextResponse.json({ 
      success: true, 
      dataSource,
      message: '数据源已切换' 
    });
  } catch (error) {
    console.error('切换数据源失败:', error);
    return NextResponse.json({ error: '切换数据源失败' }, { status: 500 });
  }
}
