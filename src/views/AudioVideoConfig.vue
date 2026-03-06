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
  @apply bg-white rounded-xl;
  border: 1px solid #E5E7EB;
  box-shadow: 0 2px 8px rgba(26, 26, 46, 0.04);
  transition: all 0.2s ease-in-out;
}

.glass-morphism:hover {
  box-shadow: 0 8px 24px rgba(26, 26, 46, 0.08);
  transform: translateY(-1px);
}

/* Script preview */
.script-preview {
  @apply bg-white rounded-lg p-4;
  border: 1px solid #E5E7EB;
  border-left: 4px solid #7C5CFC;
  box-shadow: 0 2px 8px rgba(26, 26, 46, 0.04);
  color: #1A1A2E;
}

/* Render button */
.render-btn {
  @apply font-medium rounded-lg px-6 py-2;
  background-color: #7C5CFC;
  color: #FFFFFF;
  border: none;
  box-shadow: 0 2px 4px rgba(26, 26, 46, 0.06);
  transition: all 0.2s ease;
}

.render-btn:hover:not(.is-disabled) {
  background-color: #6A4BE3;
  box-shadow: 0 4px 12px rgba(26, 26, 46, 0.1);
  transform: translateY(-1px);
}

.render-btn.is-disabled {
  background-color: #E5E7EB;
  color: #6B7280;
  box-shadow: none;
}

/* Status badges */
.section-status-done {
  @apply flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full;
  background-color: rgba(124, 92, 252, 0.1);
  color: #7C5CFC;
}

.section-status-pending {
  @apply text-xs;
  color: #6B7280;
}

/* Action bar */
.action-bar {
  @apply bg-white border-t;
  border-color: #E5E7EB;
  box-shadow: 0 -4px 16px rgba(26, 26, 46, 0.04);
}

/* Page header */
.page-header {
  @apply bg-white rounded-xl p-6;
  border: 1px solid #E5E7EB;
  box-shadow: 0 2px 8px rgba(26, 26, 46, 0.04);
  color: #1A1A2E;
}

/* Scrollbar hiding */
.audio-section > div, .subtitle-section > div {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.audio-section > div::-webkit-scrollbar, .subtitle-section > div::-webkit-scrollbar {
  display: none;
}

/* Element Plus Overrides for Arc Theme */
:deep(.el-button--primary) {
  background-color: #7C5CFC !important;
  border-color: #7C5CFC !important;
  color: #FFFFFF !important;
}

:deep(.el-button--primary:hover) {
  background-color: #6A4BE3 !important;
  border-color: #6A4BE3 !important;
}

:deep(.el-button.is-plain) {
  color: #1A1A2E;
  border-color: #E5E7EB;
  background-color: #FFFFFF;
}

:deep(.el-button.is-plain:hover) {
  color: #7C5CFC;
  border-color: #7C5CFC;
  background-color: rgba(124, 92, 252, 0.05);
}

:deep(.el-card) {
  background-color: #FFFFFF;
  border-color: #E5E7EB;
  box-shadow: 0 2px 8px rgba(26, 26, 46, 0.04);
  border-radius: 0.75rem;
  color: #1A1A2E;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #E5E7EB inset !important;
  background-color: #F8F7F4;
  color: #1A1A2E;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #7C5CFC inset !important;
  background-color: #FFFFFF;
}

:deep(.el-step__title.is-finish),
:deep(.el-step__head.is-finish) {
  color: #7C5CFC;
  border-color: #7C5CFC;
}

:deep(.el-step__title.is-process) {
  color: #1A1A2E;
  font-weight: 600;
}

:deep(.el-step__title.is-wait) {
  color: #6B7280;
}

:deep(.el-tabs__item) {
  color: #6B7280;
}

:deep(.el-tabs__item.is-active) {
  color: #7C5CFC;
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  background-color: #7C5CFC;
}
</style>
