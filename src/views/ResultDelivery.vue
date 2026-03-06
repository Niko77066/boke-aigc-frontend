<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRenderStore } from '@/stores/render'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import VideoComparison from '@/components/result/VideoComparison.vue'
import { ElMessage } from 'element-plus'
import { AlertTriangle, Video, CheckCircle2, RotateCw, Download, Film, ExternalLink } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const router = useRouter()
const renderStore = useRenderStore()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

const successResults = computed(() => renderStore.successfulResults)
const failedResults = computed(() => renderStore.failedResults)
const hasResults = computed(() => successResults.value.length > 0)

// Pipeline video result
const hasPipelineVideo = computed(() => !!creativeStore.videoRenderStatus?.video_url)
const pipelineVideoUrl = computed(() => creativeStore.videoRenderStatus?.video_url ?? '')
const hasAnyResult = computed(() => hasResults.value || hasPipelineVideo.value)

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
  creativeStore.resetPipeline()
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
        <h1 class="page-title text-2xl font-bold text-gray-900">成片交付</h1>
        <p class="page-desc text-sm text-gray-500 mt-1">
          预览生成的营销视频，下载或导出工程文件
        </p>
      </div>
    </div>

    <div class="results-section glass-morphism flex-1 flex flex-col rounded-2xl overflow-hidden p-6">
      <!-- Failure notice -->
      <div v-if="failedResults.length > 0" class="failure-notice">
        <AlertTriangle :size="16" />
        <span>
          {{ failedResults.length === 1 ? '一个版本' : '所有版本' }}渲染失败
          <template v-if="successResults.length > 0">，已为您展示成功的版本</template>
        </span>
      </div>

      <!-- Pipeline video result -->
      <div v-if="hasPipelineVideo" class="pipeline-result mb-6">
        <div class="flex items-center gap-2 mb-4">
          <Film :size="20" class="text-purple-500" />
          <h3 class="text-lg font-semibold text-gray-900">AI 产线成片</h3>
        </div>
        <div class="video-card p-4 rounded-2xl border border-purple-200 bg-white">
          <video
            :src="pipelineVideoUrl"
            controls
            class="w-full rounded-xl max-h-[480px] bg-black"
          />
          <div class="flex items-center justify-between mt-4">
            <div class="text-sm text-gray-500">
              由 AI 产线自动生成（FastGPT + 剪映 MCP）
            </div>
            <div class="flex gap-2">
              <a
                :href="pipelineVideoUrl"
                target="_blank"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                <Download :size="16" />
                下载成片
              </a>
              <a
                :href="pipelineVideoUrl"
                target="_blank"
                class="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-purple-300 hover:text-purple-600 transition text-sm"
              >
                <ExternalLink :size="16" />
                新窗口打开
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Video comparison (mock mode) -->
      <div v-if="hasResults" class="flex-1">
        <VideoComparison
          :results="successResults"
          @download="handleDownload"
          @download-project="handleDownloadProject"
        />
      </div>

      <!-- No results at all -->
      <div v-else-if="!hasAnyResult" class="empty-results">
        <Video :size="64" />
        <h2 class="text-xl font-semibold mt-4">暂无渲染结果</h2>
        <p class="text-gray-500">请先完成创意配置和视频渲染</p>
        <el-button type="primary" @click="router.push('/creative')">
          前往创意控制台
        </el-button>
      </div>
    </div>

    <!-- Action bar -->
    <div v-if="hasResults" class="action-bar glass-morphism flex items-center justify-between p-4 rounded-2xl">
      <div class="success-count">
        <CheckCircle2 :size="16" />
        {{ successResults.length }} 个版本渲染成功
      </div>
      <div class="action-buttons">
        <el-button size="large" @click="startOver">
          <RotateCw :size="16" class="mr-1" />
          重新制作
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.result-delivery {
  background-color: #F8F7F4;
}

.page-header {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.page-title {
  color: #1A1A2E;
}

.page-desc {
  color: #6B7280;
}

/* Overriding the template's glass-morphism class to enforce solid Arc-style cards */
.glass-morphism {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.glass-morphism:hover {
  border-color: #7C5CFC;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.failure-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background-color: #FFF5F5;
  border: 1px solid #FFD6D6;
  color: #FF6B6B;
  font-size: 0.875rem;
}

.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9CA3AF;
}

.empty-results h2 {
  color: #1A1A2E;
}

.empty-results p {
  color: #6B7280;
  margin-bottom: 1.5rem;
}

.success-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #10B981;
}

.action-bar {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Element Plus Overrides */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid #E5E7EB;
  background-color: #FFFFFF;
  color: #1A1A2E;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.el-button:hover),
:deep(.el-button:focus) {
  color: #7C5CFC;
  border-color: #7C5CFC;
  background-color: #F8F7F4;
  outline: none;
}

:deep(.el-button--primary) {
  background-color: #7C5CFC;
  border-color: #7C5CFC;
  color: #FFFFFF;
  box-shadow: 0 1px 3px rgba(124, 92, 252, 0.2);
}

:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
  background-color: #6A4EE0;
  border-color: #6A4EE0;
  color: #FFFFFF;
}

:deep(.el-button.is-plain) {
  background-color: #FFFFFF;
  border-color: #E5E7EB;
  color: #6B7280;
}

:deep(.el-button.is-plain:hover) {
  border-color: #7C5CFC;
  color: #7C5CFC;
  background-color: #FFFFFF;
}
</style>
