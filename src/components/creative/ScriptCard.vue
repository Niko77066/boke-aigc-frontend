<script setup lang="ts">
import type { Script } from '@/types'
import TagDisplay from '@/components/common/TagDisplay.vue'
import { truncateText } from '@/utils/helpers'
import { Pencil, Mic } from 'lucide-vue-next'

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
        <h3 class="card-title text-base font-bold text-gray-900">{{ script.title }}</h3>
        <el-button
          v-if="editable && selected"
          type="primary"
          circle
          size="small"
          class="edit-btn"
          @click.stop="emit('edit', script)"
        >
          <Pencil :size="14" />
        </el-button>
      </div>

      <p class="card-description text-xs text-gray-500 leading-relaxed mt-2">
        {{ script.description }}
      </p>

      <div class="tts-preview mt-3 p-3 bg-purple-50 rounded-lg border-l-2 border-purple-400">
        <div class="flex items-start gap-2">
          <Mic :size="14" class="tts-icon text-purple-400 mt-0.5" />
          <span class="tts-text text-sm text-gray-700 leading-snug">
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
  @apply relative rounded-2xl cursor-pointer transition-all duration-300;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.script-card:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-content {
  @apply p-4 h-full w-full;
}

.selected-card {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-focus);
  transform: translateY(-2px);
}

.edit-btn {
  @apply w-7 h-7;
}
</style>
