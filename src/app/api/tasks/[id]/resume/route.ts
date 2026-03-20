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
    const definition = await taskCenterService.resumeDefinition(id);
    return successResponse(definition, '任务已恢复');
  } catch (error) {
    console.error('恢复任务失败:', error);
    return errorResponse(
      error instanceof Error ? error.message : '恢复任务失败',
      500,
      'TASK_RESUME_FAILED',
    );
  }
}
