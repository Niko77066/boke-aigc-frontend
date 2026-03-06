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
  background-color: #0f0e17;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.15), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.15), transparent 40%);
}

.loading-content, .completion-screen {
  @apply flex flex-col items-center text-center p-10 z-10 rounded-2xl border transition-all duration-500;
  background: rgba(15, 14, 23, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-color: rgba(34, 211, 238, 0.3);
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.15), inset 0 0 20px rgba(34, 211, 238, 0.1);
}
.loading-content:hover, .completion-screen:hover {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 40px rgba(34, 211, 238, 0.2), inset 0 0 30px rgba(168, 85, 247, 0.15);
}

.stage-label {
  @apply text-4xl font-black tracking-widest uppercase;
  color: #22d3ee;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.4);
}
.stage-message {
  @apply text-lg font-medium mt-3 tracking-wide;
  color: #a855f7;
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
}

.progress-bar-container {
  @apply relative w-full max-w-md h-5 my-10 rounded-full overflow-hidden border;
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(168, 85, 247, 0.4);
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.9), 0 0 15px rgba(168, 85, 247, 0.2);
}
.progress-bar, .progress-bar-glow {
  @apply absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out;
}
.progress-bar {
  background: linear-gradient(90deg, #a855f7, #22d3ee);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.3);
}
.progress-bar-glow {
  background: linear-gradient(90deg, #a855f7, #22d3ee);
  filter: blur(12px);
  opacity: 0.85;
}
.progress-text {
  @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-black tracking-widest z-10;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px #22d3ee;
}

.loading-tip { @apply h-6 mt-2; }
.tip-text {
  @apply text-sm font-medium tracking-wider;
  color: #22d3ee;
  opacity: 0.8;
}

.completion-icon {
  color: #22d3ee;
  filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.8));
  animation: pulse-glow 2s infinite ease-in-out;
}
.completion-title {
  @apply text-4xl font-black tracking-widest uppercase mt-6;
  color: #a855f7;
  text-shadow: 0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.4);
}
.completion-desc {
  @apply text-lg font-medium mt-3 tracking-wide;
  color: #22d3ee;
}

.error-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center gap-5 text-center z-20;
  background: rgba(15, 14, 23, 0.9);
  backdrop-filter: blur(10px);
  color: #ff2a2a;
  text-shadow: 0 0 15px rgba(255, 42, 42, 0.6);
}

/* Element Plus */
:deep(.el-button--primary) {
  @apply font-bold tracking-widest uppercase transition-all duration-300 border-0 rounded-lg px-8 py-5 mt-4;
  background: linear-gradient(45deg, #a855f7, #22d3ee);
  color: #0f0e17;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}
:deep(.el-button--primary:hover) {
  background: linear-gradient(45deg, #22d3ee, #a855f7);
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.8), 0 0 15px rgba(168, 85, 247, 0.6);
  transform: translateY(-2px) scale(1.02);
  color: #ffffff;
}

/* Particles */
.particles { @apply absolute inset-0 overflow-hidden pointer-events-none; }
.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  animation: rise 10s infinite linear;
  box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
}
.particle:nth-child(odd) { background-color: #a855f7; color: #a855f7; }
.particle:nth-child(even) { background-color: #22d3ee; color: #22d3ee; }
@keyframes rise {
  0% { transform: translateY(100vh) scale(0.5); opacity: 1; }
  100% { transform: translateY(-10vh) scale(0); opacity: 0; }
}
.particle:nth-child(1) { left: 10%; width: 5px; height: 5px; animation-duration: 7s; animation-delay: 1s; }
.particle:nth-child(2) { left: 20%; width: 3px; height: 3px; animation-duration: 9s; animation-delay: 2s; }
.particle:nth-child(3) { left: 30%; width: 6px; height: 6px; animation-duration: 6s; animation-delay: 3s; }
.particle:nth-child(4) { left: 40%; width: 4px; height: 4px; animation-duration: 12s; animation-delay: 0s; }
.particle:nth-child(5) { left: 50%; width: 5px; height: 5px; animation-duration: 8s; animation-delay: 5s; }
.particle:nth-child(6) { left: 60%; width: 3px; height: 3px; animation-duration: 5s; animation-delay: 2s; }
.particle:nth-child(7) { left: 70%; width: 7px; height: 7px; animation-duration: 11s; animation-delay: 4s; }
.particle:nth-child(8) { left: 80%; width: 4px; height: 4px; animation-duration: 7s; animation-delay: 1s; }
.particle:nth-child(9) { left: 90%; width: 6px; height: 6px; animation-duration: 9s; animation-delay: 3s; }
.particle:nth-child(10) { left: 15%; width: 5px; height: 5px; animation-duration: 10s; animation-delay: 6s; }

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.6)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 30px rgba(34, 211, 238, 1)); transform: scale(1.1); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from { opacity: 0; transform: translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }
</style>