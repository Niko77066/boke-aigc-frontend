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
  FileText,
  Mic,
  Check,
  Gauge,
  MessageSquare,
  Play,
} from 'lucide-vue-next'

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
        <h1 class="page-title text-2xl font-bold text-gray-900">音画配置</h1>
        <p class="page-desc text-sm text-gray-500 mt-1">
          选择配音语音和字幕样式，定制您的营销视频风格
        </p>
      </div>
      <el-button text @click="goBack">
        <ArrowLeft :size="16" class="mr-1" />
        返回修改文案
      </el-button>
    </div>

    <!-- Selected script preview -->
    <div v-if="selectedScript" class="script-preview p-4 rounded-lg">
      <div class="preview-header flex items-center gap-2 mb-2">
        <FileText :size="14" class="text-purple-500" />
        <span class="preview-label text-sm font-semibold text-purple-600">
          已选方案: {{ selectedScript.title }}
        </span>
      </div>
      <p class="preview-text text-sm text-gray-600 leading-relaxed">
        {{ selectedScript.tts_text }}
      </p>
    </div>

    <div class="config-sections grid grid-cols-2 gap-6 flex-1 min-h-0">
      <!-- Left: Audio Config -->
      <div class="audio-section glass-morphism flex flex-col rounded-2xl p-5">
        <div class="section-header flex items-center justify-between mb-4">
          <div class="section-title flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Mic :size="16" class="text-purple-500" />
            <h2>配音语音</h2>
          </div>
          <span v-if="configStore.selectedVoice" class="section-status-done">
            <Check :size="12" />
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
        <div v-if="configStore.selectedVoice" class="speed-control mt-4 pt-4 border-t border-gray-200">
          <div class="section-title flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
            <Gauge :size="16" class="text-purple-500" />
            <span>语速调节</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400">慢</span>
            <el-slider
              v-model="configStore.audioConfig.speed"
              :min="0.5" :max="2.0" :step="0.1"
              :format-tooltip="(v: number) => v.toFixed(1) + 'x'"
            />
            <span class="text-xs text-gray-400">快</span>
          </div>
        </div>
      </div>

      <!-- Right: Subtitle Config -->
      <div class="subtitle-section glass-morphism flex flex-col rounded-2xl p-5">
        <div class="section-header flex items-center justify-between mb-4">
          <div class="section-title flex items-center gap-2 text-lg font-semibold text-gray-800">
            <MessageSquare :size="16" class="text-purple-500" />
            <h2>字幕样式</h2>
          </div>
          <span v-if="configStore.selectedStyle" class="section-status-done">
            <Check :size="12" />
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
    <div class="action-bar glass-morphism flex items-center justify-between p-4 rounded-2xl">
      <el-button size="large" @click="goBack">
        <ArrowLeft :size="16" class="mr-1" />
        上一步
      </el-button>
      <el-button
        type="primary"
        size="large"
        :disabled="!canProceed"
        class="render-btn"
        @click="startRender"
      >
        <Play :size="16" class="mr-2" />
        开始渲染视频
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* Clean card base */
.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-morphism:hover {
  box-shadow: var(--shadow-md);
}

/* Script preview */
.script-preview {
  @apply bg-white border border-gray-200;
  border-left: 4px solid #a78bfa;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Render button */
.render-btn {
  @apply font-bold rounded-lg px-6;
  background: var(--brand-primary);
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}
.render-btn:hover:not(.is-disabled) {
  background: var(--brand-primary-dark);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* Status badges */
.section-status-done {
  @apply flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full;
}
.section-status-pending {
  @apply text-xs text-gray-400;
}

/* Action bar */
.action-bar {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Page header */
.page-header {
  @apply bg-white border border-gray-200 rounded-xl p-6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Scrollbar hiding */
.audio-section > div, .subtitle-section > div {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.audio-section > div::-webkit-scrollbar, .subtitle-section > div::-webkit-scrollbar {
  display: none;
}
</style>
