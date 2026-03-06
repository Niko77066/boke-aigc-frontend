# 波克城市 AIGC 营销视频全链路产线开发计划

## 项目概述

基于 Vue 3 + TypeScript + Pinia + Element Plus + Tailwind CSS 构建的薄前端 + 厚中台 SaaS 工作流引擎。前端全局接管状态机，底层编排 4 大核心 API。

## 1. 项目结构

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.vue          # 全局头部
│   │   │   ├── AppSidebar.vue         # 全局侧边栏
│   │   │   └── AppLayout.vue          # 主布局组件
│   │   ├── upload/
│   │   │   ├── FileUploader.vue       # 拖拽上传组件
│   │   │   └── AssetCard.vue          # 资产卡片组件
│   │   ├── wizard/
│   │   │   ├── WizardNavigation.vue   # 步骤面包屑
│   │   │   ├── StepHeader.vue         # 步骤头部
│   │   │   └── StepActions.vue        # 步骤操作区
│   │   ├── creative/
│   │   │   ├── TaskConfigForm.vue     # 任务配置表单
│   │   │   ├── ScriptCard.vue         # 脚本卡片
│   │   │   ├── ScriptEditor.vue       # 脚本编辑器
│   │   │   └── CreativeOutput.vue     # 创意输出区
│   │   ├── config/
│   │   │   ├── ScriptPreview.vue      # 脚本预览
│   │   │   ├── TTSSelector.vue        # TTS配音选择
│   │   │   ├── SubtitleStyleSelector.vue # 字幕样式选择
│   │   │   └── AudioVideoConfig.vue   # 音画配置面板
│   │   ├── render/
│   │   │   ├── RenderLoading.vue      # 渲染Loading页面
│   │   │   ├── ProgressBar.vue        # 进度条组件
│   │   │   └── LoadingTexts.vue       # 动态文案轮播
│   │   ├── result/
│   │   │   ├── VideoPlayer.vue        # 视频播放器
│   │   │   ├── ResultActions.vue      # 结果操作区
│   │   │   └── VideoComparison.vue    # 双视频对比
│   │   └── common/
│   │       ├── Loading.vue            # 通用Loading
│   │       ├── TagInput.vue           # 标签输入组件
│   │       ├── TagDisplay.vue         # 标签展示组件
│   │       └── ErrorBoundary.vue      # 错误边界
│   ├── pages/
│   │   ├── AssetManagement.vue        # 资产管理页面
│   │   ├── CreativeConsole.vue        # 创意控制台
│   │   ├── AudioVideoConfig.vue       # 音画配置页面
│   │   ├── RenderProgress.vue         # 渲染进度页面
│   │   └── ResultDelivery.vue         # 成片交付页面
│   ├── stores/
│   │   ├── index.ts                   # Store入口
│   │   ├── asset.ts                   # 资产管理Store
│   │   ├── workflow.ts                # 工作流状态Store
│   │   ├── creative.ts                # 创意生成Store
│   │   ├── config.ts                  # 音画配置Store
│   │   ├── render.ts                  # 渲染状态Store
│   │   └── user.ts                    # 用户信息Store
│   ├── api/
│   │   ├── index.ts                   # API基础配置
│   │   ├── asset.ts                   # 资产管理API
│   │   ├── agent.ts                   # Agent API
│   │   ├── render.ts                  # 渲染引擎API
│   │   └── mock/
│   │       ├── asset.ts               # 资产管理Mock API
│   │       ├── agent.ts               # Agent Mock API
│   │       ├── render.ts              # 渲染Mock API
│   │       └── data.ts                # Mock数据
│   ├── types/
│   │   └── index.ts                   # 全局类型定义
│   ├── router/
│   │   └── index.ts                   # 路由配置
│   ├── utils/
│   │   ├── request.ts                 # HTTP请求封装
│   │   ├── upload.ts                  # 上传工具
│   │   ├── validation.ts              # 表单验证
│   │   ├── constants.ts               # 常量定义
│   │   └── helpers.ts                 # 辅助函数
│   ├── styles/
│   │   ├── main.css                   # 主样式文件
│   │   ├── tailwind.css               # Tailwind CSS
│   │   └── components.css             # 组件样式
│   ├── App.vue                        # 根组件
│   └── main.ts                        # 入口文件
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 2. 组件详细设计

