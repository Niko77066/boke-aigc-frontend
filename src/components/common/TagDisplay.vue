<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

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
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
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
      <el-icon
        v-if="editable"
        class="tag-remove"
        :size="12"
        @click.stop="emit('remove', tag)"
      >
        <Close />
      </el-icon>
    </span>
    <span v-if="tags.length > maxDisplay" class="tag-capsule bg-slate-500/20 text-slate-300 border-slate-500/30">
      +{{ tags.length - maxDisplay }}
    </span>
    <span v-if="tags.length === 0" class="text-xs text-slate-500">暂无标签</span>
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