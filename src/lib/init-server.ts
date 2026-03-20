import { taskCenterService, taskSystemScheduler } from '@/server/tasks';

// 初始化服务器端功能
let isInitialized = false;

export function initializeServer() {
  if (isInitialized) return;

  // 确保只在服务器端运行
  if (typeof window === 'undefined') {
    console.log('   - 正在初始化服务器端功能...');
    void (async () => {
      try {
        await taskCenterService.initialize();
        taskSystemScheduler.start();
        await taskCenterService.bootstrapInitialTasks();
        console.log('   - 服务器端功能初始化完成');
      } catch (error) {
        console.error('   - 服务器端功能初始化失败:', error);
      }
    })();
  }

  isInitialized = true;
}
