<script setup lang="ts">
import type { TTSVoice } from '@/types'
import { Play } from 'lucide-vue-next'

defineProps<{
  voices: TTSVoice[]
  selected?: string
}>()

const emit = defineEmits<{
  select: [voiceId: string]
  preview: [voiceId:string]
}>()

function styleLabel(style: TTSVoice['style']): string {
  const map: Record<string, string> = {
    natural: '自然',
    energetic: '活力',
    calm: '沉稳',
    professional: '专业',
  }
  return map[style] ?? style
}
</script>

<template>
  <div class="tts-selector">
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="voice in voices"
        :key="voice.id"
        class="voice-card"
        :class="{ 'selected-card': selected === voice.id }"
        @click="emit('select', voice.id)"
      >
        <div class="card-content">
          <div class="flex items-center gap-3">
            <div class="voice-avatar text-4xl">{{ voice.avatar }}</div>
            <div class="voice-info">
              <div class="voice-name text-sm font-bold text-gray-800">{{ voice.name }}</div>
              <div class="flex items-center gap-2 mt-1">
                <span
                  class="px-2 py-0.5 rounded-full text-xs"
                  :class="voice.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'"
                >
                  {{ voice.gender === 'male' ? '男声' : '女声' }}
                </span>
                <span class="text-xs text-gray-500">{{ styleLabel(voice.style) }}</span>
              </div>
            </div>
            <el-button
              size="small"
              circle
              class="preview-btn"
              @click.stop="emit('preview', voice.id)"
            >
              <Play :size="14" />
            </el-button>
          </div>
          <div class="waveform">
            <div v-for="i in 20" :key="i" class="wave-bar" :style="{ height: `${Math.random() * 80 + 20}%` }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.voice-card {
  @apply relative rounded-2xl cursor-pointer transition-all duration-300 bg-white border border-gray-200 shadow-sm;
}
.voice-card:hover {
  @apply border-purple-400 shadow-md;
}
.card-content {
  @apply p-3 rounded-2xl h-full w-full overflow-hidden relative bg-white;
}
.selected-card {
  @apply border-purple-500;
  transform: translateY(-2px);
  box-shadow: var(--shadow-focus);
}

.preview-btn {
  @apply bg-purple-50 text-purple-500 border-none transition-all opacity-50 hover:opacity-100 hover:bg-purple-100;
}
.voice-card:hover .preview-btn {
  opacity: 1;
}

.waveform {
  @apply absolute bottom-0 left-0 right-0 flex items-end justify-between h-6 px-3;
  opacity: 0.05;
  pointer-events: none;
}
.wave-bar {
  @apply w-px bg-purple-300;
  transition: height 0.3s ease-in-out;
}
.selected-card .waveform, .voice-card:hover .waveform {
  opacity: 0.15;
}
.selected-card .wave-bar {
  animation: wave-dance 1.5s ease-in-out infinite alternate;
}
@keyframes wave-dance {
  0% { height: 20%; }
  100% { height: 100%; }
}
</style>
