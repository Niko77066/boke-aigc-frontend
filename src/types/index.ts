// 全局类型定义

// 基础类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 用户相关类型
export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'user'
  created_at: string
}

// 资产管理类型
export interface Asset {
  id: string
  name: string
  type: 'video' | 'image'
  url: string
  thumbnail: string
  tags: string[]
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  file_size: number
  duration?: number // 视频时长(秒)
  width?: number
  height?: number
  kb_id: string
}

export interface AssetFilter {
  type?: 'video' | 'image' | 'all'
  tags?: string[]
  status?: Asset['status']
  search?: string
}

// 工作流类型
export type WizardStep = 'creative' | 'config' | 'render' | 'result'

export interface WizardStepConfig {
  step: WizardStep
  name: string
  title: string
  description: string
  completed: boolean
  canAccess: boolean
}

export interface WorkflowData {
  taskConfig?: TaskConfig
  selectedScript?: Script
  audioConfig?: AudioConfig
  videoConfig?: VideoConfig
  renderTasks?: RenderTask[]
  results?: RenderResult[]
}

export interface WorkflowSnapshot {
  id: string
  step: WizardStep
  data: WorkflowData
  timestamp: string
}

// 创意生成类型
export interface TaskConfig {
  audience: 'premium' | 'sinking' | 'budget' // 大R用户 | 下沉市场 | 羊毛党
  reference_copy?: string // 参考文案
  brainstorm_keywords: string[] // 脑暴卖点
  kb_id: string
}

export interface Script {
  id: string
  title: string
  description?: string
  tts_text: string // TTS播报文案
  visual_tags: string[] // 视觉标签数组
  created_at: string
}

// 音画配置类型
export interface TTSVoice {
  id: string
  name: string
  gender: 'male' | 'female'
  age: 'young' | 'middle' | 'old'
  style: 'natural' | 'energetic' | 'calm' | 'professional'
  avatar: string
  preview_url?: string
  language: 'zh-CN' | 'en-US'
}

export interface SubtitleStyle {
  id: string
  name: string
  description: string
  preview_image: string
  config: {
    font_family: string
    font_size: number
    font_color: string
    background_color?: string
    border_color?: string
    position: 'bottom' | 'center' | 'top'
    animation?: 'none' | 'fade' | 'slide' | 'typewriter'
  }
}

export interface AudioConfig {
  voice_id: string
  speed: number // 0.5 - 2.0
  volume: number // 0.0 - 1.0
  pitch: number // -12 - 12
  pause_duration: number // 句间停顿时长(毫秒)
}

export interface VideoConfig {
  subtitle_style_id: string
  subtitle_position: 'bottom' | 'center' | 'top'
  background_music?: string
  background_music_volume: number // 0.0 - 1.0
  video_quality: 'low' | 'medium' | 'high' | 'ultra'
  resolution: '720p' | '1080p' | '4k'
  frame_rate: 24 | 30 | 60
}

// 时间轴和轨道类型
export interface Timeline {
  id: string
  type: 'compact' | 'rich' // 节奏紧凑版 | 画面丰富版
  duration: number
  tracks: Track[]
  metadata: {
    title: string
    description: string
  }
}

export interface Track {
  id: string
  type: 'video' | 'audio' | 'subtitle' | 'effect'
  start_time: number
  end_time: number
  duration: number
  properties: Record<string, unknown>
  assets?: Asset[]
}

// 渲染相关类型
export type RenderStage =
  | 'initializing'
  | 'allocating_resources'
  | 'processing_assets'
  | 'generating_audio'
  | 'compositing'
  | 'encoding'
  | 'uploading'

export interface RenderTask {
  id: string
  timeline_id: string
  timeline_type: 'compact' | 'rich'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  stage: RenderStage
  estimated_time?: number // 预估剩余时间(秒)
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface RenderResult {
  task_id: string
  timeline_type: 'compact' | 'rich'
  status: 'completed' | 'failed'
  video_url?: string
  project_file_url?: string
  thumbnail_url?: string
  duration: number
  file_size: number
  created_at: string
}

export interface RenderConfig {
  selected_script: Script
  tts_config: AudioConfig
  subtitle_config: VideoConfig
  kb_id: string
}

// API 请求/响应类型
export interface UploadAssetRequest {
  file: File
  kb_id: string
}

export interface UploadAssetResponse {
  asset_id: string
  status: Asset['status']
  tags?: string[]
}

export interface GetAssetsRequest {
  kb_id: string
  page?: number
  size?: number
  tags?: string[]
  type?: 'video' | 'image'
}

export interface GetAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  size: number
}

export interface UpdateTagsRequest {
  tags: string[]
}

export interface UpdateTagsResponse {
  asset_id: string
  tags: string[]
  updated_at: string
}

export interface GenerateCopyRequest {
  action_route: 'generate_copy'
  audience: TaskConfig['audience']
  reference_copy?: string
  brainstorm_keywords: string[]
  kb_id: string
}

export interface GenerateCopyResponse {
  request_id: string
  scripts: Script[]
}

export interface GenerateTimelineRequest {
  action_route: 'generate_timeline'
  selected_script: Script
  tts_config: AudioConfig
  subtitle_config: VideoConfig
  kb_id: string
}

export interface GenerateTimelineResponse {
  request_id: string
  timelines: Timeline[]
  task_ids: string[]
}

