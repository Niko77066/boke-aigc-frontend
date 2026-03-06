<script setup lang="ts">
import { computed } from 'vue'
import type { RenderResult } from '@/types'
import VideoPlayer from './VideoPlayer.vue'
import { formatFileSize, formatDuration } from '@/utils/helpers'
import { Download, FolderOpened, Warning } from '@element-plus/icons-vue'

const props = defineProps<{
  results: RenderResult[]
}>()

const emit = defineEmits<{
  download: [taskId: string]
  downloadProject: [taskId: string]
}>()

const successResults = computed(() => props.results.filter((r) => r.status === 'completed'))
const hasMultiple = computed(() => successResults.value.length > 1)

function typeLabel(type: RenderResult['timeline_type']): string {
  return type === 'compact' ? 'A版 · 节奏紧凑版' : 'B版 · 画面丰富版'
}
</script>

<template>
  <div class="video-comparison h-full">
    <!-- Single video centered -->
    <div v-if="successResults.length === 1" class="flex items-center justify-center h-full">
      <div class="video-column">
        <VideoPlayer
          :src="successResults[0]!.video_url!"
          :title="typeLabel(successResults[0]!.timeline_type)"
        />
        <div class="video-meta">
          <span>时长: {{ formatDuration(successResults[0]!.duration) }}</span>
          <span>大小: {{ formatFileSize(successResults[0]!.file_size) }}</span>
        </div>
        <div class="video-actions">
          <el-button type="primary" @click="emit('download', successResults[0]!.task_id)">
            <el-icon class="mr-1"><Download /></el-icon>
            下载 MP4
          </el-button>
          <el-button @click="emit('downloadProject', successResults[0]!.task_id)">
            <el-icon class="mr-1"><FolderOpened /></el-icon>
            导出工程文件
          </el-button>
        </div>
      </div>
    </div>

    <!-- Dual video comparison -->
    <div v-else-if="hasMultiple" class="grid grid-cols-2 gap-6 h-full">
      <div v-for="result in successResults" :key="result.task_id" class="video-column">
        <VideoPlayer
          :src="result.video_url!"
          :title="typeLabel(result.timeline_type)"
        />
        <div class="video-meta">
          <span>时长: {{ formatDuration(result.duration) }}</span>
          <span>大小: {{ formatFileSize(result.file_size) }}</span>
        </div>
        <div class="video-actions">
          <el-button type="primary" @click="emit('download', result.task_id)">
            <el-icon class="mr-1"><Download /></el-icon>
            下载 MP4
          </el-button>
          <el-button @click="emit('downloadProject', result.task_id)">
            <el-icon class="mr-1"><FolderOpened /></el-icon>
            导出工程
          </el-button>
        </div>
      </div>
    </div>

    <!-- No results -->
    <div v-else class="no-results">
      <el-icon :size="48"><Warning /></el-icon>
      <p>暂无可用视频</p>
      <p class="no-results-hint">两个版本的渲染均未成功，请返回重新配置并重试</p>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.video-column {
  @apply flex flex-col gap-3;
}
.video-meta {
  @apply flex items-center gap-4 text-sm text-slate-400 px-1;
}
.video-actions {
  @apply flex items-center gap-2;
}
.no-results {
  @apply flex flex-col items-center justify-center h-full text-slate-500;
}
.no-results p { @apply mt-2; }
.no-results-hint { @apply text-sm text-slate-600; }
</style>