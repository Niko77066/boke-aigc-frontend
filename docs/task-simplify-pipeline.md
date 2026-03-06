# Task: 简化产线流程 — 去掉音画配置和渲染进度

## 背景
Niko 反馈：音画配置和渲染进度两个中间页面不需要了。创意生成完后直接 kuku 干活，流输出结束后自动跳转成片交付。

## 具体改动

### 1. AppSidebar.vue — 简化产线步骤
```js
// 改前
const pipelineItems = [
  { path: '/creative', label: '创意生成', icon: Pencil },
  { path: '/config', label: '音画配置', icon: Headphones },
  { path: '/render', label: '渲染进度', icon: Loader2 },
  { path: '/result', label: '成片交付', icon: Play },
]

// 改后
const pipelineItems = [
  { path: '/creative', label: '创意生成', icon: Pencil },
  { path: '/result', label: '成片交付', icon: Play },
]
```
删除 Headphones 和 Loader2 的 import。

### 2. router/index.ts — 删除 /config 和 /render 路由
- 删除 `/config` (AudioVideoConfig) 路由
- 删除 `/render` (RenderProgress) 路由
- `/result` 的 step 从 4 改为 2
- 简化 route guard（只有 step 1 和 2）

### 3. CreativeConsole.vue — 视频制作完成后自动跳转
在 Pipeline 视频模式流输出结束后：
- 等待 CapCut 渲染任务完成（已有 pollVideoTask 逻辑）
- **自动 `router.push('/result')`** 跳转到成片交付
- 跳转前把视频 URL 和草稿 ID 存到 store 里

### 4. ResultDelivery.vue — 展示 2 个视频 + 剪映草稿
Pipeline 视频模式的 output 中会包含两个视频的信息（workflow 模板写的 "一次产出两个视频"）。

改造 ResultDelivery：
- 从 creativeStore 读取 videoRenderStatus（可能有多个 task_id）
- 调用 `getVideoTaskStatus(taskId)` 获取每个视频的下载 URL
- 用 `<video>` 标签渲染 2 个视频（并排卡片）
- 调用 `getDraftTracks(draftId)` 获取草稿信息
- 展示草稿信息卡片（track 列表、时长等）
- 提供"下载成片"和"打开剪映草稿"按钮

### 5. stores/creative.ts — 支持多个 task_id
当前只存一个 `videoTaskId`，需要改成数组，因为 workflow 会产出两个视频：
```ts
const videoTaskIds = ref<string[]>([])
const videoRenderStatuses = ref<Map<string, VideoTaskStatus>>(new Map())
```

从 pipeline output 中提取所有 task_id（可能多个），逐个轮询。

### 6. 删除不需要的页面（可选）
如果确认不再需要，可以删除：
- `src/views/AudioVideoConfig.vue`
- `src/views/RenderProgress.vue`

但建议先保留文件，只从路由和侧边栏移除。

### 7. AppHeader.vue — 步骤条简化
Header 的步骤条如果有4步展示，需要改成2步：创意生成 → 成片交付

## 技术约束
- vue-tsc --noEmit 零错误
- vite build 零错误
- capcut.ts 的 `extractTaskId` 要能提取多个 task_id
- pipeline 流输出结束的检测点在 store 的 onDone 回调里
- 自动跳转用 `router.push('/result')`

## 关键文件
- `src/components/layout/AppSidebar.vue` — 改
- `src/components/layout/AppHeader.vue` — 改步骤条
- `src/router/index.ts` — 删路由
- `src/views/CreativeConsole.vue` — 加自动跳转
- `src/views/ResultDelivery.vue` — 重做成片展示
- `src/stores/creative.ts` — 多 task_id 支持
- `src/api/capcut.ts` — extractAllTaskIds 函数

## CapCut API 参考（已封装在 src/api/capcut.ts）
- `getVideoTaskStatus(taskId)` → { status, progress, video_url, cover_url }
- `getDraftTracks(draftId)` → { draft_id, tracks: [...] }
- `pollVideoTask(taskId, onProgress, interval, timeout)` → final status
- `extractTaskId(text)` → 单个 task_id（需要加 extractAllTaskIds）
- `extractDraftId(text)` → draft_id
