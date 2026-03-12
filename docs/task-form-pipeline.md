# Task: 表单模式对接 FastGPT Pipeline API

## 背景
当前 CreativeConsole.vue 有两种模式：mock（表单）和 pipeline（聊天式）。
Niko 不喜欢聊天式交互，要求用 **原来的表单模式** 对接 Pipeline API。

## 目标
改造 CreativeConsole.vue，让表单模式（TaskConfigForm）直接调用 FastGPT Pipeline API，去掉聊天式 UI。

## 具体要求

### 1. 改造 TaskConfigForm.vue
在现有表单字段（目标人群、参考文案、脑暴卖点）基础上，**新增**：
- **配音风格** 选择器（单选卡片）：活力男声 / 专业男声 / 甜美女声 / 沉稳女声
- **字幕样式** 选择器（单选卡片）：大字报 / 极简黑底 / 综艺花字

保持现有 Arc light 主题风格（`#7C5CFC` 紫色主色）。

### 2. 改造 CreativeConsole.vue 流程
去掉 `activeMode` 切换（mock/pipeline），统一走 Pipeline：

**Step 1**: 用户填写表单 → 点击"AI 生成创意文案" → 调 Pipeline API（mode=文案）
- `userMessage` = 拼接表单内容："目标人群：{audience}，卖点：{keywords}，参考文案：{reference}"
- `variables.mode = '文案'`
- 展示 loading 状态，streaming 输出到 CreativeOutput 组件
- 完成后解析 4 个方案，展示在卡片中供用户选择

**Step 2**: 用户选择方案 → 自动调 Pipeline API（mode=视频）
- `variables.mode = '视频'`
- `variables.copy = 选中的文案`
- `variables.voice = 表单选的配音`
- `variables.text = 表单选的字幕样式`
- 展示视频制作进度
- 完成后自动提取 task_id，开始轮询渲染状态

### 3. 保留的组件
- `TaskConfigForm.vue` — 改造（加 voice/subtitle 字段）
- `CreativeOutput.vue` — 保留，展示 AI 输出
- `ScriptEditor.vue` — 保留，用于编辑选中的方案

### 4. 删除/简化
- 删除 pipeline 聊天式 UI（chat input area, chat-textarea 等）
- 删除 mock/pipeline 模式切换
- 简化 store：移除 `pipelineInput` 相关逻辑，表单提交直接触发 pipeline

### 5. 技术约束
- `vue-tsc --noEmit` 零错误
- `vite build` 零错误
- 保持现有 Arc light 主题 CSS 变量
- Pipeline API 调用复用 `src/api/pipeline.ts`（callPipelineStream）
- CapCut 渲染追踪复用 `src/api/capcut.ts`（pollVideoTask）

## 关键文件
- `src/components/creative/TaskConfigForm.vue` — 改造
- `src/views/CreativeConsole.vue` — 重构
- `src/stores/creative.ts` — 简化
- `src/api/pipeline.ts` — 不改，直接复用
- `src/api/capcut.ts` — 不改，直接复用
- `src/types/index.ts` — 可能需要扩展 TaskConfig 类型

## Pipeline API 参考
- Browser URL: `/api/pipeline/v1/chat/completions`
- Upstream URL: `https://ai.blue-converse.com/api/v1/chat/completions`
- Auth: 由服务端代理通过 `PIPELINE_AUTHORIZATION` 注入，不应在前端代码或文档中保存明文 token
- Variables: `{ mode: "文案"|"视频", copy?: string, voice?: string, text?: string }`
- Voice options: 活力男声 / 专业男声 / 甜美女声 / 沉稳女声
- Subtitle options: 大字报 / 极简黑底 / 综艺花字