### 2.1 布局组件

#### AppLayout.vue
- **功能**: 应用主布局容器
- **Props**: 无
- **Emits**: 无
- **State**: 响应式布局状态
- **子组件**: AppHeader, AppSidebar, router-view

#### AppHeader.vue
- **功能**: 全局头部导航
- **Props**:
  - `currentStep?: number` - 当前步骤
  - `totalSteps?: number` - 总步骤数
- **Emits**:
  - `stepChange: (step: number) => void`
- **功能**: Logo展示、步骤面包屑、租户信息、额度显示

#### AppSidebar.vue
- **功能**: 全局侧边栏
- **Props**:
  - `collapsed?: boolean` - 是否折叠
- **Emits**:
  - `tabChange: (tab: 'assets' | 'workflow') => void`
- **功能**: 双Tab切换 [资产素材库] [自动化产线]

### 2.2 上传组件

#### FileUploader.vue
- **功能**: 拖拽批量上传组件
- **Props**:
  - `accept: string[]` - 接受的文件类型 ['.mp4', '.png']
  - `multiple: boolean` - 是否多选
  - `maxSize?: number` - 最大文件大小
- **Emits**:
  - `upload: (files: File[]) => void`
  - `error: (error: string) => void`
- **功能**: 文件拖拽、格式验证、大小限制、上传进度

#### AssetCard.vue
- **功能**: 资产卡片展示
- **Props**:
  - `asset: Asset` - 资产对象
  - `loading?: boolean` - 是否加载中
- **Emits**:
  - `tagUpdate: (assetId: string, tags: string[]) => void`
  - `delete: (assetId: string) => void`
- **功能**: 资产预览、标签编辑、删除操作

### 2.3 工作流组件

#### WizardNavigation.vue
- **功能**: 步骤面包屑导航
- **Props**:
  - `steps: WizardStep[]` - 步骤数组
  - `currentStep: number` - 当前步骤
- **Emits**:
  - `stepClick: (step: number) => void`
- **功能**: 步骤指示、进度显示、点击跳转

#### TaskConfigForm.vue
- **功能**: 任务配置表单
- **Props**:
  - `config?: TaskConfig` - 初始配置
- **Emits**:
  - `submit: (config: TaskConfig) => void`
  - `change: (config: Partial<TaskConfig>) => void`
- **功能**: 目标人群选择、参考文案输入、脑暴卖点Tag输入

#### ScriptCard.vue
- **功能**: 脚本卡片组件
- **Props**:
  - `script: Script` - 脚本对象
  - `selected?: boolean` - 是否选中
  - `editable?: boolean` - 是否可编辑
- **Emits**:
  - `select: (scriptId: string) => void`
  - `edit: (script: Script) => void`
- **功能**: 脚本预览、选择、编辑入口

#### ScriptEditor.vue
- **功能**: 富文本脚本编辑器
- **Props**:
  - `script: Script` - 脚本对象
  - `readonly?: boolean` - 是否只读
- **Emits**:
  - `save: (script: Script) => void`
  - `cancel: () => void`
- **功能**: 富文本编辑、实时预览、保存取消

### 2.4 配置组件

#### TTSSelector.vue
- **功能**: TTS配音选择组件
- **Props**:
  - `voices: TTSVoice[]` - 可用语音列表
  - `selected?: string` - 选中的语音ID
- **Emits**:
  - `select: (voiceId: string) => void`
  - `preview: (voiceId: string) => void`
- **功能**: 语音头像展示、试听播放、单选切换

#### SubtitleStyleSelector.vue
- **功能**: 字幕样式选择
- **Props**:
  - `styles: SubtitleStyle[]` - 可用样式列表
  - `selected?: string` - 选中的样式ID
- **Emits**:
  - `select: (styleId: string) => void`
- **功能**: 样式预览图、单选切换

### 2.5 渲染组件

