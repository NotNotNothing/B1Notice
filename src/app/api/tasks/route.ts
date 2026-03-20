import { taskCenterService } from '@/server/tasks';

import { errorResponse, getTaskUserId, successResponse } from './_utils';

export async function GET() {
  const userId = await getTaskUserId();
  if (!userId) {
    return errorResponse('未登录', 401, 'UNAUTHORIZED');
  }

  try {
    const definitions = await taskCenterService.listDefinitions();
    return successResponse(definitions);
  } catch (error) {
    console.error('获取任务定义失败:', error);
    return errorResponse('获取任务定义失败', 500, 'TASK_LIST_FAILED');
  }
}
