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
    const run = await taskCenterService.retryRun(id, {
      awaitCompletion: false,
    });

    return successResponse(run, '任务重试已触发', 202);
  } catch (error) {
    console.error('重试任务失败:', error);
    return errorResponse(
      error instanceof Error ? error.message : '重试任务失败',
      500,
      'TASK_RETRY_FAILED',
    );
  }
}