#### RenderLoading.vue
- **功能**: 沉浸式渲染Loading页面
- **Props**:
  - `progress: number` - 渲染进度 0-100
  - `stage: RenderStage` - 当前渲染阶段
- **Emits**: 无
- **功能**: 全屏Loading、波浪进度条、动态文案轮播

#### VideoPlayer.vue
- **功能**: HTML5视频播放器封装
- **Props**:
  - `src: string` - 视频源
  - `title?: string` - 视频标题
  - `poster?: string` - 封面图
  - `controls?: boolean` - 是否显示控制栏
- **Emits**:
  - `play: () => void`
  - `pause: () => void`
  - `ended: () => void`
- **功能**: 视频播放、控制栏、事件监听

## 3. Pinia Store 设计

### 3.1 AssetStore (asset.ts)

#### State
```typescript
interface AssetState {
  assets: Asset[]              // 资产列表
  loading: boolean             // 列表加载状态
  uploading: boolean           // 上传状态
  uploadProgress: number       // 上传进度
  filter: AssetFilter         // 筛选条件
  selectedAssets: string[]     // 选中的资产IDs
}
```

#### Getters
```typescript
const getters = {
  filteredAssets: (state) => Asset[]     // 筛选后的资产列表
  assetById: (state) => (id: string) => Asset | undefined
  uploadingAssets: (state) => Asset[]    // 上传中的资产
  taggedAssets: (state) => Asset[]       // 已打标的资产
}
```

#### Actions
```typescript
const actions = {
  fetchAssets(): Promise<void>                    // 获取资产列表
  uploadFiles(files: File[]): Promise<void>       // 批量上传文件
  updateAssetTags(id: string, tags: string[]): Promise<void>  // 更新资产标签
  deleteAsset(id: string): Promise<void>          // 删除资产
  pollAssetStatus(id: string): Promise<void>      // 轮询资产状态
  setFilter(filter: Partial<AssetFilter>): void   // 设置筛选条件
  selectAsset(id: string): void                   // 选择资产
  selectAllAssets(): void                         // 全选资产
  clearSelection(): void                          // 清空选择
}
```

### 3.2 WorkflowStore (workflow.ts)

#### State
```typescript
interface WorkflowState {
  currentStep: WizardStep          // 当前步骤
  steps: WizardStep[]              // 所有步骤
  canProceed: boolean              // 是否可以进入下一步
  canGoBack: boolean               // 是否可以返回上一步
  workflowData: WorkflowData       // 工作流数据
  history: WorkflowSnapshot[]      // 历史快照
}
```

#### Actions
```typescript
const actions = {
  nextStep(): void                           // 下一步
  prevStep(): void                           // 上一步
  goToStep(step: WizardStep): void          // 跳转到指定步骤
  updateWorkflowData(data: Partial<WorkflowData>): void  // 更新工作流数据
  saveSnapshot(): void                       // 保存快照
  restoreSnapshot(index: number): void       // 恢复快照
  resetWorkflow(): void                      // 重置工作流
  validateStep(step: WizardStep): boolean    // 验证步骤是否完成
}
```

### 3.3 CreativeStore (creative.ts)

#### State
```typescript
interface CreativeState {
  taskConfig: TaskConfig | null     // 任务配置
  scripts: Script[]                 // 生成的脚本列表
  selectedScript: Script | null     // 选中的脚本
  generating: boolean               // 是否正在生成
  generationProgress: number        // 生成进度
  error: string | null              // 错误信息
}
```

#### Actions
```typescript
const actions = {
  updateTaskConfig(config: Partial<TaskConfig>): void    // 更新任务配置
  generateScripts(): Promise<void>                       // 生成脚本
  selectScript(scriptId: string): void                   // 选择脚本
  updateScript(script: Script): Promise<void>            // 更新脚本
  resetCreative(): void                                  // 重置创意状态
}
```

### 3.4 ConfigStore (config.ts)

#### State
```typescript
interface ConfigState {
  ttsVoices: TTSVoice[]             // 可用语音列表
  selectedVoice: TTSVoice | null    // 选中的语音
  subtitleStyles: SubtitleStyle[]   // 可用字幕样式
  selectedStyle: SubtitleStyle | null // 选中的字幕样式
  audioConfig: AudioConfig          // 音频配置
  videoConfig: VideoConfig          // 视频配置
  previewAudio: string | null       // 预览音频URL
}
```

