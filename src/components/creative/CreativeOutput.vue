<script setup lang="ts">
import type { Script } from '@/types'
import ScriptCard from './ScriptCard.vue'
import { Loader2, FileText, Magnet } from 'lucide-vue-next'

defineProps<{
  scripts: Script[]
  selectedId: string | null
  loading: boolean
  progress: number
}>()

const emit = defineEmits<{
  select: [scriptId: string]
  edit: [script: Script]
}>()
</script>

<template>
  <div class="creative-output h-full">
    <!-- Loading state -->
    <div v-if="loading" class="output-loading flex flex-col gap-4">
      <div class="loading-header flex items-center gap-2 text-purple-600 font-semibold">
        <Loader2 :size="20" class="animate-spin" />
        <span>AI 正在生成创意文案... {{ progress.toFixed(0) }}%</span>
      </div>
      <el-progress :percentage="progress" :show-text="false" color="var(--brand-primary)" />
      <div class="grid grid-cols-2 gap-4 mt-2">
        <div v-for="i in 4" :key="i" class="skeleton-card space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div class="skeleton h-5 w-3/4 rounded"></div>
          <div class="skeleton h-4 w-full rounded"></div>
          <div class="skeleton h-16 w-full rounded"></div>
          <div class="skeleton h-6 w-5/6 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="scripts.length === 0" class="output-empty flex flex-col items-center justify-center h-full text-center">
      <div class="empty-icon text-gray-300">
        <FileText :size="64" />
      </div>
      <p class="empty-title text-lg font-semibold text-gray-700 mt-4">等待生成创意文案</p>
      <p class="empty-desc text-sm text-gray-400 mt-1 max-w-xs">
        配置左侧参数后点击"AI 生成创意文案"，将为您生成 4 套营销方案
      </p>
    </div>

    <!-- Scripts grid -->
    <div v-else class="output-grid flex flex-col gap-4 h-full">
      <div class="output-header flex items-center justify-between">
        <h3 class="output-title flex items-center gap-2 text-base font-semibold text-gray-800">
          <Magnet :size="16" />
          <span>生成结果</span>
        </h3>
        <span class="output-count text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          共 {{ scripts.length }} 套方案
        </span>
      </div>
      <div class="scripts-grid grid grid-cols-2 gap-4 overflow-y-auto pr-2">
        <ScriptCard
          v-for="script in scripts"
          :key="script.id"
          :script="script"
          :selected="script.id === selectedId"
          :editable="true"
          @select="emit('select', $event)"
          @edit="emit('edit', $event)"
        />
      </div>
      <div v-if="selectedId" class="output-action text-center p-2">
        <p class="action-hint text-sm font-medium text-emerald-600">
          已选择方案，点击右下角按钮进入音画配置
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.scripts-grid {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scripts-grid::-webkit-scrollbar {
  display: none;
}
</style>
