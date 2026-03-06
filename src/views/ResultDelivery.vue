<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRenderStore } from '@/stores/render'
import { useWorkflowStore } from '@/stores/workflow'
import VideoComparison from '@/components/result/VideoComparison.vue'
import { ElMessage } from 'element-plus'
import { WarningFilled, VideoCamera, CircleCheckFilled, RefreshRight } from '@element-plus/icons-vue'
import confetti from 'canvas-confetti'

const router = useRouter()
const renderStore = useRenderStore()
const workflowStore = useWorkflowStore()

const successResults = computed(() => renderStore.successfulResults)
const failedResults = computed(() => renderStore.failedResults)
const hasResults = computed(() => successResults.value.length > 0)

function handleDownload(taskId: string) {
  const result = renderStore.results.find((r) => r.task_id === taskId)
  if (result?.video_url) {
    ElMessage.success('下载已开始（模拟）')
  }
}

function handleDownloadProject(taskId: string) {
  const result = renderStore.results.find((r) => r.task_id === taskId)
  if (result?.project_file_url) {
    ElMessage.success('工程文件下载已开始（模拟）')
  }
}

function startOver() {
  renderStore.resetRender()
  workflowStore.resetWorkflow()
  router.push('/creative')
}

function triggerConfetti() {
  const duration = 5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) {
      return clearInterval(interval)
    }
    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

onMounted(() => {
  if (hasResults.value) {
    triggerConfetti()
  }
})
</script>

<template>
  <div class="result-delivery flex flex-col h-full p-6 gap-6">
    <div class="page-header">
      <div>
        <h1 class="page-title text-2xl font-bold text-white">成片交付</h1>
        <p class="page-desc text-sm text-slate-400 mt-1">
          预览生成的营销视频，下载或导出工程文件
        </p>
      </div>
    </div>

    <div class="results-section glass-morphism flex-1 flex flex-col rounded-xl overflow-hidden p-6">
      <!-- Failure notice -->
      <div v-if="failedResults.length > 0" class="failure-notice">
        <el-icon :size="16"><WarningFilled /></el-icon>
        <span>
          {{ failedResults.length === 1 ? '一个版本' : '所有版本' }}渲染失败
          <template v-if="successResults.length > 0">，已为您展示成功的版本</template>
        </span>
      </div>

      <!-- Video comparison -->
      <div v-if="hasResults" class="flex-1">
        <VideoComparison
          :results="successResults"
          @download="handleDownload"
          @download-project="handleDownloadProject"
        />
      </div>

      <!-- No results at all -->
      <div v-else class="empty-results">
        <el-icon :size="64"><VideoCamera /></el-icon>
        <h2 class="text-xl font-semibold mt-4">暂无渲染结果</h2>
        <p class="text-slate-400">请先完成创意配置和视频渲染</p>
        <el-button type="primary" @click="router.push('/creative')">
          前往创意控制台
        </el-button>
      </div>
    </div>

    <!-- Action bar -->
    <div v-if="hasResults" class="action-bar glass-morphism flex items-center justify-between p-4 rounded-xl">
      <div class="success-count">
        <el-icon :size="16"><CircleCheckFilled /></el-icon>
        {{ successResults.length }} 个版本渲染成功
      </div>
      <div class="action-buttons">
        <el-button size="large" @click="startOver">
          <el-icon class="mr-1"><RefreshRight /></el-icon>
          重新制作
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.failure-notice {
  @apply flex items-center gap-2 p-3 mb-4 rounded-lg;
  background-color: rgba(var(--danger-rgb), 0.1);
  border: 1px solid rgba(var(--danger-rgb), 0.2);
  color: var(--danger);
}
.empty-results {
  @apply flex flex-col items-center justify-center h-full;
  color: var(--text-secondary);
}
.success-count {
  @apply flex items-center gap-2 text-sm font-medium;
  color: var(--success);
}
</style>