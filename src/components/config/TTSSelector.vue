<script setup lang="ts">
import type { TTSVoice } from '@/types'
import { VideoPlay } from '@element-plus/icons-vue'

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
              <div class="voice-name text-sm font-bold text-slate-100">{{ voice.name }}</div>
              <div class="flex items-center gap-2 mt-1">
                <span
                  class="px-2 py-0.5 rounded-full text-xs"
                  :class="voice.gender === 'male' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'"
                >
                  {{ voice.gender === 'male' ? '男声' : '女声' }}
                </span>
                <span class="text-xs text-slate-400">{{ styleLabel(voice.style) }}</span>
              </div>
            </div>
            <el-button
              size="small"
              circle
              class="preview-btn"
              @click.stop="emit('preview', voice.id)"
            >
              <el-icon :size="14"><VideoPlay /></el-icon>
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
  @apply relative p-px rounded-xl cursor-pointer transition-all duration-300;
  background: var(--gradient-card);
}
.voice-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(145deg, var(--border-color), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  transition: all 0.3s ease;
}
.voice-card:hover::before {
  background: var(--gradient-primary);
}
.card-content {
  @apply p-3 rounded-[11px] h-full w-full overflow-hidden relative;
  background: #1e1e32;
}
.selected-card {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}
.selected-card::before {
  background: var(--gradient-primary);
}

.preview-btn {
  @apply bg-purple-500/20 text-purple-300 border-none transition-all opacity-50 hover:opacity-100 hover:bg-purple-500/40;
}
.voice-card:hover .preview-btn {
  opacity: 1;
}

.waveform {
  @apply absolute bottom-0 left-0 right-0 flex items-end justify-between h-6 px-3 opacity-10;
  pointer-events: none;
}
.wave-bar {
  @apply w-px bg-purple-400;
  transition: height 0.3s ease-in-out;
}
.selected-card .waveform, .voice-card:hover .waveform {
  opacity: 0.2;
}
.selected-card .wave-bar {
  animation: wave-dance 1.5s ease-in-out infinite alternate;
}
@keyframes wave-dance {
  0% { height: 20%; }
  100% { height: 100%; }
}
</style>