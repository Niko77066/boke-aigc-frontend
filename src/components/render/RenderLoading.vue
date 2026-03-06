<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { RenderStage } from '@/types'
import { RENDER_STAGE_LABELS, LOADING_MESSAGES, LOADING_TIPS } from '@/utils/constants'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  progress: number
  stage: RenderStage
}>()

const currentTipIndex = ref(0)
let tipTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tipTimer = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % LOADING_TIPS.length
  }, 5000)
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)
})

const stageLabel = computed(() => RENDER_STAGE_LABELS[props.stage] ?? '处理中')
const stageMessage = computed(() => {
  const msg = LOADING_MESSAGES.find((m) => m.stage === props.stage)
  return msg?.text ?? '正在处理中...'
})
const currentTip = computed(() => LOADING_TIPS[currentTipIndex.value] ?? '')
</script>

<template>
  <div class="render-loading">
    <div class="loading-visual">
      <div class="orb-container">
        <div class="orb" />
        <div class="orb-ring" />
        <div class="orb-ring delay" />
      </div>
    </div>

    <div class="loading-info">
      <div class="stage-label">{{ stageLabel }}</div>
      <div class="stage-message">{{ stageMessage }}</div>
      <ProgressBar :progress="progress" :show-percentage="true" />
      <div class="loading-tip">
        <transition name="fade-slide" mode="out-in">
          <p :key="currentTipIndex" class="tip-text">{{ currentTip }}</p>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.render-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  gap: 40px;
  padding: 40px;
}

.loading-visual {
  position: relative;
}

.orb-container {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a78bfa, #c4b5fd);
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.2);
}

.orb-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  @apply border-2 border-purple-200;
  animation: pulse-ring 2s ease-out infinite;
}
.orb-ring.delay {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.loading-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 500px;
  width: 100%;
}

.stage-label {
  font-size: 22px;
  font-weight: 700;
  @apply text-gray-900;
}

.stage-message {
  font-size: 14px;
  @apply text-gray-500;
  text-align: center;
}

.loading-tip {
  margin-top: 16px;
  height: 20px;
  overflow: hidden;
}

.tip-text {
  font-size: 12px;
  @apply text-gray-400;
  margin: 0;
  text-align: center;
}
</style>
