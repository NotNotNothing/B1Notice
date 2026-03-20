import { taskCenterService } from '@/server/tasks';

import { errorResponse, getTaskUserId, successResponse } from '../../_utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getTaskUserId();
  if (!userId) {
    return errorResponse('未登录', 401, 'UNAUTHORIZED');
  }

  try {
    const { id } = await params;
    const run = await taskCenterService.getRunDetail(id);

    if (!run) {
      return errorResponse('任务运行记录不存在', 404, 'TASK_RUN_NOT_FOUND');
    }

    return successResponse(run);
  } catch (error) {
    console.error('获取任务运行详情失败:', error);
    return errorResponse('获取任务运行详情失败', 500, 'TASK_RUN_DETAIL_FAILED');
  }
}