#### Actions
```typescript
const actions = {
  fetchTTSVoices(): Promise<void>                        // 获取TTS语音
  selectVoice(voiceId: string): void                     // 选择语音
  previewVoice(voiceId: string, text: string): Promise<void>  // 预览语音
  selectSubtitleStyle(styleId: string): void             // 选择字幕样式
  updateAudioConfig(config: Partial<AudioConfig>): void  // 更新音频配置
  updateVideoConfig(config: Partial<VideoConfig>): void  // 更新视频配置
  resetConfig(): void                                    // 重置配置
}
```

### 3.5 RenderStore (render.ts)

#### State
```typescript
interface RenderState {
  renderTasks: RenderTask[]         // 渲染任务列表
  currentStage: RenderStage         // 当前渲染阶段
  progress: number                  // 总体进度
  results: RenderResult[]           // 渲染结果
  polling: boolean                  // 是否正在轮询
  error: string | null              // 错误信息
}
```

#### Actions
```typescript
const actions = {
  startRender(config: RenderConfig): Promise<void>       // 开始渲染
  pollRenderStatus(): Promise<void>                      // 轮询渲染状态
  stopPolling(): void                                    // 停止轮询
  downloadVideo(taskId: string): Promise<void>           // 下载视频
  downloadProject(taskId: string): Promise<void>         // 下载工程文件
  retryRender(taskId: string): Promise<void>             // 重试渲染
  resetRender(): void                                    // 重置渲染状态
}
```

## 4. API 契约与 Mock 设计

### 4.1 AMS 资产管理 API

#### 上传资产
```typescript
// POST /api/assets/upload
interface UploadAssetRequest {
  file: File | string  // 文件流或URL
  kb_id: string        // 租户隔离ID
}

interface UploadAssetResponse {
  asset_id: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  tags?: string[]      // 打标完成后返回
}
```

#### 获取资产列表
```typescript
// GET /api/assets
interface GetAssetsRequest {
  kb_id: string
  page?: number
  size?: number
  tags?: string[]
  type?: 'video' | 'image'
}

interface GetAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  size: number
}
```

#### 更新资产标签
```typescript
// PATCH /api/assets/{asset_id}/tags
interface UpdateTagsRequest {
  tags: string[]
}

interface UpdateTagsResponse {
  asset_id: string
  tags: string[]
  updated_at: string
}
```

### 4.2 Agent 文案生成 API

#### 生成创意文案
```typescript
// POST /api/agent/generate
interface GenerateCopyRequest {
  action_route: 'generate_copy'
  audience: 'premium' | 'sinking' | 'budget'    // 大R/下沉/羊毛党
  reference_copy?: string                        // 参考文案(选填)
  brainstorm_keywords: string[]                  // 脑暴卖点
  kb_id: string                                 // 租户ID
}

interface GenerateCopyResponse {
  request_id: string
  scripts: Script[]  // 4个方案
}

interface Script {
  id: string
  tts_text: string         // TTS播报文案
  visual_tags: string[]    // 视觉标签数组
  title: string            // 方案标题
  description?: string     // 方案描述
}
```

### 4.3 Agent 排轨生成 API

#### 生成时间轴
```typescript
// POST /api/agent/generate
interface GenerateTimelineRequest {
  action_route: 'generate_timeline'
  selected_script: Script
  tts_config: {
    voice_id: string
    speed?: number
    volume?: number
  }
  subtitle_config: {
    style_id: string
    position?: 'bottom' | 'center' | 'top'
  }
  kb_id: string
}

interface GenerateTimelineResponse {
  request_id: string
  timelines: Timeline[]    // 2份时间轴
  task_ids: string[]       // 2个渲染任务ID
}

interface Timeline {
  id: string
  type: 'compact' | 'rich'  // 节奏紧凑版 / 画面丰富版
  duration: number
  tracks: Track[]
  metadata: {
    title: string
    description: string
  }
}
```

