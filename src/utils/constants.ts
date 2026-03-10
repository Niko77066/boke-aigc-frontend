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
    id: 'voice_dominant_sister',
    name: '气场御姐',
    gender: 'female',
    age: 'middle',
    style: 'professional',
    avatar: '御',
    language: 'zh-CN',
    preview_url: '/audio/preview_dominant_sister.mp3',
  },
  {
    id: 'voice_healing_gentle',
    name: '治愈温柔',
    gender: 'female',
    age: 'young',
    style: 'natural',
    avatar: '柔',
    language: 'zh-CN',
    preview_url: '/audio/preview_healing_gentle.mp3',
  },
  {
    id: 'voice_sweet_taiwan',
    name: '甜台少女',
    gender: 'female',
    age: 'young',
    style: 'energetic',
    avatar: '甜',
    language: 'zh-CN',
    preview_url: '/audio/preview_sweet_taiwan.mp3',
  },
  {
    id: 'voice_soft_cute',
    name: '软萌夹子',
    gender: 'female',
    age: 'young',
    style: 'calm',
    avatar: '萌',
    language: 'zh-CN',
    preview_url: '/audio/preview_soft_cute.mp3',
  },
]

export const SUBTITLE_STYLES: SubtitleStyle[] = [
  {
    id: 'style_brisk_highlight',
    name: '轻快醒目',
    description: '节奏轻快，重点词高亮，适合福利钩子型视频',
    preview_image: '/images/subtitle_brisk.png',
    config: {
      font_family: 'PingFang SC',
      font_size: 42,
      font_color: '#FFF9D6',
      background_color: 'rgba(25, 33, 52, 0.72)',
      position: 'bottom',
      animation: 'slide',
    },
  },
  {
    id: 'style_impact_burst',
    name: '高能冲击',
    description: '高对比大字冲屏，适合爆金和 Boss 战场景',
    preview_image: '/images/subtitle_impact.png',
    config: {
      font_family: 'Microsoft YaHei',
      font_size: 38,
      font_color: '#FFFFFF',
      background_color: 'rgba(189, 34, 34, 0.78)',
      border_color: '#FFB703',
      position: 'center',
      animation: 'typewriter',
    },
  },
  {
    id: 'style_blockbuster_banner',
    name: '爆款横幅',
    description: '横幅式字幕条，适合促销和限时下载引导',
    preview_image: '/images/subtitle_banner.png',
    config: {
      font_family: 'PingFang SC',
      font_size: 34,
      font_color: '#FFF8E7',
      background_color: 'rgba(12, 18, 32, 0.88)',
      border_color: '#F97316',
      position: 'top',
      animation: 'fade',
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
  '小贴士：气场御姐适合福利承诺，软萌夹子更适合轻松拉新',
  '小贴士：高能冲击适合爆点段落，爆款横幅更适合强 CTA',
  '小贴士：双版本对比可以帮助您找到最佳营销方案',
  '小贴士：捕鱼游戏的金币福利是吸引用户的利器',
]

export const DEFAULT_AUDIO_CONFIG = {
  voice_id: 'voice_dominant_sister',
  speed: 1.0,
  volume: 0.8,
  pitch: 0,
  pause_duration: 500,
}

export const DEFAULT_VIDEO_CONFIG = {
  subtitle_style_id: 'style_brisk_highlight',
  subtitle_position: 'bottom' as const,
  background_music_volume: 0.3,
  video_quality: 'high' as const,
  resolution: '1080p' as const,
  frame_rate: 30 as const,
}
