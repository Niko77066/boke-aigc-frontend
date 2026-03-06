import type { Audience, LoadingMessage, TTSVoice, SubtitleStyle, RenderStage } from '@/types'

export const APP_TITLE = '波克城市 AIGC 工作台'

export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
export const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi']
export const SUPPORTED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.webp']
export const POLLING_INTERVAL = 3000
export const MAX_RETRY_COUNT = 3
export const KB_ID = 'kb_boke_fishing_001'

export const AUDIENCES: Audience[] = [
  { id: 'premium', name: '大R玩家', description: '高付费意愿、追求品质体验的核心用户' },
  { id: 'sinking', name: '下沉市场', description: '三四线城市、追求性价比的休闲玩家' },
  { id: 'budget', name: '羊毛党', description: '追求免费福利、活跃度高的价格敏感用户' },
]

export const TTS_VOICES: TTSVoice[] = [
  {
    id: 'voice_energetic_male',
    name: '活力男声',
    gender: 'male',
    age: 'young',
    style: 'energetic',
    avatar: '🧑',
    language: 'zh-CN',
    preview_url: '/audio/preview_energetic_male.mp3',
  },
  {
    id: 'voice_sweet_female',
    name: '甜美女声',
    gender: 'female',
    age: 'young',
    style: 'natural',
    avatar: '👩',
    language: 'zh-CN',
    preview_url: '/audio/preview_sweet_female.mp3',
  },
  {
    id: 'voice_pro_male',
    name: '专业男声',
    gender: 'male',
    age: 'middle',
    style: 'professional',
    avatar: '👨‍💼',
    language: 'zh-CN',
    preview_url: '/audio/preview_pro_male.mp3',
  },
  {
    id: 'voice_calm_female',
    name: '沉稳女声',
    gender: 'female',
    age: 'middle',
    style: 'calm',
    avatar: '👩‍💼',
    language: 'zh-CN',
    preview_url: '/audio/preview_calm_female.mp3',
  },
]

export const SUBTITLE_STYLES: SubtitleStyle[] = [
  {
    id: 'style_bold_poster',
    name: '大字报',
    description: '醒目大字，适合快节奏营销视频',
    preview_image: '/images/subtitle_bold.png',
    config: {
      font_family: 'PingFang SC',
      font_size: 48,
      font_color: '#FFFFFF',
      background_color: 'rgba(0,0,0,0.7)',
      position: 'bottom',
      animation: 'slide',
    },
  },
  {
    id: 'style_minimal_dark',
    name: '极简黑底',
    description: '简洁黑底白字，专业商务风格',
    preview_image: '/images/subtitle_minimal.png',
    config: {
      font_family: 'Microsoft YaHei',
      font_size: 32,
      font_color: '#E2E8F0',
      background_color: 'rgba(0,0,0,0.85)',
      position: 'bottom',
      animation: 'fade',
    },
  },
  {
    id: 'style_variety_flower',
    name: '综艺花字',
    description: '彩色描边花字，适合娱乐休闲内容',
    preview_image: '/images/subtitle_variety.png',
    config: {
      font_family: 'PingFang SC',
      font_size: 40,
      font_color: '#FFD700',
      border_color: '#FF4500',
      position: 'center',
      animation: 'typewriter',
    },
  },
]

export const RENDER_STAGE_LABELS: Record<RenderStage, string> = {
  initializing: '初始化中',
  allocating_resources: '分配算力资源',
  processing_assets: '处理素材文件',
  generating_audio: '生成配音音频',
  compositing: '合成视频画面',
  encoding: '编码压制输出',
  uploading: '上传至CDN',
}

export const LOADING_MESSAGES: LoadingMessage[] = [
  { stage: 'initializing', text: '正在初始化渲染引擎，准备就绪...' },
  { stage: 'allocating_resources', text: '正在分配GPU算力资源，为您加速渲染...' },
  { stage: 'processing_assets', text: '正在处理素材文件，智能匹配最佳画面...' },
  { stage: 'generating_audio', text: '正在生成AI配音，让声音更有感染力...' },
  { stage: 'compositing', text: '正在合成视频画面，精彩即将呈现...' },
  { stage: 'encoding', text: '正在编码压制，确保最佳画质...' },
  { stage: 'uploading', text: '即将完成！正在上传至CDN加速节点...' },
]

export const LOADING_TIPS = [
  '小贴士：选择"大R玩家"人群，文案更注重品质和尊享感',
  '小贴士：脑暴卖点越多，AI生成的文案角度越丰富',
  '小贴士：活力男声适合快节奏营销，甜美女声适合休闲推广',
  '小贴士：综艺花字风格更吸引年轻用户的注意力',
  '小贴士：双版本对比可以帮助您找到最佳营销方案',
  '小贴士：捕鱼游戏的金币福利是吸引用户的利器',
]

export const DEFAULT_AUDIO_CONFIG = {
  voice_id: 'voice_energetic_male',
  speed: 1.0,
  volume: 0.8,
  pitch: 0,
  pause_duration: 500,
}

export const DEFAULT_VIDEO_CONFIG = {
  subtitle_style_id: 'style_bold_poster',
  subtitle_position: 'bottom' as const,
  background_music_volume: 0.3,
  video_quality: 'high' as const,
  resolution: '1080p' as const,
  frame_rate: 30 as const,
}
