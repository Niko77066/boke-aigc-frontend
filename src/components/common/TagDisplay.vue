<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(defineProps<{
  tags: string[]
  editable?: boolean
  maxDisplay?: number
}>(), {
  editable: false,
  maxDisplay: 10,
})

const emit = defineEmits<{
  remove: [tag: string]
}>()

const tagColors = [
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-cyan-50 text-cyan-600 border-cyan-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-amber-50 text-amber-600 border-amber-200',
]

function getTagColor(index: number) {
  return tagColors[index % tagColors.length]
}
</script>

<template>
  <div class="tag-display flex flex-wrap gap-2 items-center">
    <span
      v-for="(tag, idx) in tags.slice(0, maxDisplay)"
      :key="tag"
      class="tag-capsule"
      :class="getTagColor(idx)"
    >
      {{ tag }}
      <X
        v-if="editable"
        class="tag-remove"
        :size="12"
        @click.stop="emit('remove', tag)"
      />
    </span>
    <span v-if="tags.length > maxDisplay" class="tag-capsule bg-gray-50 text-gray-500 border-gray-200">
      +{{ tags.length - maxDisplay }}
    </span>
    <span v-if="tags.length === 0" class="text-xs text-gray-400">暂无标签</span>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.tag-capsule {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border;
}

.tag-remove {
  @apply ml-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity;
}
</style>
