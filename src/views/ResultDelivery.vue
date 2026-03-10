<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import {
  getDraftTracks,
  extractAllTaskIds,
  extractVideoUrls,
  type DraftInfo,
} from '@/api/capcut'
import {
  Film, Download, ExternalLink, Video, RotateCw, CheckCircle2,
  AlertTriangle, Layers, Clock, Loader2,
} from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const router = useRouter()
const route = useRoute()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

// ── Video statuses from store ────────────────────────────────────
const videoStatuses = computed(() => creativeStore.videoStatusList)
const successVideos = computed(() => {
  return videoStatuses.value.filter((s) => s.status === 'success' && Boolean(s.video_url))
})
const failedVideos = computed(() => videoStatuses.value.filter((s) => s.status === 'failed'))
const trackedTasks = computed(() => {
  return creativeStore.videoTaskIds.map((taskId) => {
    const status = creativeStore.videoRenderStatuses.get(taskId)
    return status ?? {
      task_id: taskId,
      status: creativeStore.videoPollingCount > 0 ? 'processing' : 'pending',
    }
  })
})

// ── Fallback: extract video URLs directly from pipeline output ──
const fallbackVideoUrls = computed(() => {
  if (successVideos.value.length > 0) return []
  return extractVideoUrls(creativeStore.pipelineOutput)
})

const autoDetectedTaskIds = computed(() => extractAllTaskIds(creativeStore.pipelineOutput))
const expectedVideoCount = computed(() => {
  return Math.max(
    trackedTasks.value.length,
    autoDetectedTaskIds.value.length,
    successVideos.value.length,
    fallbackVideoUrls.value.length,
    creativeStore.pipelineVideoStarted ? 2 : 0,
  )
})
const hasVideos = computed(() => {
  if (expectedVideoCount.value === 0) {
    return successVideos.value.length > 0 || fallbackVideoUrls.value.length > 0
  }
  if (successVideos.value.length > 0) {
    return successVideos.value.length >= expectedVideoCount.value
  }
  return fallbackVideoUrls.value.length >= expectedVideoCount.value
})
const deliveredVideoCount = computed(() => {
  return successVideos.value.length || fallbackVideoUrls.value.length
})
const renderTaskCount = computed(() => {
  return trackedTasks.value.length || autoDetectedTaskIds.value.length
})
const renderCompletedCount = computed(() => {
  return trackedTasks.value.filter((task) => task.status === 'success').length
})
const renderSettled = computed(() => {
  return renderTaskCount.value > 0 && creativeStore.videoAllDone
})
const isRendering = computed(() => {
  if (hasVideos.value) return false
  return creativeStore.pipelineVideoStarted
    || creativeStore.pipelineRunning
    || renderTaskCount.value > 0
})

function getTaskProgress(task: { status: string; progress?: number }): number {
  if (task.status === 'success' || task.status === 'failed') return 100
  if (typeof task.progress === 'number') {
    return Math.max(0, Math.min(99, Math.round(task.progress)))
  }
  if (task.status === 'processing') return 45
  return 10
}

const overallProgress = computed(() => {
  if (hasVideos.value) return 100
  if (trackedTasks.value.length > 0) {
    const total = trackedTasks.value.reduce((sum, task) => sum + getTaskProgress(task), 0)
    const average = Math.max(5, Math.round(total / trackedTasks.value.length))
    return renderSettled.value ? 100 : Math.min(95, average)
  }
  if (renderTaskCount.value > 0) return 15
  if (creativeStore.pipelineVideoStarted) return creativeStore.pipelineRunning ? 8 : 12
  return 0
})

const progressTitle = computed(() => {
  if (renderSettled.value && deliveredVideoCount.value < expectedVideoCount.value) {
    return '渲染失败'
  }
  if (renderTaskCount.value > 0) {
    return '视频正在渲染'
  }
  if (creativeStore.pipelineVideoStarted) {
    return '正在准备渲染任务'
  }
  return '正在处理中'
})

const progressDescription = computed(() => {
  if (renderSettled.value && deliveredVideoCount.value < expectedVideoCount.value) {
    return `渲染任务已结束，但只拿到 ${deliveredVideoCount.value}/${expectedVideoCount.value} 个成片，请重新制作。`
  }
  if (renderTaskCount.value > 0) {
    return `已完成 ${renderCompletedCount.value}/${expectedVideoCount.value || renderTaskCount.value} 个视频渲染，请稍候，完成后会自动展示成片。`
  }
  return '系统正在接收渲染任务并同步进度，请稍候。'
})

