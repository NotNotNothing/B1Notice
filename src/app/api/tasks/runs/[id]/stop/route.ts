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
    const run = await taskCenterService.requestStopRun(id);
    return successResponse(run, '已请求停止任务');
  } catch (error) {
    console.error('停止任务失败:', error);
    return errorResponse(
      error instanceof Error ? error.message : '停止任务失败',
      500,
      'TASK_STOP_FAILED',
    );
  }
}