### 4.4 渲染引擎轮询 API

#### 轮询渲染状态
```typescript
// GET /api/render/status/{task_id}
interface RenderStatusResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number        // 0-100
  stage: RenderStage
  video_url?: string      // 完成后返回
  project_file_url?: string // 工程文件URL
  error?: string          // 失败时错误信息
  estimated_time?: number // 预估剩余时间(秒)
}

type RenderStage =
  | 'initializing'        // 初始化
  | 'allocating_resources' // 分配算力
  | 'processing_assets'    // 处理素材
  | 'generating_audio'     // 生成音频
  | 'compositing'          // 合成视频
  | 'encoding'            // 编码压制
  | 'uploading'           // 上传CDN
```

## 5. Vue Router 配置

### 5.1 路由结构
```typescript
const routes = [
  {
    path: '/',
    redirect: '/workflow/creative'
  },
  {
    path: '/assets',
    name: 'AssetManagement',
    component: () => import('@/pages/AssetManagement.vue'),
    meta: {
      title: '资产管理',
      requiresAuth: true
    }
  },
  {
    path: '/workflow',
    name: 'Workflow',
    component: () => import('@/pages/WorkflowLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'creative',
        name: 'CreativeConsole',
        component: () => import('@/pages/CreativeConsole.vue'),
        meta: {
          title: '创意控制台',
          step: 1,
          stepName: '创意生成'
        }
      },
      {
        path: 'config',
        name: 'AudioVideoConfig',
        component: () => import('@/pages/AudioVideoConfig.vue'),
        meta: {
          title: '音画配置',
          step: 2,
          stepName: '音画配置'
        },
        beforeEnter: (to, from, next) => {
          // 检查是否已选择脚本
          const creativeStore = useCreativeStore()
          if (!creativeStore.selectedScript) {
            next({ name: 'CreativeConsole' })
            return
          }
          next()
        }
      },
      {
        path: 'render',
        name: 'RenderProgress',
        component: () => import('@/pages/RenderProgress.vue'),
        meta: {
          title: '渲染进度',
          step: 3,
          stepName: '渲染进行中'
        },
        beforeEnter: (to, from, next) => {
          // 检查是否已完成配置
          const configStore = useConfigStore()
          if (!configStore.selectedVoice || !configStore.selectedStyle) {
            next({ name: 'AudioVideoConfig' })
            return
          }
          next()
        }
      },
      {
        path: 'result',
        name: 'ResultDelivery',
        component: () => import('@/pages/ResultDelivery.vue'),
        meta: {
          title: '成片交付',
          step: 4,
          stepName: '成片交付'
        },
        beforeEnter: (to, from, next) => {
          // 检查是否有渲染结果
          const renderStore = useRenderStore()
          if (renderStore.results.length === 0) {
            next({ name: 'CreativeConsole' })
            return
          }
          next()
        }
      }
    ]
  }
]
```

### 5.2 路由守卫
```typescript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 1. 认证检查
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
    return
  }

  // 2. 工作流步骤检查
  if (to.meta.step) {
    const workflowStore = useWorkflowStore()
    const canAccess = workflowStore.canAccessStep(to.meta.step)

    if (!canAccess) {
      // 重定向到最近可访问的步骤
      const nearestStep = workflowStore.getNearestAccessibleStep()
      next({ name: nearestStep.name })
      return
    }
  }

  // 3. 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 波克城市 AIGC 工作台`
  }

  next()
})

