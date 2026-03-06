# Task: 修复视频制作完成后卡住不跳转的问题

## 问题
Pipeline 视频模式流输出已经结束，但前端卡在"视频制作中"，不跳转成片交付。

原因：`autoDetectAndPoll` 从 pipeline output 中提取不到 task_id（正则没匹配到），导致：
1. 没有启动 pollVideoTask
2. `onAllVideosDone` 回调永远不会触发
3. 页面卡住

## 修复方案

### 1. 修改 autoDetectAndPoll（src/stores/creative.ts）
流输出结束后，**不管是否提取到 task_id，都应该跳转**。

```ts
function autoDetectAndPoll(text: string) {
  const tids = extractAllTaskIds(text)
  const did = extractDraftId(text)
  if (tids.length > 0) videoTaskIds.value = tids
  if (did) videoDraftId.value = did

  if (tids.length > 0) {
    // 有 task_id，走轮询→完成后跳转
    for (const tid of tids) {
      startVideoPolling(tid)
    }
  } else {
    // 没提取到 task_id，直接触发完成回调
    // 视频信息可能在 output 文本中以其他格式存在
    if (_onAllVideosDone) {
      _onAllVideosDone()
    }
  }
}
```

### 2. 增强 task_id 提取正则（src/api/capcut.ts）
FastGPT workflow 的 Claude agent 输出格式不确定，增加更多 pattern：
- JSON 格式：`"task_id": "xxx"`
- markdown 格式：`**task_id**: xxx` 或 `- task_id: xxx`
- 纯数字 ID
- 中文格式：`任务编号：xxx`、`渲染任务：xxx`

### 3. ResultDelivery.vue — 兜底展示
如果没有 task_id 也没有 video_url，ResultDelivery 应该：
- 展示 pipeline 的完整输出文本
- 从文本中尝试提取视频 URL（http 链接 + 视频扩展名）
- 提供手动输入 task_id 查询的入口

### 4. 技术约束
- vue-tsc --noEmit 零错误
- vite build 零错误
