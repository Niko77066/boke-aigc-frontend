<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useConfigStore } from '@/stores/config'
import { useRenderStore } from '@/stores/render'
import { useWorkflowStore } from '@/stores/workflow'
import { KB_ID, RENDER_STAGE_LABELS, LOADING_MESSAGES, LOADING_TIPS } from '@/utils/constants'
import { CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'

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
    <div class="particles">
      <div v-for="i in 50" :key="i" class="particle"></div>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="showLoading" class="loading-content">
        <div class="stage-label">{{ stageLabel }}</div>
        <div class="stage-message">{{ stageMessage }}</div>
        
        <div class="progress-bar-container">
          <div class="progress-bar-glow" :style="{ width: `${renderStore.overallProgress}%` }"></div>
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
          <el-icon :size="64"><CircleCheckFilled /></el-icon>
        </div>
        <h2 class="completion-title">渲染完成！</h2>
        <p class="completion-desc">即将为您呈现最终成片...</p>
      </div>
    </transition>

    <!-- Error overlay -->
    <div v-if="renderStore.error" class="error-overlay">
      <el-icon :size="40"><WarningFilled /></el-icon>
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
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}

.loading-content, .completion-screen {
  @apply flex flex-col items-center text-center p-8 z-10;
}

.stage-label {
  @apply text-3xl font-bold text-white;
}
.stage-message {
  @apply text-base text-slate-400 mt-2;
}

.progress-bar-container {
  @apply relative w-full max-w-md h-4 my-8;
}
.progress-bar, .progress-bar-glow {
  @apply absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out;
}
.progress-bar {
  background: var(--gradient-primary);
}
.progress-bar-glow {
  background: var(--gradient-primary);
  filter: blur(12px);
  opacity: 0.7;
}
.progress-text {
  @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-sm font-bold;
  mix-blend-mode: difference;
}

.loading-tip {
  @apply h-5 mt-4;
}
.tip-text {
  @apply text-sm text-slate-500;
}

.completion-icon {
  color: var(--success);
  animation: scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.completion-title {
  @apply text-3xl font-bold text-white mt-4;
}
.completion-desc {
  @apply text-base text-slate-400 mt-2;
}

.error-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center gap-3 text-center z-20;
  background: rgba(15, 15, 26, 0.95);
  color: var(--danger);
}

/* Particle Background */
.particles {
  @apply absolute inset-0 overflow-hidden;
}
.particle {
  position: absolute;
  background-color: var(--brand-primary);
  border-radius: 50%;
  opacity: 0;
  animation: rise 10s infinite linear;
}
@keyframes rise {
  0% { transform: translateY(100vh) scale(0.5); opacity: 1; }
  100% { transform: translateY(-10vh) scale(0); opacity: 0; }
}
.particle:nth-child(1) { left: 10%; width: 5px; height: 5px; animation-duration: 7s; animation-delay: 1s; }
.particle:nth-child(2) { left: 20%; width: 2px; height: 2px; animation-duration: 9s; animation-delay: 2s; }
.particle:nth-child(3) { left: 30%; width: 6px; height: 6px; animation-duration: 6s; animation-delay: 3s; background-color: var(--brand-secondary); }
/* ... add more for variety ... */
.particle:nth-child(4) { left: 40%; width: 3px; height: 3px; animation-duration: 12s; animation-delay: 0s; }
.particle:nth-child(5) { left: 50%; width: 4px; height: 4px; animation-duration: 8s; animation-delay: 5s; background-color: var(--brand-secondary); }
.particle:nth-child(6) { left: 60%; width: 2px; height: 2px; animation-duration: 5s; animation-delay: 2s; }
.particle:nth-child(7) { left: 70%; width: 6px; height: 6px; animation-duration: 11s; animation-delay: 4s; }
.particle:nth-child(8) { left: 80%; width: 3px; height: 3px; animation-duration: 7s; animation-delay: 1s; background-color: var(--brand-secondary); }
.particle:nth-child(9) { left: 90%; width: 5px; height: 5px; animation-duration: 9s; animation-delay: 3s; }
.particle:nth-child(10) { left: 15%; width: 4px; height: 4px; animation-duration: 10s; animation-delay: 6s; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.5s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }
</style>