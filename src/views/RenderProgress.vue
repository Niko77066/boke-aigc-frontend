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
  background-image:
    radial-gradient(circle at 20% 80%, rgba(124, 92, 252, 0.06), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(124, 92, 252, 0.04), transparent 40%);
}

.loading-content, .completion-screen {
  @apply flex flex-col items-center text-center p-10 z-10 rounded-2xl border border-gray-200 transition-all duration-500;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.loading-content:hover, .completion-screen:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stage-label {
  @apply text-4xl font-black tracking-widest uppercase;
  color: #111827;
}
.stage-message {
  @apply text-lg font-medium mt-3 tracking-wide;
  color: #6b7280;
}

.progress-bar-container {
  @apply relative w-full max-w-md h-5 my-10 rounded-full overflow-hidden border border-gray-200;
  background: #f3f4f6;
}
.progress-bar {
  @apply absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out;
  background: linear-gradient(90deg, #7C5CFC, #6C8CFF);
}
.progress-text {
  @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-black tracking-widest z-10;
  color: #374151;
}

.loading-tip { @apply h-6 mt-2; }
.tip-text {
  @apply text-sm font-medium tracking-wider;
  color: #9ca3af;
}

.completion-icon {
  color: #10b981;
}
.completion-title {
  @apply text-4xl font-black tracking-widest uppercase mt-6;
  color: #111827;
}
.completion-desc {
  @apply text-lg font-medium mt-3 tracking-wide;
  color: #6b7280;
}

.error-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center gap-5 text-center z-20;
  background: rgba(255, 255, 255, 0.95);
  color: #ef4444;
}

/* Element Plus */
:deep(.el-button--primary) {
  @apply font-bold tracking-widest uppercase transition-all duration-300 border-0 rounded-lg px-8 py-5 mt-4;
  background: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
:deep(.el-button--primary:hover) {
  background: var(--brand-primary-dark);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from { opacity: 0; transform: translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }
</style>