// 全局后置钩子
router.afterEach((to) => {
  // 更新当前步骤
  if (to.meta.step) {
    const workflowStore = useWorkflowStore()
    workflowStore.setCurrentStep(to.meta.step)
  }
})
```

## 6. Mock API 实现策略

### 6.1 Mock 数据生成规则
```typescript
// Mock数据生成器
class MockDataGenerator {
  // 生成资产数据
  static generateAssets(count: number): Asset[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `asset_${i + 1}`,
      name: `素材_${i + 1}.mp4`,
      type: Math.random() > 0.5 ? 'video' : 'image',
      url: `https://mock-cdn.example.com/asset_${i + 1}`,
      thumbnail: `https://mock-cdn.example.com/thumb_${i + 1}.jpg`,
      tags: this.generateRandomTags(),
      status: this.randomStatus(),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      file_size: Math.floor(Math.random() * 50 * 1024 * 1024), // 0-50MB
      duration: Math.floor(Math.random() * 300) // 0-5分钟
    }))
  }

  // 生成创意脚本
  static generateScripts(): Script[] {
    const templates = [
      {
        title: '情感共鸣型',
        tts_text: '还在为金币不够而烦恼吗？波克城市新活动来袭，每日签到送千万金币！',
        visual_tags: ['金币雨', '签到界面', '激动表情']
      },
      {
        title: '直接利益型',
        tts_text: '限时福利！新用户注册立得1000万金币，更有神秘大奖等你来拿！',
        visual_tags: ['新手礼包', '金币爆炸', '大奖展示']
      },
      {
        title: '社交炫耀型',
        tts_text: '成为波克城市的传奇玩家！与好友一起征战，展示你的实力！',
        visual_tags: ['排行榜', '好友对战', '胜利庆祝']
      },
      {
        title: '紧迫感型',
        tts_text: '错过就没了！波克城市限时活动仅剩3天，百万金币免费领！',
        visual_tags: ['倒计时', '限时标签', '紧急提醒']
      }
    ]

    return templates.map((template, index) => ({
      id: `script_${index + 1}`,
      ...template,
      description: `基于${template.title}策略生成的营销文案`
    }))
  }
}
```

### 6.2 渐进式延时模拟
```typescript
// 模拟真实API延时和状态变化
class MockAPISimulator {
  // 模拟文案生成过程
  static async simulateScriptGeneration(): Promise<Script[]> {
    // 模拟AI思考过程，分阶段返回
    await this.delay(1000) // 分析需求
    await this.delay(2000) // 生成创意
    await this.delay(1500) // 优化文案

    return MockDataGenerator.generateScripts()
  }

