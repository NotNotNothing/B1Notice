import type { TaskRunStatus } from '@/server/tasks';
import { taskCenterService } from '@/server/tasks';

import { errorResponse, getTaskUserId, successResponse } from '../_utils';

export async function GET(request: Request) {
  const userId = await getTaskUserId();
  if (!userId) {
    return errorResponse('未登录', 401, 'UNAUTHORIZED');
  }

  try {
    const { searchParams } = new URL(request.url);
    const definitionId = searchParams.get('definitionId');
    const status = searchParams.get('status') as TaskRunStatus | null;
    const limitValue = searchParams.get('limit');
    const limit = limitValue ? Number(limitValue) : null;

    const runs = await taskCenterService.listRuns({
      definitionId,
      status,
      limit: Number.isFinite(limit) ? limit : null,
    });

    return successResponse(runs);
  } catch (error) {
    console.error('获取任务运行记录失败:', error);
    return errorResponse('获取任务运行记录失败', 500, 'TASK_RUN_LIST_FAILED');
  }
}
