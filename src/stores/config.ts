import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSVoice, SubtitleStyle, AudioConfig, VideoConfig } from '@/types'
import { TTS_VOICES, SUBTITLE_STYLES, DEFAULT_AUDIO_CONFIG, DEFAULT_VIDEO_CONFIG } from '@/utils/constants'

export const useConfigStore = defineStore('config', () => {
  const ttsVoices = ref<TTSVoice[]>([])
  const selectedVoice = ref<TTSVoice | null>(null)
  const subtitleStyles = ref<SubtitleStyle[]>([])
  const selectedStyle = ref<SubtitleStyle | null>(null)
  const audioConfig = ref<AudioConfig>({ ...DEFAULT_AUDIO_CONFIG })
  const videoConfig = ref<VideoConfig>({ ...DEFAULT_VIDEO_CONFIG })
  const previewAudio = ref<string | null>(null)

  async function fetchTTSVoices() {
    // Use constants data (mock)
    ttsVoices.value = [...TTS_VOICES]
    subtitleStyles.value = [...SUBTITLE_STYLES]
  }

  function selectVoice(voiceId: string) {
    const voice = ttsVoices.value.find((v) => v.id === voiceId)
    if (voice) {
      selectedVoice.value = voice
      audioConfig.value.voice_id = voiceId
    }
  }

  function previewVoice(voiceId: string) {
    const voice = ttsVoices.value.find((v) => v.id === voiceId)
    if (voice?.preview_url) {
      previewAudio.value = voice.preview_url
    }
  }

  function selectSubtitleStyle(styleId: string) {
    const style = subtitleStyles.value.find((s) => s.id === styleId)
    if (style) {
      selectedStyle.value = style
      videoConfig.value.subtitle_style_id = styleId
      videoConfig.value.subtitle_position = style.config.position
    }
  }

  function updateAudioConfig(config: Partial<AudioConfig>) {
    audioConfig.value = { ...audioConfig.value, ...config }
  }

  function updateVideoConfig(config: Partial<VideoConfig>) {
    videoConfig.value = { ...videoConfig.value, ...config }
  }

  function resetConfig() {
    selectedVoice.value = null
    selectedStyle.value = null
    audioConfig.value = { ...DEFAULT_AUDIO_CONFIG }
    videoConfig.value = { ...DEFAULT_VIDEO_CONFIG }
    previewAudio.value = null
  }

  return {
    ttsVoices,
    selectedVoice,
    subtitleStyles,
    selectedStyle,
    audioConfig,
    videoConfig,
    previewAudio,
    fetchTTSVoices,
    selectVoice,
    previewVoice,
    selectSubtitleStyle,
    updateAudioConfig,
    updateVideoConfig,
    resetConfig,
  }
})
