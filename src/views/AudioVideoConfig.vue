<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useConfigStore } from '@/stores/config'
import { useWorkflowStore } from '@/stores/workflow'
import TTSSelector from '@/components/config/TTSSelector.vue'
import SubtitleStyleSelector from '@/components/config/SubtitleStyleSelector.vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Document,
  Microphone,
  Check,
  Odometer,
  ChatDotSquare,
  VideoPlay,
} from '@element-plus/icons-vue'

const router = useRouter()
const creativeStore = useCreativeStore()
const configStore = useConfigStore()
const workflowStore = useWorkflowStore()

onMounted(() => {
  configStore.fetchTTSVoices()
})

const selectedScript = computed(() => creativeStore.selectedScript)

const canProceed = computed(() => {
  return configStore.selectedVoice !== null && configStore.selectedStyle !== null
})

function handleVoiceSelect(voiceId: string) {
  configStore.selectVoice(voiceId)
}

function handleVoicePreview(voiceId: string) {
  configStore.previewVoice(voiceId)
  ElMessage.info('试听功能将在接入真实TTS后可用')
}

function handleStyleSelect(styleId: string) {
  configStore.selectSubtitleStyle(styleId)
}

function goBack() {
  router.push('/creative')
}

function startRender() {
  if (!canProceed.value) {
    ElMessage.warning('请完成所有配置项')
    return
  }
  workflowStore.updateWorkflowData({
    audioConfig: configStore.audioConfig,
    videoConfig: configStore.videoConfig,
  })
  workflowStore.nextStep()
  router.push('/render')
}
</script>

<template>
  <div class="audio-video-config flex flex-col h-full p-6 gap-6">
    <div class="page-header flex items-start justify-between">
      <div>
        <h1 class="page-title text-2xl font-bold text-white">音画配置</h1>
        <p class="page-desc text-sm text-slate-400 mt-1">
          选择配音语音和字幕样式，定制您的营销视频风格
        </p>
      </div>
      <el-button text @click="goBack">
        <el-icon class="mr-1"><ArrowLeft /></el-icon>
        返回修改文案
      </el-button>
    </div>

    <!-- Selected script preview -->
    <div v-if="selectedScript" class="script-preview glass-morphism p-4 rounded-lg border-l-4 border-purple-500">
      <div class="preview-header flex items-center gap-2 mb-2">
        <el-icon :size="14"><Document /></el-icon>
        <span class="preview-label text-sm font-semibold text-purple-300">
          已选方案: {{ selectedScript.title }}
        </span>
      </div>
      <p class="preview-text text-sm text-slate-300 leading-relaxed">
        {{ selectedScript.tts_text }}
      </p>
    </div>

    <div class="config-sections grid grid-cols-2 gap-6 flex-1 min-h-0">
      <!-- Left: Audio Config -->
      <div class="audio-section glass-morphism flex flex-col rounded-xl p-5">
        <div class="section-header flex items-center justify-between mb-4">
          <div class="section-title flex items-center gap-2 text-lg font-semibold text-slate-100">
            <el-icon><Microphone /></el-icon>
            <h2>配音语音</h2>
          </div>
          <span v-if="configStore.selectedVoice" class="section-status-done">
            <el-icon :size="12"><Check /></el-icon>
            {{ configStore.selectedVoice.name }}
          </span>
          <span v-else class="section-status-pending">请选择</span>
        </div>
        <div class="flex-1 overflow-y-auto pr-2">
          <TTSSelector
            :voices="configStore.ttsVoices"
            :selected="configStore.selectedVoice?.id"
            @select="handleVoiceSelect"
            @preview="handleVoicePreview"
          />
        </div>
        <div v-if="configStore.selectedVoice" class="speed-control mt-4 pt-4 border-t border-white/10">
          <div class="section-title flex items-center gap-2 text-base font-semibold text-slate-100 mb-2">
            <el-icon><Odometer /></el-icon>
            <span>语速调节</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400">慢</span>
            <el-slider
              v-model="configStore.audioConfig.speed"
              :min="0.5" :max="2.0" :step="0.1"
              :format-tooltip="(v: number) => v.toFixed(1) + 'x'"
            />
            <span class="text-xs text-slate-400">快</span>
          </div>
        </div>
      </div>

      <!-- Right: Subtitle Config -->
      <div class="subtitle-section glass-morphism flex flex-col rounded-xl p-5">
        <div class="section-header flex items-center justify-between mb-4">
          <div class="section-title flex items-center gap-2 text-lg font-semibold text-slate-100">
            <el-icon><ChatDotSquare /></el-icon>
            <h2>字幕样式</h2>
          </div>
          <span v-if="configStore.selectedStyle" class="section-status-done">
            <el-icon :size="12"><Check /></el-icon>
            {{ configStore.selectedStyle.name }}
          </span>
          <span v-else class="section-status-pending">请选择</span>
        </div>
        <div class="flex-1 overflow-y-auto pr-2">
          <SubtitleStyleSelector
            :styles="configStore.subtitleStyles"
            :selected="configStore.selectedStyle?.id"
            @select="handleStyleSelect"
          />
        </div>
      </div>
    </div>

    <!-- Action bar -->
    <div class="action-bar glass-morphism flex items-center justify-between p-4 rounded-xl">
      <el-button size="large" @click="goBack">
        <el-icon class="mr-1"><ArrowLeft /></el-icon>
        上一步
      </el-button>
      <el-button
        type="primary"
        size="large"
        :disabled="!canProceed"
        class="render-btn font-bold rounded-lg px-6"
        @click="startRender"
      >
        <el-icon class="mr-2"><VideoPlay /></el-icon>
        开始渲染视频
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.render-btn {
  @apply font-bold rounded-lg px-6;
  background: var(--gradient-primary);
  border: none;
  box-shadow: var(--glow-primary);
  transition: all 0.3s ease;
}
.render-btn:hover:not(.is-disabled) {
  transform: translateY(-2px) scale(1.02);
  filter: brightness(1.2);
  box-shadow: 0 0 25px rgba(168, 85, 247, 0.8);
}
.section-status-done {
  @apply flex items-center gap-1 text-xs font-medium bg-green-500/20 text-green-300 px-2 py-1 rounded-full;
}
.section-status-pending {
  @apply text-xs text-slate-400;
}
.audio-section > div, .subtitle-section > div {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.audio-section > div::-webkit-scrollbar, .subtitle-section > div::-webkit-scrollbar {
  display: none;
}
</style>