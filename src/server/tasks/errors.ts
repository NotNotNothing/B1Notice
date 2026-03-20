export class TaskStopRequestedError extends Error {
  constructor(message = '任务已收到停止请求') {
    super(message);
    this.name = 'TaskStopRequestedError';
  }
}