  // 模拟渲染进度
  static async simulateRenderProgress(
    taskId: string,
    onProgress: (progress: number, stage: RenderStage) => void
  ): Promise<RenderResult> {
    const stages: { stage: RenderStage; duration: number; progress: number }[] = [
      { stage: 'initializing', duration: 2000, progress: 10 },
      { stage: 'allocating_resources', duration: 3000, progress: 25 },
      { stage: 'processing_assets', duration: 5000, progress: 50 },
      { stage: 'generating_audio', duration: 4000, progress: 70 },
      { stage: 'compositing', duration: 6000, progress: 90 },
      { stage: 'encoding', duration: 3000, progress: 95 },
      { stage: 'uploading', duration: 2000, progress: 100 }
    ]

    for (const { stage, duration, progress } of stages) {
      onProgress(progress, stage)
      await this.delay(duration)
    }

    return {
      task_id: taskId,
      status: 'completed',
      video_url: `https://mock-cdn.example.com/result_${taskId}.mp4`,
      project_file_url: `https://mock-cdn.example.com/project_${taskId}.json`,
      duration: 30,
      file_size: 15 * 1024 * 1024 // 15MB
    }
  }
}
```

## 7. 实现顺序计划

### Phase 1: 项目基础架构 (第1-2天)

#### Day 1: 项目初始化
1. **创建项目基础结构**
   - 使用 Vue CLI 或 Vite 创建项目
   - 配置 TypeScript、Tailwind CSS、Element Plus
   - 设置 ESLint、Prettier 代码规范
   - 配置 Git hooks

2. **建立开发环境**
   - 配置 Vite 开发服务器
   - 设置环境变量管理 (.env 文件)
   - 配置路径别名 (@/ 指向 src/)
   - 安装必要的开发依赖

3. **创建基础文件结构**
   - 创建所有目录结构
   - 建立基础的 TypeScript 类型定义
   - 配置 Pinia store 基础结构
   - 设置 Vue Router 基础配置

#### Day 2: 全局布局与路由
1. **实现布局组件**
   - AppLayout.vue - 主布局容器
   - AppHeader.vue - 全局头部 (Logo + 面包屑 + 用户信息)
   - AppSidebar.vue - 侧边栏 (双Tab切换)
   - 响应式布局适配

2. **配置路由系统**
   - 设置所有路由路径和组件映射
   - 实现路由守卫 (权限检查、步骤验证)
   - 配置路由懒加载
   - 设置页面标题动态更新

3. **创建页面骨架**
   - 创建5个主要页面的基础结构 (不含具体功能)
   - 确保路由跳转正常工作
   - 实现基础的页面切换动画

### Phase 2: 核心功能组件开发 (第3-7天)

#### Day 3: 资产管理模块
1. **文件上传功能**
   - FileUploader.vue - 实现拖拽上传
   - 文件格式验证 (.mp4, .png)
   - 文件大小限制和进度显示
   - 多文件批量上传

2. **资产展示与管理**
   - AssetCard.vue - 资产卡片展示
   - 网格布局和虚拟滚动优化
   - 缩略图预览和元数据显示
   - 加载状态和错误处理

3. **标签管理功能**
   - TagInput.vue 和 TagDisplay.vue
   - 标签的增删改查
   - 标签筛选和搜索
   - 预设标签快速选择

#### Day 4: 创意控制台 (Step 1)
1. **任务配置表单**
   - TaskConfigForm.vue - 配置表单
   - 目标人群下拉选择器
   - 参考文案多行文本输入
   - 脑暴卖点标签输入 (支持回车添加)
   - 表单验证和数据绑定

2. **AI创意输出区域**
   - CreativeOutput.vue - 创意输出容器
   - 骨架屏加载动画
   - ScriptCard.vue - 脚本卡片组件
   - 4个方案的网格布局

3. **脚本编辑功能**
   - ScriptEditor.vue - 富文本编辑器
   - 脚本预览和实时编辑
   - 选择状态管理和高亮显示
   - "下一步"按钮的条件显示

#### Day 5: 音画配置页面 (Step 2)
1. **脚本预览组件**
   - 已选脚本的展示和展开/收起
   - 支持返回修改和重新编辑
   - 脚本内容的格式化显示

2. **TTS配音选择器**
   - TTSSelector.vue - 语音选择组件
   - 语音头像和名称展示
   - 试听功能 (播放控制)
   - 单选状态管理

3. **字幕样式选择器**
   - SubtitleStyleSelector.vue
   - 样式预览图展示
   - 三种样式：大字报/极简黑底/综艺花字
   - 选择状态和预览效果

4. **配置完成与提交**
   - 配置验证和完整性检查
   - "开始渲染"按钮状态管理
   - 配置数据的持久化

#### Day 6: 渲染进度页面 (Step 3)
1. **沉浸式Loading设计**
   - RenderLoading.vue - 全屏Loading页面
   - 波浪形/发光进度条动画
   - 渐变背景和视觉效果

2. **动态进度展示**
   - ProgressBar.vue - 进度条组件
   - LoadingTexts.vue - 文案轮播组件
   - 7个渲染阶段的文案切换 (3秒间隔)
   - 进度百分比和预估时间

3. **渲染状态管理**
   - 轮询机制实现
   - 错误处理和重试逻辑
   - 渲染失败的降级处理

#### Day 7: 成片交付页面 (Step 4)
1. **双视频播放器**
   - VideoPlayer.vue - HTML5播放器封装
   - VideoComparison.vue - 双视频对比布局
   - A版本(节奏紧凑) / B版本(画面丰富)
   - 播放控制和同步功能

2. **操作按钮组**
   - ResultActions.vue - 操作按钮容器
   - 下载MP4、导出工程文件
   - 重新制作功能
   - 按钮状态和权限控制

3. **异常降级处理**
   - B版本失败时的UI降级
   - A版本居中展示
   - 错误信息提示

### Phase 3: 状态管理与API集成 (第8-10天)

#### Day 8: Pinia Store 实现
1. **AssetStore 实现**
   - 资产列表状态管理
   - 上传、删除、标签更新
   - 筛选和搜索状态
   - 轮询状态更新

2. **WorkflowStore 实现**
   - 步骤流转状态管理
   - 工作流数据持久化
   - 历史快照功能
   - 步骤验证逻辑

3. **CreativeStore 实现**
   - 任务配置状态
   - 脚本生成和编辑状态
   - 选择状态管理
   - 生成进度追踪

#### Day 9: 配置与渲染Store
1. **ConfigStore 实现**
   - TTS语音和字幕样式状态
   - 音视频配置管理
   - 预览功能状态
   - 配置验证逻辑

2. **RenderStore 实现**
   - 渲染任务状态管理
   - 轮询机制实现
   - 进度和阶段更新
   - 结果数据管理

3. **Store 集成测试**
   - 各Store间的数据流测试
   - 状态同步验证
   - 错误处理测试

#### Day 10: Mock API 实现
1. **完整Mock API系统**
   - 4个核心API的Mock实现
   - 真实延时和状态变化模拟
   - Mock数据生成器
   - 错误场景模拟

2. **API集成调试**
   - 前端与Mock API的完整集成
   - 请求/响应数据验证
   - 错误处理和重试机制
   - 轮询机制优化

### Phase 4: 优化与测试 (第11-12天)

#### Day 11: UI优化与交互完善
1. **交互动画优化**
   - 页面切换动画
   - 组件过渡效果
   - Loading动画优化
   - 微交互细节

2. **响应式适配**
   - 移动端适配
   - 不同屏幕尺寸测试
   - 组件响应式调整
   - 布局断点优化

3. **性能优化**
   - 组件懒加载
   - 图片懒加载和压缩
   - 长列表虚拟滚动
   - 请求防抖和节流

#### Day 12: 测试与文档
1. **功能测试**
   - 端到端流程测试
   - 错误场景测试
   - 边界条件测试
   - 浏览器兼容性测试

2. **代码质量检查**
   - ESLint规则检查
   - TypeScript类型检查
   - 代码格式化统一
   - 组件Props验证

3. **文档编写**
   - README.md 项目说明
   - 组件使用文档
   - API接口文档
   - 部署说明文档

## 8. 关键技术点

### 8.1 文件上传优化
- 使用 FormData 和 XMLHttpRequest 实现进度监听
- 支持断点续传和分片上传 (大文件)
- 图片压缩和格式转换
- 上传队列管理和并发控制

### 8.2 状态持久化
- 使用 localStorage 保存工作流状态
- 页面刷新时恢复工作进度
- 敏感数据的安全存储
- 状态版本管理和迁移

### 8.3 实时轮询优化
- 指数退避算法避免频繁请求
- 页面可见性API优化资源使用
- WebSocket连接作为备选方案
- 轮询任务的生命周期管理

### 8.4 错误处理策略
- 全局错误捕获和上报
- 网络请求失败的重试机制
- 用户友好的错误提示
- 降级方案和兜底逻辑

### 8.5 性能优化策略
- Tree-shaking 减少打包体积
- 代码分割和按需加载
- CDN资源加速和缓存
- Service Worker离线缓存

## 9. 部署与发布

### 9.1 构建配置
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          utils: ['axios', 'dayjs']
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

### 9.2 环境配置
```bash
# .env.development
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_API=true

# .env.production
NODE_ENV=production
VITE_API_BASE_URL=https://api.boke-aigc.com
VITE_MOCK_API=false
```

## 10. 开发规范

### 10.1 代码规范
- 使用 TypeScript 严格模式
- 遵循 Vue 3 Composition API 最佳实践
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case
- 常量使用 UPPER_SNAKE_CASE

### 10.2 Git 工作流
- 主分支：main (受保护)
- 开发分支：develop
- 特性分支：feature/功能名称
- 修复分支：hotfix/问题描述
- 提交信息遵循 Conventional Commits

### 10.3 代码审查标准
- 所有PR必须经过代码审查
- 自动化测试必须通过
- TypeScript类型检查无错误
- ESLint规则检查通过
- 性能影响评估

---

此开发计划为波克城市AIGC营销视频全链路产线前端实现提供了详尽的技术指导，覆盖了从项目初始化到生产部署的完整流程。计划中的每个组件、Store、API都有明确的职责定义和实现细节，确保开发团队能够高效协作，按期交付高质量的产品。