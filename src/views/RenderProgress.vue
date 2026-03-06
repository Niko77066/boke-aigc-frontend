<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useConfigStore } from '@/stores/config'
import { useRenderStore } from '@/stores/render'
import { useWorkflowStore } from '@/stores/workflow'
import { KB_ID, RENDER_STAGE_LABELS, LOADING_MESSAGES, LOADING_TIPS } from '@/utils/constants'
import { CheckCircle2, AlertTriangle } from 'lucide-vue-next'

const router = useRouter()
const creativeStore = useCreativeStore()
const configStore = useConfigStore()
const renderStore = useRenderStore()
const workflowStore = useWorkflowStore()

// Tip cycling
const currentTipIndex = ref(0)
let tipTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Start rendering if not already running
  if (renderStore.renderTasks.length === 0 && creativeStore.selectedScript) {
    renderStore.startRender({
      selected_script: creativeStore.selectedScript,
      tts_config: configStore.audioConfig,
      subtitle_config: configStore.videoConfig,
      kb_id: KB_ID,
    })
  }

  tipTimer = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % LOADING_TIPS.length
  }, 5000)
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)
})

// Auto-navigate to result when all tasks complete
watch(
  () => renderStore.allCompleted,
  (completed) => {
    if (completed) {
      workflowStore.updateWorkflowData({ results: renderStore.results })
      workflowStore.nextStep()
      setTimeout(() => {
        router.push('/result')
      }, 1500) // Brief pause to show 100%
    }
  },
)

const showLoading = computed(() => !renderStore.allCompleted)
const stageLabel = computed(() => RENDER_STAGE_LABELS[renderStore.currentStage] ?? '处理中')
const stageMessage = computed(() => {
  const msg = LOADING_MESSAGES.find((m) => m.stage === renderStore.currentStage)
  return msg?.text ?? '正在处理中...'
})
const currentTip = computed(() => LOADING_TIPS[currentTipIndex.value] ?? '')
</script>

<template>
  <div class="render-progress">
    <transition name="fade" mode="out-in">
      <div v-if="showLoading" class="loading-content">
        <div class="stage-label">{{ stageLabel }}</div>
        <div class="stage-message">{{ stageMessage }}</div>

        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: `${renderStore.overallProgress}%` }"></div>
          <span class="progress-text">{{ renderStore.overallProgress.toFixed(0) }}%</span>
        </div>

        <div class="loading-tip">
          <transition name="fade-slide" mode="out-in">
            <p :key="currentTipIndex" class="tip-text">{{ currentTip }}</p>
          </transition>
        </div>
      </div>

      <div v-else class="completion-screen">
        <div class="completion-icon">
          <CheckCircle2 :size="64" />
        </div>
        <h2 class="completion-title">渲染完成！</h2>
        <p class="completion-desc">即将为您呈现最终成片...</p>
      </div>
    </transition>

    <!-- Error overlay -->
    <div v-if="renderStore.error" class="error-overlay">
      <AlertTriangle :size="40" />
      <h3>渲染出错</h3>
      <p>{{ renderStore.error }}</p>
      <el-button type="primary" @click="router.push('/config')">返回重新配置</el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.render-progress {
  @apply flex items-center justify-center h-full w-full relative overflow-hidden;
  background-color: #F8F7F4;
}

.loading-content, .completion-screen {
  @apply flex flex-col items-center text-center p-10 z-10;
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.loading-content:hover, .completion-screen:hover {
  border-color: #7C5CFC;
}

.stage-label {
  @apply text-2xl font-bold tracking-wide;
  color: #1A1A2E;
}

.stage-message {
  @apply text-base font-medium mt-2;
  color: #6B7280;
}

.progress-bar-container {
  @apply relative w-full max-w-md h-4 my-8 overflow-hidden;
  background-color: #F8F7F4;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}

.progress-bar {
  @apply absolute top-0 left-0 h-full;
  background-color: #7C5CFC;
  border-radius: 8px;
  transition: width 0.2s ease;
}

.progress-text {
  @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold z-10;
  color: #1A1A2E;
}

.loading-tip {
  @apply h-6 mt-2;
}

.tip-text {
  @apply text-sm;
  color: #9CA3AF;
}

.completion-icon {
  color: #7C5CFC;
  margin-bottom: 16px;
}

.completion-title {
  @apply text-2xl font-bold;
  color: #1A1A2E;
}

.completion-desc {
  @apply text-base mt-2;
  color: #6B7280;
}

.error-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center gap-4 text-center z-20;
  background-color: #F8F7F4;
  color: #FF6B6B;
}

/* Element Plus */
:deep(.el-button--primary) {
  @apply font-medium px-6 py-2 mt-4 border-0;
  background-color: #7C5CFC;
  color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

:deep(.el-button--primary:hover) {
  background-color: #6A4EE0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
