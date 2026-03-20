import { taskCenterService } from '@/server/tasks';

import { errorResponse, getTaskUserId, successResponse } from '@/app/api/tasks/_utils';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getTaskUserId();
  if (!userId) {
    return errorResponse('未登录', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const run = await taskCenterService.triggerTaskByDefinitionId(id, {
      triggeredBy: 'USER',
      reason: `用户 ${userId} 手动触发`,
      awaitCompletion: false,
      metadata: {
        initiatedByUserId: userId,
      },
    });

    return successResponse(run, '任务已触发', 202);
  } catch (error) {
    console.error('手动触发任务失败:', error);
    return errorResponse(
      error instanceof Error ? error.message : '手动触发任务失败',
      500,
      'TASK_TRIGGER_FAILED',
    );
  }
}
