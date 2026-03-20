# AKShare 连接稳定性优化

## 问题分析

原始错误：
```
[AKShare] 获取行情失败: 601127.SH Error [AKShareError]: ('Connection aborted.', RemoteDisconnected('Remote end closed connection without response'))
```

**根本原因：**
1. 网络连接不稳定，远程服务器断开连接
2. 没有重试机制，失败后直接返回错误
3. 没有超时控制，可能长时间等待
4. 可能触发 API 频率限制

## 优化方案

### 1. TypeScript 层（src/server/datasource/providers/akshare.ts）

#### 添加重试机制
- 最多重试 3 次
- 指数退避策略：1s → 2s → 4s
- 智能识别可重试错误（连接、超时、网络相关）

#### 添加超时控制
- Python 进程超时：30 秒
- 自动清理超时进程，避免僵尸进程

#### 错误分类
```typescript
const isRetryable =
  errorMessage.includes('connection') ||
  errorMessage.includes('timeout') ||
  errorMessage.includes('remote') ||
  errorMessage.includes('network');
```

### 2. Python 层（scripts/akshare_proxy.py）

#### 请求限流
- 每个请求之间最少间隔 0.5 秒
- 避免触发 API 频率限制

#### 安全 API 调用包装器
```python
def safe_api_call(func, *args, max_retries=2, **kwargs):
    """带重试机制的安全 API 调用"""
    for attempt in range(max_retries):
        try:
            rate_limit()  # 限流
            return func(*args, **kwargs)
        except Exception as e:
            # 检查是否为可重试错误
            if is_retryable and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # 2s, 4s
                time.sleep(wait_time)
                continue
            raise e
```

#### requests 配置优化
```python
requests.adapters.DEFAULT_RETRIES = 3  # 自动重试 3 次
```

## 优化效果

### 重试策略
- **TypeScript 层**：3 次重试，指数退避
- **Python 层**：2 次重试，线性退避
- **总计**：最多 6 次尝试，大幅提高成功率

### 超时保护
- 30 秒超时，避免无限等待
- 自动清理资源

### 限流保护
- 请求间隔 0.5 秒，避免触发限制

## 使用说明

修改已自动生效，无需额外配置。当遇到网络错误时，系统会：

1. 自动重试（最多 3 次）
2. 打印警告日志：
   ```
   [AKShare] 第 1 次重试失败，1000ms 后重试: ('Connection aborted.', ...)
   ```
3. 如果所有重试失败，返回 null 或空数组

## 监控建议

在生产环境中，建议监控以下指标：
- 重试次数统计
- 平均响应时间
- 最终失败率

## 后续优化方向

1. **缓存机制**：对实时性要求不高的数据添加缓存
2. **熔断器**：连续失败达到阈值时暂时停用 AKShare
3. **降级策略**：失败时切换到备用数据源
4. **异步队列**：将请求放入队列，批量处理

## 测试验证

```bash
# 验证 Python 语法
python3 -m py_compile scripts/akshare_proxy.py

# 测试单个股票查询
python3 scripts/akshare_proxy.py quote 601127.SH
```