export interface RenderStatusResponse {
  task_id: string
  status: RenderTask['status']
  progress: number
  stage: RenderStage
  video_url?: string
  project_file_url?: string
  error?: string
  estimated_time?: number
}

// 组件Props类型
export interface FileUploaderProps {
  accept: string[]
  multiple: boolean
  maxSize?: number
}

export interface AssetCardProps {
  asset: Asset
  loading?: boolean
  selected?: boolean
}

export interface WizardNavigationProps {
  steps: WizardStepConfig[]
  currentStep: WizardStep
}

export interface TaskConfigFormProps {
  config?: Partial<TaskConfig>
}

export interface ScriptCardProps {
  script: Script
  selected?: boolean
  editable?: boolean
}

export interface TTSSelectorProps {
  voices: TTSVoice[]
  selected?: string
}

export interface SubtitleStyleSelectorProps {
  styles: SubtitleStyle[]
  selected?: string
}

export interface RenderLoadingProps {
  progress: number
  stage: RenderStage
}

export interface VideoPlayerProps {
  src: string
  title?: string
  poster?: string
  controls?: boolean
}

export interface ProgressBarProps {
  progress: number
  showPercentage?: boolean
  color?: string
}

export interface TagInputProps {
  tags: string[]
  placeholder?: string
  maxTags?: number
}

export interface TagDisplayProps {
  tags: string[]
  editable?: boolean
  maxDisplay?: number
}

// Store状态类型
export interface AssetState {
  assets: Asset[]
  loading: boolean
  uploading: boolean
  uploadProgress: number
  filter: AssetFilter
  selectedAssets: string[]
  total: number
  page: number
  size: number
}

export interface WorkflowState {
  currentStep: WizardStep
  steps: WizardStepConfig[]
  workflowData: WorkflowData
  history: WorkflowSnapshot[]
}

export interface CreativeState {
  taskConfig: TaskConfig | null
  scripts: Script[]
  selectedScript: Script | null
  generating: boolean
  generationProgress: number
  error: string | null
}

export interface ConfigState {
  ttsVoices: TTSVoice[]
  selectedVoice: TTSVoice | null
  subtitleStyles: SubtitleStyle[]
  selectedStyle: SubtitleStyle | null
  audioConfig: AudioConfig
  videoConfig: VideoConfig
  previewAudio: string | null
}

export interface RenderState {
  renderTasks: RenderTask[]
  currentStage: RenderStage
  progress: number
  results: RenderResult[]
  polling: boolean
  error: string | null
}

export interface UserState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  permissions: string[]
}

// 工具函数类型
export interface UploadOptions {
  onProgress?: (progress: number) => void
  onSuccess?: (response: unknown) => void
  onError?: (error: string) => void
}

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  message: string
}

export interface FormValidation {
  [key: string]: ValidationRule[]
}

// 常量类型
export interface AppConstants {
  MAX_FILE_SIZE: number
  SUPPORTED_VIDEO_FORMATS: string[]
  SUPPORTED_IMAGE_FORMATS: string[]
  API_BASE_URL: string
  CDN_BASE_URL: string
  POLLING_INTERVAL: number
  MAX_RETRY_COUNT: number
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: unknown
  timestamp: string
}

export interface NetworkError extends AppError {
  status: number
  statusText: string
  url: string
}

export interface ValidationError extends AppError {
  field: string
  value: unknown
}

// 事件类型
export interface FileUploadEvent {
  files: File[]
  total: number
}

export interface AssetSelectEvent {
  assetId: string
  selected: boolean
}

export interface ScriptSelectEvent {
  scriptId: string
  script: Script
}

export interface RenderProgressEvent {
  taskId: string
  progress: number
  stage: RenderStage
}

export interface VideoPlayEvent {
  taskId: string
  currentTime: number
  duration: number
}

// 辅助类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type NonNullable<T> = T extends null | undefined ? never : T

// 联合类型
export type AssetType = Asset['type']
export type AssetStatus = Asset['status']
export type UserRole = User['role']
export type AudienceType = TaskConfig['audience']
export type RenderStatus = RenderTask['status']
export type TimelineType = Timeline['type']

// 映射类型
export type AssetIdMap = Record<string, Asset>
export type ScriptIdMap = Record<string, Script>
export type RenderTaskMap = Record<string, RenderTask>

// 函数类型
export type AsyncAction<T = void> = () => Promise<T>
export type EventHandler<T = unknown> = (event: T) => void
export type Validator<T> = (value: T) => boolean | string
export type Transformer<T, U> = (input: T) => U

// 组件类型
export type ComponentSize = 'small' | 'default' | 'large'
export type ComponentType = 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type ComponentStatus = 'normal' | 'loading' | 'disabled' | 'error'

// 布局类型
export type LayoutMode = 'sidebar' | 'top' | 'mix'
export type ThemeMode = 'light' | 'dark'
export type DeviceType = 'desktop' | 'tablet' | 'mobile'

// 新增常量相关类型
export interface Audience {
  id: string;
  name: string;
  description: string;
}

export interface LoadingMessage {
  stage: RenderStage;
  text: string;
}

// 导出默认值
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_UPLOAD_MAX_SIZE = 100 * 1024 * 1024 // 100MB
export const DEFAULT_POLLING_INTERVAL = 3000 // 3秒
export const DEFAULT_RETRY_COUNT = 3