function parseTaskIds(value: string): string[] {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function restoreFromRouteQuery() {
  const rawTaskIds = [
    route.query.taskId,
    route.query.taskIds,
  ].flatMap((value) => (typeof value === 'string' ? parseTaskIds(value) : []))
  const draftId = typeof route.query.draftId === 'string' ? route.query.draftId.trim() : ''

  if (rawTaskIds.length > 0 || draftId) {
    creativeStore.restoreResultContext({
      taskIds: rawTaskIds,
      draftId: draftId || null,
      pipelineVideoStarted: true,
    })
  }
}

// ── Draft info ───────────────────────────────────────────────────
const draftInfo = ref<DraftInfo | null>(null)
const draftLoading = ref(false)
const draftError = ref<string | null>(null)

async function loadDraftInfo() {
  const did = creativeStore.videoDraftId
  if (!did) return
  draftLoading.value = true
  draftError.value = null
  try {
    draftInfo.value = await getDraftTracks(did)
  } catch (e) {
    draftError.value = e instanceof Error ? e.message : String(e)
  } finally {
    draftLoading.value = false
  }
}

// ── Actions ──────────────────────────────────────────────────────
function startOver() {
  creativeStore.resetPipeline()
  creativeStore.resetCreative()
  workflowStore.resetWorkflow()
  router.push('/creative')
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const min = Math.floor(s / 60)
  const sec = s % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

function triggerConfetti() {
  const duration = 4 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) return clearInterval(interval)
    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

onMounted(() => {
  restoreFromRouteQuery()
  if (creativeStore.videoTaskIds.length === 0 && creativeStore.pipelineOutput) {
    creativeStore.recoverVideoTasksFromOutput()
  }
  creativeStore.resumePendingVideoPolling()
  if (hasVideos.value) triggerConfetti()
  if (creativeStore.videoDraftId) loadDraftInfo()
})

watch(
  () => creativeStore.videoDraftId,
  (draftId, previousDraftId) => {
    if (draftId && draftId !== previousDraftId) {
      void loadDraftInfo()
    }
  },
)

watch(
  hasVideos,
  (value, previousValue) => {
    if (value && !previousValue) {
      triggerConfetti()
    }
  },
)
</script>

<template>
  <div class="result-delivery flex flex-col h-full p-6 gap-6">
    <!-- Page header -->
    <div class="page-header p-5">
      <h1 class="page-title text-2xl font-bold text-gray-900">成片交付</h1>
      <p class="page-desc text-sm text-gray-500 mt-1">
        预览 AI 产线自动生成的营销视频，下载成片或查看剪映草稿
      </p>
    </div>

    <!-- Main content -->
    <div class="results-section glass-morphism flex-1 flex flex-col rounded-2xl overflow-hidden p-6">
      <!-- Failure notice -->
      <div v-if="failedVideos.length > 0 && hasVideos" class="failure-notice mb-4">
        <AlertTriangle :size="16" />
        <span>{{ failedVideos.length }} 个视频渲染失败</span>
      </div>

      <div v-if="isRendering" class="render-progress-state">
        <div class="render-progress-card">
          <div class="render-progress-head">
            <div class="render-progress-copy">
              <div class="render-progress-kicker">
                <Loader2 :size="14" class="animate-spin" />
                AI 正在处理
              </div>
              <h2 class="render-progress-title">{{ progressTitle }}</h2>
              <p class="render-progress-desc">{{ progressDescription }}</p>
            </div>
            <div class="render-progress-percent">{{ overallProgress }}%</div>
          </div>

          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${overallProgress}%` }"></div>
          </div>

          <div v-if="renderTaskCount > 0" class="render-task-grid">
            <div
              v-for="(task, idx) in trackedTasks"
              :key="task.task_id"
              class="render-task-card"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-gray-800">视频 {{ idx + 1 }}</div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{
                      task.status === 'success'
                        ? '渲染完成，正在准备展示'
                        : task.status === 'failed'
                          ? '渲染失败'
                          : '正在渲染中'
                    }}
                  </div>
                </div>
                <div class="render-task-percent">{{ getTaskProgress(task) }}%</div>
              </div>
              <div class="progress-track is-small mt-3">
                <div class="progress-fill" :style="{ width: `${getTaskProgress(task)}%` }"></div>
              </div>
            </div>
          </div>

          <div v-else class="render-progress-placeholder">
            系统正在接收渲染任务，完成后会自动展示视频成片。
          </div>

          <div v-if="renderSettled && deliveredVideoCount < expectedVideoCount" class="mt-6 flex justify-center">
            <el-button type="primary" @click="startOver">
              <RotateCw :size="16" class="mr-1" />
              重新制作
            </el-button>
          </div>
        </div>
      </div>

      <!-- Video cards -->
      <div v-else-if="hasVideos" class="video-grid">
        <div class="flex items-center gap-2 mb-4">
          <Film :size="20" class="text-purple-500" />
          <h3 class="text-lg font-semibold text-gray-900">AI 产线成片</h3>
          <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium ml-auto">
            {{ deliveredVideoCount }} 个视频
          </span>
        </div>

        <div
          v-if="successVideos.length > 0"
          class="grid gap-6"
          :class="successVideos.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'"
        >
          <div
            v-for="(vid, idx) in successVideos"
            :key="vid.task_id"
            class="video-card"
          >
            <div class="video-label">
              <span class="text-xs font-bold text-purple-600">视频 {{ idx + 1 }}</span>
              <span v-if="vid.duration" class="text-xs text-gray-400 ml-auto flex items-center gap-1">
                <Clock :size="12" />
                {{ formatDuration(vid.duration) }}
              </span>
            </div>
            <video
              :src="vid.video_url"
              controls
              :poster="vid.cover_url"
              class="w-full rounded-xl bg-black aspect-video"
            />
            <div class="video-actions mt-3 flex gap-2">
              <a
                :href="vid.video_url"
                target="_blank"
                download
                class="action-btn primary"
              >
                <Download :size="14" />
                下载成片
              </a>
              <a
                :href="vid.video_url"
                target="_blank"
                class="action-btn secondary"
              >
                <ExternalLink :size="14" />
                新窗口播放
              </a>
            </div>
          </div>
        </div>

        <div
          v-else
          class="grid gap-6"
          :class="fallbackVideoUrls.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'"
        >
          <div v-for="(url, idx) in fallbackVideoUrls" :key="url" class="video-card">
            <div class="video-label">
              <span class="text-xs font-bold text-purple-600">视频 {{ idx + 1 }}</span>
            </div>
            <video :src="url" controls class="w-full rounded-xl bg-black aspect-video" />
            <div class="video-actions mt-3 flex gap-2">
              <a :href="url" target="_blank" download class="action-btn primary">
                <Download :size="14" /> 下载成片
              </a>
              <a :href="url" target="_blank" class="action-btn secondary">
                <ExternalLink :size="14" /> 新窗口播放
              </a>
            </div>
          </div>
        </div>

        <!-- Draft info card -->
        <div v-if="creativeStore.videoDraftId" class="draft-section mt-6">
          <div class="flex items-center gap-2 mb-3">
            <Layers :size="18" class="text-purple-500" />
            <h3 class="text-base font-semibold text-gray-900">剪映草稿信息</h3>
          </div>

          <div v-if="draftLoading" class="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 :size="16" class="animate-spin" />
            加载草稿信息中...
          </div>

          <div v-else-if="draftError" class="text-sm text-red-500">
            草稿信息加载失败: {{ draftError }}
          </div>

          <div v-else-if="draftInfo" class="draft-card">
            <div class="text-xs text-gray-500 mb-3">草稿 ID: {{ draftInfo.draft_id }}</div>
            <div class="tracks-grid">
              <div
                v-for="track in draftInfo.tracks"
                :key="track.name"
                class="track-item"
              >
                <div class="track-name">{{ track.name }}</div>
                <div class="track-meta">
                  <span>类型: {{ track.type }}</span>
                  <span>片段: {{ track.segment_count }}</span>
                  <span v-if="track.end_time">时长: {{ formatDuration(track.end_time) }}</span>
                  <span v-if="track.muted" class="text-orange-500">已静音</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-sm text-gray-400">暂无草稿详情</div>
        </div>
      </div>

      <!-- No results -->
      <div v-else class="empty-results">
        <Video :size="64" class="text-gray-300" />
        <h2 class="text-xl font-semibold text-gray-700 mt-4">暂无渲染结果</h2>
        <p class="text-gray-500 mt-2 mb-4">请先完成创意生成与视频制作</p>
        <el-button type="primary" @click="router.push('/creative')">
          前往创意控制台
        </el-button>
      </div>
    </div>

    <!-- Action bar -->
    <div v-if="hasVideos" class="action-bar glass-morphism flex items-center justify-between p-4 rounded-2xl">
      <div class="success-count flex items-center gap-2 text-sm font-medium text-emerald-600">
        <CheckCircle2 :size="16" />
        {{ deliveredVideoCount }} 个视频已可查看
        <span v-if="failedVideos.length > 0" class="text-red-400 ml-2">
          ({{ failedVideos.length }} 个失败)
        </span>
      </div>
      <el-button size="large" @click="startOver">
        <RotateCw :size="16" class="mr-1" />
        重新制作
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.page-header {
  @apply bg-white border border-gray-200 rounded-2xl;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.glass-morphism:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.failure-notice {
  @apply flex items-center gap-2 p-3 rounded-lg text-sm font-medium;
  background: #FFF5F5;
  border: 1px solid #FFD6D6;
  color: #FF6B6B;
}

.render-progress-state {
  @apply flex-1 flex items-center justify-center;
}

.render-progress-card {
  @apply w-full max-w-4xl mx-auto p-8 rounded-3xl border border-gray-200 bg-white;
  box-shadow: 0 18px 50px rgba(124, 92, 252, 0.08);
}

.render-progress-head {
  @apply flex items-start justify-between gap-6 mb-6;
}

.render-progress-kicker {
  @apply inline-flex items-center gap-2 text-sm font-semibold text-purple-600 mb-3;
}

.render-progress-title {
  @apply text-3xl font-bold text-gray-900;
}

.render-progress-desc {
  @apply text-sm text-gray-500 mt-2 leading-6;
}

.render-progress-percent {
  @apply text-4xl font-bold text-purple-600 shrink-0;
}

.progress-track {
  @apply relative w-full overflow-hidden rounded-full;
  height: 14px;
  background: linear-gradient(90deg, #F3E8FF 0%, #F5F3FF 100%);
}

.progress-track.is-small {
  height: 8px;
}

.progress-fill {
  @apply h-full rounded-full;
  background: linear-gradient(90deg, #7C3AED 0%, #A855F7 100%);
  transition: width 0.4s ease;
}

.render-task-grid {
  @apply grid gap-4 mt-6;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.render-task-card {
  @apply p-4 rounded-2xl border border-gray-200 bg-gray-50;
}

.render-task-percent {
  @apply text-lg font-semibold text-purple-600;
}

.render-progress-placeholder {
  @apply mt-6 text-sm text-gray-500 text-center;
}

/* ── Video cards ──────────────────────────────── */
.video-card {
  @apply p-4 rounded-2xl border border-gray-200 bg-white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.video-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.video-label {
  @apply flex items-center mb-3;
}

.action-btn {
  @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer;
}
.action-btn.primary {
  @apply bg-purple-600 text-white hover:bg-purple-700;
}
.action-btn.secondary {
  @apply border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600;
}

/* ── Draft card ───────────────────────────────── */
.draft-card {
  @apply p-4 rounded-xl border border-gray-200 bg-gray-50;
}

.tracks-grid {
  @apply flex flex-col gap-2;
}

.track-item {
  @apply flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100;
}

.track-name {
  @apply text-sm font-medium text-gray-800;
}

.track-meta {
  @apply flex items-center gap-3 text-xs text-gray-500;
}

/* ── Empty state ──────────────────────────────── */
.empty-results {
  @apply flex flex-col items-center justify-center h-full text-center;
}

/* ── Action bar ───────────────────────────────── */
.action-bar {
  @apply bg-white border border-gray-200 rounded-2xl;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ── Element Plus overrides ───────────────────── */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}
:deep(.el-button--primary) {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
}
:deep(.el-button--primary:hover) {
  background-color: var(--brand-primary-dark);
  border-color: var(--brand-primary-dark);
}
</style>
