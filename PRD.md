# 波克城市 AIGC 营销视频全链路产线 V1.0

## 技术栈
- **前端**: Vue 3 + TypeScript + Pinia + Element Plus + Tailwind CSS
- **后端**: Python FastAPI (异步)
- **部署**: Docker + docker-compose + Nginx
- **CI/CD**: GitHub Actions

## 架构
薄前端 + 厚中台 SaaS 工作流引擎，前端全局接管状态机，底层编排 4 大核心 API。

### 三大核心层
1. **资产基建层**: 前端直传 → AMS 入库 → 异步打标 (输出 Asset_ID + 标签)
2. **文案创编层**: 前端收集三维变量 → Agent (route: copy) → 输出 4 套结构化脚本
3. **混剪渲染层**: 前端传入选中脚本 + 声画配置 → Agent (route: timeline) → 2 份工程排轨 → 并发轮询渲染引擎 → 交付成片

## 前端页面

### 全局布局
- **Header**: Logo [波克城市 AIGC 工作台] + 步骤面包屑 (1.创意生成→2.音画配置→3.成片交付) + 租户信息/额度
- **Sidebar**: 极简双Tab [🗂️ 资产素材库] [⚡ 自动化产线]

### Tab 1: 资产管理模块
- 拖拽批量上传 .mp4/.png
- 上传后静默轮询 AMS，列表展示"打标中" Loading
- Asset_ID + 标签到位后，支持手动增删改标签（全屏爆金、黄金龙等）

### Step 1: 创意控制台 (创意脑暴)
- 左侧30%: 任务配置区
  - 目标人群 (下拉: 大R/下沉/羊毛党)
  - 参考文案 (Textarea, 选填)
  - 脑暴卖点 (Tag Input, 回车生成)
  - [🚀 脑暴4套创意方案] 按钮
- 右侧70%: AI 创意输出区
  - 骨架屏 → 4个脚本卡片 (文案 + visual_tag 胶囊标签)
  - 卡片可微调 (富文本)
  - 选中唯一卡片 → 高亮边框 + Badge + 悬浮 [下一步➡️]

### Step 2: 音画配置
- 已选剧本展示 (可展开修改)
- TTS 配音选择 (头像+名称+试听▶️, 单选)
- 字幕样式选择 (示例图片, 单选: 大字报/极简黑底/综艺花字)
- 预留: 数字人、水印卡槽
- [🎬 开始双路并行渲染成片] 按钮

### 渲染中 Loading 视图
- 沉浸式全屏 Loading
- 波浪形/发光进度条 (缓动)
- 动态文案3秒轮播: "正在分配云端算力..." → "正在为[全屏爆金]匹配最佳高光画面..." → "正在合成音频与字幕..." → "正在做最后的压制..."

### Step 3: 成片验收
- 并排展示2个HTML5播放器 (A: 节奏紧凑版, B: 画面丰富版)
- 操作组: [✅确认使用并下载.mp4] [📥导出剪辑工程.json]
- [🔄 打回上一步重新修改]
- 降级: B失败时自动隐藏，A居中展示

## API 契约

### API 1: AMS 资产入库与打标
- 入参: File (文件流/URL), KB_ID (租户隔离)
- 出参: Asset_ID, tags: string[] (如 ["深海", "爆金"])

### API 2: Agent 文案生成 (route: generate_copy)
- 入参: action_route: "generate_copy", audience, reference_copy, brainstorm_keywords
- 出参: 4个方案, 每个含 tts_text + visual_tag[]

### API 3: Agent 排轨生成 (route: generate_timeline)
- 入参: action_route: "generate_timeline", selected_script, tts_config
- 出参: 2份 Timeline JSON/XML + 2个 Task_ID

### API 4: 渲染引擎轮询
- 入参: Task_ID
- 出参: status (processing/completed/failed), video_url, project_file_url

## 容错与降级
1. **标签容错**: Agent 排轨时 visual_tag 查无素材 → 降级检索通用底图，禁止返回空时间轴
2. **渲染失败局部降级**: 2个任务1个 failed → 静默隐藏失败项，展示唯一成片
3. **接口超时熔断**: Agent 生成 Timeout 60s+，长轮询机制避免 504

## 开发节奏
- Phase 1: 前端框架 + 全部页面 + Mock API (可交互 Demo)
- Phase 2: 接后端真实 API
- Phase 3: 容错降级 + 生产加固
