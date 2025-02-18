import { createMonitorScheduler } from './scheduler';

// 初始化服务器端功能
let isInitialized = false;

export function initializeServer() {
  if (isInitialized) return;

  // 确保只在服务器端运行
  if (typeof window === 'undefined') {
    console.log('   - 正在初始化服务器端功能...');

    // 创建并启动 MonitorScheduler
    const scheduler = createMonitorScheduler();
    scheduler.startMonitoring();

    console.log('   - 服务器端功能初始化完成');
  }

  isInitialized = true;
}
