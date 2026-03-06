<script setup lang="ts">
import type { Script } from '@/types'
import TagDisplay from '@/components/common/TagDisplay.vue'
import { truncateText } from '@/utils/helpers'
import { Edit, Microphone } from '@element-plus/icons-vue'

defineProps<{
  script: Script
  selected?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  select: [scriptId: string]
  edit: [script: Script]
}>()
</script>

<template>
  <div
    class="script-card"
    :class="{ 'selected-card': selected }"
    @click="emit('select', script.id)"
  >
    <div class="card-content">
      <div class="card-header flex items-start justify-between">
        <h3 class="card-title text-base font-bold text-slate-100">{{ script.title }}</h3>
        <el-button
          v-if="editable && selected"
          type="primary"
          circle
          size="small"
          class="edit-btn"
          @click.stop="emit('edit', script)"
        >
          <el-icon :size="14"><Edit /></el-icon>
        </el-button>
      </div>

      <p class="card-description text-xs text-slate-400 leading-relaxed mt-2">
        {{ script.description }}
      </p>

      <div class="tts-preview mt-3 p-3 bg-purple-500/10 rounded-lg border-l-2 border-purple-400">
        <div class="flex items-start gap-2">
          <el-icon :size="14" class="tts-icon text-purple-300 mt-0.5"><Microphone /></el-icon>
          <span class="tts-text text-sm text-slate-200 leading-snug">
            {{ truncateText(script.tts_text, 80) }}
          </span>
        </div>
      </div>

      <div class="visual-tags mt-3">
        <TagDisplay :tags="script.visual_tags" :max-display="4" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.script-card {
  @apply relative p-px rounded-xl cursor-pointer transition-all duration-300;
  background: var(--gradient-card);
}

/* Gradient border effect */
.script-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px; /* border thickness */
  background: linear-gradient(145deg, var(--border-color), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  transition: all 0.3s ease;
  pointer-events: none;
}

.script-card:hover::before {
  background: var(--gradient-primary);
}

.card-content {
  @apply p-4 rounded-[11px] h-full w-full;
  background: #1e1e32;
}

.selected-card {
  transform: scale(1.02);
  box-shadow: var(--glow-primary);
}

.selected-card::before {
  background: var(--gradient-primary);
  padding: 2px; /* thicker border */
  animation: pulse 2s infinite;
}

.edit-btn {
  @apply w-7 h-7;
  background: var(--brand-primary) !important;
  border: none;
}
</style>