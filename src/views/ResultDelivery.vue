<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import { ElMessage } from 'element-plus'
import {
  createDraft,
  extractAllTaskIds,
  getDraftArchiveDownload,
  pollDraftArchiveDownload,
  saveDraftArchive,
  extractVideoUrls,
} from '@/api/capcut'
import type { DraftArchiveDownloadResponse } from '@/api/capcut'
import {
  Film, Download, ExternalLink, Video, RotateCw, CheckCircle2,
  AlertTriangle, Clock, Loader2,
} from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const EXPECTED_VIDEO_COUNT = 2

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
const expectedVideoCount = computed(() => EXPECTED_VIDEO_COUNT)
const hasVideos = computed(() => {
  if (successVideos.value.length > 0) {
    return true
  }
  return fallbackVideoUrls.value.length > 0
})
const deliveredVideoCount = computed(() => {
  return successVideos.value.length || fallbackVideoUrls.value.length
})
const missingVideoCount = computed(() => Math.max(0, expectedVideoCount.value - deliveredVideoCount.value))
const renderTaskCount = computed(() => {
  return trackedTasks.value.length || Math.min(autoDetectedTaskIds.value.length, EXPECTED_VIDEO_COUNT)
})
const renderCompletedCount = computed(() => {
  return trackedTasks.value.filter((task) => task.status === 'success').length
})
const renderSettled = computed(() => {
  return renderTaskCount.value > 0 && creativeStore.videoAllDone
})
const renderTaskDiscoveryFailed = computed(() => {
  return !hasVideos.value
    && !creativeStore.pipelineRunning
    && creativeStore.pipelineVideoStarted
    && trackedTasks.value.length === 0
    && autoDetectedTaskIds.value.length === 0
})
const isRendering = computed(() => {
  if (hasVideos.value) return false
  if (renderTaskDiscoveryFailed.value) return false
  return creativeStore.pipelineVideoStarted
    || creativeStore.pipelineRunning
    || renderTaskCount.value > 0
})
const showManualLookup = computed(() => {
  return failedVideos.value.length > 0
    || deliveredVideoCount.value < expectedVideoCount.value
    || trackedTasks.value.length > 0
    || !hasVideos.value
})
const manualTaskIds = ref('')
const manualLookupBusy = ref(false)
const draftName = ref('')
const draftWidth = ref(1080)
const draftHeight = ref(1920)
const createDraftBusy = ref(false)

type DraftStatusTone = 'idle' | 'ready' | 'working' | 'success' | 'error'

interface DraftArchiveState {
  archiveId: string
  folder: string
  archiveDraftBusy: boolean
  downloadDraftBusy: boolean
  archiveFeedback: string
  archiveLocation: string
  archivePending: boolean
  archiveReady: boolean
  archiveError: string
  readyArchiveDownload: DraftArchiveDownloadResponse | null
}

const draftArchiveStates = reactive<Record<string, DraftArchiveState>>({})
const archivePollTokens: Record<string, number> = {}

function createDraftArchiveState(): DraftArchiveState {
  return {
    archiveId: '',
    folder: '',
    archiveDraftBusy: false,
    downloadDraftBusy: false,
    archiveFeedback: '',
    archiveLocation: '',
    archivePending: false,
    archiveReady: false,
    archiveError: '',
    readyArchiveDownload: null,
  }
}

function ensureDraftArchiveState(draftId: string): DraftArchiveState {
  if (!draftArchiveStates[draftId]) {
    draftArchiveStates[draftId] = createDraftArchiveState()
  }
  const persistedArchiveId = creativeStore.getDraftArchiveId(draftId)
  if (persistedArchiveId && !draftArchiveStates[draftId].archiveId) {
    draftArchiveStates[draftId].archiveId = persistedArchiveId
  }
  return draftArchiveStates[draftId]
}

const linkedDraftIds = computed(() => {
  const seen = new Set<string>()
  const draftIds: string[] = []

  for (const status of videoStatuses.value) {
    const draftId = status.draft_id?.trim()
    if (draftId && !seen.has(draftId)) {
      seen.add(draftId)
      draftIds.push(draftId)
    }
  }

  for (const draftId of creativeStore.videoDraftIds) {
    const normalizedDraftId = draftId.trim()
    if (normalizedDraftId && !seen.has(normalizedDraftId)) {
      seen.add(normalizedDraftId)
      draftIds.push(normalizedDraftId)
    }
  }

  return draftIds.slice(0, EXPECTED_VIDEO_COUNT)
})

const hasLinkedDrafts = computed(() => linkedDraftIds.value.length > 0)

function buildDefaultDraftName(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  return `boke-draft-${stamp}`
}

const draftPanelDescription = computed(() => {
  if (!hasLinkedDrafts.value) {
    return '当前没有关联到 draft_id，可以先创建一个空白剪映草稿。'
  }
  if (linkedDraftIds.value.length === 1) {
    return '当前识别到 1 个剪映草稿。先发起归档，归档包生成后再下载。'
  }
  return `当前识别到 ${linkedDraftIds.value.length} 个剪映草稿。每个草稿都需要单独归档，归档包生成后再下载。`
})

function resetDraftArchiveState(draftId: string) {
  const state = ensureDraftArchiveState(draftId)
  state.archiveId = ''
  state.archivePending = false
  state.archiveReady = false
  state.archiveError = ''
  state.archiveFeedback = ''
  state.archiveLocation = ''
  state.readyArchiveDownload = null
  creativeStore.setDraftArchiveId(draftId, null)
}

function canCheckArchive(draftId: string): boolean {
  const state = ensureDraftArchiveState(draftId)
  return Boolean(draftId) && Boolean(state.archiveId) && !state.archivePending && !state.archiveDraftBusy
}

function getDraftStatusMeta(draftId: string): {
  tone: DraftStatusTone
  label: string
  title: string
  description: string
  guide: string
} {
  const state = ensureDraftArchiveState(draftId)

  if (state.archiveDraftBusy) {
    return {
      tone: 'working',
      label: '提交归档中',
      title: '正在提交草稿归档任务',
      description: '系统正在把当前 draft_id 发送到剪映归档接口。',
      guide: '提交后通常需要等待一段时间，归档包生成完成后才能下载。',
    }
  }

  if (state.archivePending) {
    return {
      tone: 'working',
      label: '归档生成中',
      title: '归档包正在后台生成',
      description: '归档接口已接收请求，系统会持续检查下载链接，准备好后会自动切换为可下载状态。',
      guide: '这一步通常需要几十秒。请等待状态变为“归档已就绪”后再点下载。',
    }
  }

  if (state.archiveReady) {
    return {
      tone: 'success',
      label: '归档已就绪',
      title: '草稿归档包已经可下载',
      description: '可以直接点击下载归档，拿到对应的剪映草稿包。',
      guide: '如果刷新页面后状态丢失，可以先点“检查归档状态”重新确认。',
    }
  }

  if (state.archiveError) {
    return {
      tone: 'error',
      label: '归档检查失败',
      title: '归档状态暂时不可确认',
      description: state.archiveError,
      guide: '如果刚刚提交过归档，通常只是归档包还没生成完，可以稍后再检查。',
    }
  }

  return {
    tone: 'ready',
    label: '草稿已关联',
    title: '当前视频已绑定剪映草稿',
    description: '先填写归档目录并发起归档。归档包准备完成后，按钮会切换为可下载状态。',
    guide: '先点“归档草稿”，提交后等待状态切换为“归档已就绪”，再下载。',
  }
}

const draftCards = computed(() => {
  return linkedDraftIds.value.map((draftId, index) => ({
    draftId,
    index,
    state: ensureDraftArchiveState(draftId),
    statusMeta: getDraftStatusMeta(draftId),
    canCheckArchive: canCheckArchive(draftId),
  }))
})

async function waitForArchiveReady(draftId: string) {
  const state = ensureDraftArchiveState(draftId)
  const archiveId = state.archiveId.trim()
  if (!archiveId) {
    state.archivePending = false
    state.archiveReady = false
    state.archiveError = '归档任务缺少 archive_id，无法检查归档状态'
    return
  }

  const token = (archivePollTokens[draftId] ?? 0) + 1
  archivePollTokens[draftId] = token

  state.archivePending = true
  state.archiveReady = false
  state.archiveError = ''
  state.readyArchiveDownload = null
  state.archiveFeedback = '归档任务已提交，正在等待归档包生成...'

  try {
    const result = await pollDraftArchiveDownload(archiveId, {
      intervalMs: 3000,
      timeoutMs: 180000,
    })

    if (token !== archivePollTokens[draftId]) return

    state.archivePending = false
    state.archiveReady = true
    state.archiveError = ''
    state.archiveId = result.archive_id || archiveId
    creativeStore.setDraftArchiveId(draftId, state.archiveId)
    state.readyArchiveDownload = result
    state.archiveFeedback = '归档包已生成，可以直接下载。'
    if (result.url) {
      state.archiveLocation = result.url
    }
  } catch (error) {
    if (token !== archivePollTokens[draftId]) return

    state.archivePending = false
    state.archiveReady = false
    state.archiveError = error instanceof Error ? error.message : '归档状态查询失败'
    state.archiveFeedback = '归档任务已提交，但归档包暂未就绪，请稍后再检查。'
  }
}

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
  if (renderSettled.value && deliveredVideoCount.value === 0) {
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
  if (renderSettled.value && deliveredVideoCount.value === 0) {
    return '渲染任务已结束，但没有拿到可播放的视频，请重新制作。'
  }
  if (renderTaskCount.value > 0) {
    return `已完成 ${renderCompletedCount.value}/${expectedVideoCount.value || renderTaskCount.value} 个视频渲染，拿到视频链接后会自动展示成片。`
  }
  return '系统正在接收渲染任务并同步进度，请稍候。'
})

function parseTaskIds(value: string): string[] {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getTaskStatusLabel(status: string): string {
  if (status === 'success') return '已拿到视频'
  if (status === 'failed') return '查询失败'
  if (status === 'processing') return '渲染中'
  return '待查询'
}

function getTaskError(task: {
  status: string
  error?: string
  message?: string | null
  render_status?: string
}): string | null {
  if (task.status === 'failed') {
    return task.error || task.message || null
  }
  if (task.render_status && task.status !== 'success') {
    return `render_status: ${task.render_status}`
  }
  return null
}

function queryTaskIds(taskIds: string[]) {
  const uniqueTaskIds = [...new Set(taskIds.map((item) => item.trim()).filter(Boolean))]
  if (uniqueTaskIds.length === 0) {
    ElMessage.warning('请输入 task_id')
    return
  }

  manualLookupBusy.value = true
  for (const taskId of uniqueTaskIds) {
    creativeStore.trackVideoTask(taskId)
  }
  manualTaskIds.value = ''
  manualLookupBusy.value = false
  ElMessage.success(`已发起 ${uniqueTaskIds.length} 个任务查询`)
}

function handleManualLookup() {
  queryTaskIds(parseTaskIds(manualTaskIds.value))
}

function retryTaskLookup(taskId: string) {
  queryTaskIds([taskId])
}

function retryOutputRecovery() {
  const recovered = creativeStore.recoverVideoTasksFromOutput()

  if (recovered.length > 0) {
    ElMessage.success(`已从输出中恢复 ${recovered.length} 个任务`)
    return
  }

  ElMessage.warning('当前输出里没有识别到 task_id，请手动补查或重新制作')
}

async function handleCreateDraft() {
  const name = draftName.value.trim()
  if (!name) {
    ElMessage.warning('请输入草稿名称')
    return
  }

  createDraftBusy.value = true

  try {
    const draft = await createDraft({
      name,
      width: draftWidth.value,
      height: draftHeight.value,
    })
    creativeStore.addVideoDraftId(draft.draft_id)
    resetDraftArchiveState(draft.draft_id)
    ElMessage.success(`草稿创建成功：${draft.draft_id}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建草稿失败')
  } finally {
    createDraftBusy.value = false
  }
}

async function handleArchiveDraft(draftId: string) {
  const state = ensureDraftArchiveState(draftId)
  const folder = state.folder.trim()

  if (!draftId) {
    ElMessage.warning('当前没有可归档的 draft_id')
    return
  }
  if (!folder) {
    ElMessage.warning('请输入归档目录')
    return
  }

  state.archiveDraftBusy = true
  state.archiveId = ''
  state.archiveReady = false
  state.archiveError = ''
  state.archiveFeedback = ''
  state.archiveLocation = ''
  state.readyArchiveDownload = null
  creativeStore.setDraftArchiveId(draftId, null)

  try {
    const result = await saveDraftArchive({
      draft_id: draftId,
      draft_folder: folder,
    })
    state.archiveId = result.archive_id
    creativeStore.setDraftArchiveId(draftId, result.archive_id)
    state.archiveFeedback = result.message || '已发起草稿归档，请等待归档包生成后再下载。'
    state.archiveLocation = result.archive_url || result.archive_path || result.archive_id
    ElMessage.success(`已提交归档：${draftId}，请等待归档包生成后再下载。`)
    void waitForArchiveReady(draftId)
  } catch (error) {
    state.archivePending = false
    state.archiveReady = false
    state.archiveError = error instanceof Error ? error.message : '草稿归档失败'
    ElMessage.error(error instanceof Error ? error.message : '草稿归档失败')
  } finally {
    state.archiveDraftBusy = false
  }
}

async function handleDownloadDraft(draftId: string) {
  const state = ensureDraftArchiveState(draftId)
  const archiveId = state.archiveId.trim()
  if (!draftId) {
    ElMessage.warning('当前没有可下载的 draft_id')
    return
  }
  if (!archiveId) {
    ElMessage.warning('当前还没有 archive_id，请先发起归档')
    return
  }

  state.downloadDraftBusy = true

  try {
    const result = state.readyArchiveDownload
      ?? await getDraftArchiveDownload(archiveId)

    if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
      state.archivePending = false
      state.archiveReady = true
      state.archiveId = result.archive_id || archiveId
      state.readyArchiveDownload = result
      state.archiveLocation = result.url
      creativeStore.setDraftArchiveId(draftId, state.archiveId)
      ElMessage.success(`已打开归档下载链接：${draftId}`)
      return
    }

    if (result.blob) {
      const objectUrl = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = result.filename || `${archiveId}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      state.archivePending = false
      state.archiveReady = true
      state.archiveId = result.archive_id || archiveId
      state.readyArchiveDownload = result
      creativeStore.setDraftArchiveId(draftId, state.archiveId)
      ElMessage.success(`归档下载已开始：${draftId}`)
      return
    }

    throw new Error('下载接口未返回可用内容')
  } catch (error) {
    state.archiveError = error instanceof Error ? error.message : '归档下载失败'
    ElMessage.error(error instanceof Error ? error.message : '归档下载失败')
  } finally {
    state.downloadDraftBusy = false
  }
}

function restoreFromRouteQuery() {
  const rawTaskIds = [
    route.query.taskId,
    route.query.taskIds,
  ].flatMap((value) => (typeof value === 'string' ? parseTaskIds(value) : []))
  const rawDraftIds = [
    route.query.draftId,
    route.query.draftIds,
  ].flatMap((value) => (typeof value === 'string' ? parseTaskIds(value) : []))

  if (rawTaskIds.length > 0 || rawDraftIds.length > 0) {
    creativeStore.restoreResultContext({
      taskIds: rawTaskIds,
      draftIds: rawDraftIds,
      draftId: rawDraftIds[0] || null,
      pipelineVideoStarted: true,
    })
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
  draftName.value = buildDefaultDraftName()
  restoreFromRouteQuery()
  if (creativeStore.videoTaskIds.length === 0 && creativeStore.pipelineOutput) {
    creativeStore.recoverVideoTasksFromOutput()
  }
  creativeStore.resumePendingVideoPolling()
  if (hasVideos.value) triggerConfetti()
})

watch(
  hasVideos,
  (value, previousValue) => {
    if (value && !previousValue) {
      triggerConfetti()
    }
  },
)

watch(
  linkedDraftIds,
  (draftIds) => {
    for (const draftId of draftIds) {
      ensureDraftArchiveState(draftId)
    }
    for (const draftId of Object.keys(draftArchiveStates)) {
      if (!draftIds.includes(draftId)) {
        delete draftArchiveStates[draftId]
        delete archivePollTokens[draftId]
      }
    }
    if (!draftName.value) {
      draftName.value = buildDefaultDraftName()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="result-delivery flex flex-col h-full p-6 gap-6">
    <!-- Page header -->
    <div class="page-header p-5">
      <h1 class="page-title text-2xl font-bold text-gray-900">成片交付</h1>
      <p class="page-desc text-sm text-gray-500 mt-1">
        预览 AI 产线自动生成的营销视频，并直接下载成片
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
              <div v-if="getTaskError(task)" class="render-task-error">
                {{ getTaskError(task) }}
              </div>
            </div>
          </div>

          <div v-else class="render-progress-placeholder">
            系统正在接收渲染任务，完成后会自动展示视频成片。
          </div>

          <div v-if="renderSettled && deliveredVideoCount === 0" class="mt-6 flex justify-center">
            <el-button type="primary" @click="startOver">
              <RotateCw :size="16" class="mr-1" />
              重新制作
            </el-button>
          </div>
        </div>
      </div>

      <div v-else-if="renderTaskDiscoveryFailed" class="render-progress-state">
        <div class="render-progress-card is-warning">
          <div class="render-progress-head">
            <div class="render-progress-copy">
              <div class="render-progress-kicker is-warning">
                <AlertTriangle :size="14" />
                渲染任务未返回
              </div>
              <h2 class="render-progress-title">没有拿到可追踪的 task_id</h2>
              <p class="render-progress-desc">
                本次视频流程已经结束，但前端没有从返回结果中识别到任务 ID 或成片链接，所以不会继续自动轮询。
                你可以先手动补查 task_id，或重新尝试制作。
              </p>
            </div>
            <div class="render-progress-percent is-warning">--</div>
          </div>

          <div class="warning-panel">
            <div class="warning-panel__title">建议处理方式</div>
            <div class="warning-panel__item">如果你手里有 task_id，直接在下方“补查任务 ID”里查询。</div>
            <div class="warning-panel__item">如果没有 task_id，可以点“重新识别输出”，再试一次从 pipeline 输出里恢复。</div>
            <div class="warning-panel__item">如果仍然没有结果，说明后端这次没有返回可追踪任务，直接重新制作更稳。</div>
          </div>

          <div class="warning-actions">
            <el-button @click="retryOutputRecovery">
              重新识别输出
            </el-button>
            <el-button type="primary" @click="startOver">
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

    <div class="draft-panel glass-morphism rounded-2xl p-5">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900">剪映草稿</h3>
          <p class="text-sm text-gray-500 mt-1">{{ draftPanelDescription }}</p>
        </div>
        <div v-if="hasLinkedDrafts" class="draft-chip">
          {{ linkedDraftIds.length }} 个 draft
        </div>
      </div>

      <div v-if="hasLinkedDrafts" class="draft-card-grid">
        <div
          v-for="card in draftCards"
          :key="card.draftId"
          class="draft-card-shell"
        >
          <div class="draft-status-card" :class="`is-${card.statusMeta.tone}`">
            <div class="flex items-start justify-between gap-4">
              <div class="draft-status-main">
                <div class="draft-status-badge" :class="`is-${card.statusMeta.tone}`">
                  <Loader2 v-if="card.statusMeta.tone === 'working'" :size="14" class="animate-spin" />
                  <CheckCircle2 v-else-if="card.statusMeta.tone === 'success'" :size="14" />
                  <AlertTriangle v-else-if="card.statusMeta.tone === 'error'" :size="14" />
                  <Clock v-else :size="14" />
                  {{ card.statusMeta.label }}
                </div>
                <div class="draft-status-title">视频 {{ card.index + 1 }} 草稿</div>
                <div class="draft-status-desc">{{ card.statusMeta.description }}</div>
              </div>
              <div class="draft-chip is-inline">
                {{ card.draftId }}
              </div>
            </div>

            <div class="draft-guide-note">
              {{ card.statusMeta.guide }}
            </div>

            <div class="draft-step-row">
              <div class="draft-step" :class="{ done: true }">
                <div class="draft-step-dot">1</div>
                <div class="draft-step-label">草稿已关联</div>
              </div>
              <div class="draft-step-line" :class="{ done: card.state.archivePending || card.state.archiveReady || Boolean(card.state.archiveError) }"></div>
              <div class="draft-step" :class="{ done: card.state.archivePending || card.state.archiveReady || Boolean(card.state.archiveError), active: card.state.archivePending }">
                <div class="draft-step-dot">2</div>
                <div class="draft-step-label">发起归档</div>
              </div>
              <div class="draft-step-line" :class="{ done: card.state.archiveReady }"></div>
              <div class="draft-step" :class="{ done: card.state.archiveReady, active: card.state.downloadDraftBusy }">
                <div class="draft-step-dot">3</div>
                <div class="draft-step-label">下载归档</div>
              </div>
            </div>

            <div class="draft-meta-grid">
              <div class="draft-meta-item">
                <div class="draft-meta-label">Draft ID</div>
                <div class="draft-meta-value">{{ card.draftId }}</div>
              </div>
              <div class="draft-meta-item">
                <div class="draft-meta-label">Video Slot</div>
                <div class="draft-meta-value">视频 {{ card.index + 1 }}</div>
              </div>
              <div class="draft-meta-item">
                <div class="draft-meta-label">Archive Status</div>
                <div class="draft-meta-value">{{ card.statusMeta.label }}</div>
              </div>
              <div class="draft-meta-item">
                <div class="draft-meta-label">Archive ID</div>
                <div class="draft-meta-value">{{ card.state.archiveId || '待归档生成' }}</div>
              </div>
              <div class="draft-meta-item">
                <div class="draft-meta-label">Archive Folder</div>
                <div class="draft-meta-value">{{ card.state.folder || '未填写' }}</div>
              </div>
            </div>

            <div class="draft-archive-grid">
              <el-input
                v-model="card.state.folder"
                placeholder="输入归档目录，例如 C:/"
                clearable
                @keyup.enter="handleArchiveDraft(card.draftId)"
              />
              <div class="draft-action-row">
                <el-button
                  type="primary"
                  :loading="card.state.archiveDraftBusy"
                  @click="handleArchiveDraft(card.draftId)"
                >
                  归档草稿
                </el-button>
                <el-button
                  :disabled="!card.canCheckArchive"
                  :loading="card.state.downloadDraftBusy"
                  @click="handleDownloadDraft(card.draftId)"
                >
                  {{
                    card.state.archivePending
                      ? '归档生成中...'
                      : card.state.archiveReady
                        ? '下载归档'
                        : card.state.archiveId
                          ? '检查归档状态'
                          : '等待归档任务'
                  }}
                </el-button>
              </div>
              <div v-if="card.state.archiveFeedback || card.state.archiveLocation" class="draft-feedback">
                <div v-if="card.state.archiveFeedback">{{ card.state.archiveFeedback }}</div>
                <div v-if="card.state.archiveLocation" class="break-all text-gray-500">
                  {{ card.state.archiveLocation }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="draft-create-grid">
        <el-input v-model="draftName" placeholder="输入草稿名称" clearable />
        <el-input-number v-model="draftWidth" :min="1" :step="1" controls-position="right" />
        <el-input-number v-model="draftHeight" :min="1" :step="1" controls-position="right" />
        <el-button type="primary" :loading="createDraftBusy" @click="handleCreateDraft">
          创建剪映草稿
        </el-button>
      </div>
    </div>

    <div v-if="showManualLookup" class="manual-query-panel glass-morphism rounded-2xl p-5">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900">补查任务 ID</h3>
          <p class="text-sm text-gray-500 mt-1">
            <template v-if="missingVideoCount > 0">
              当前还缺少 {{ missingVideoCount }} 个视频，可以手动输入 task_id 直接查询视频链接。
            </template>
            <template v-else>
              可以手动输入 task_id 重新查询当前任务状态。
            </template>
          </p>
        </div>
      </div>

      <div class="manual-query-form">
        <el-input
          v-model="manualTaskIds"
          placeholder="输入一个或多个 task_id，支持空格或逗号分隔"
          clearable
          @keyup.enter="handleManualLookup"
        />
        <el-button type="primary" :loading="manualLookupBusy" @click="handleManualLookup">
          查询 task_id
        </el-button>
      </div>

      <div v-if="trackedTasks.length > 0" class="manual-query-tasks">
          <div
          v-for="task in trackedTasks"
          :key="task.task_id"
          class="manual-query-task"
        >
          <div class="min-w-0">
            <div class="manual-query-task__id">{{ task.task_id }}</div>
            <div class="manual-query-task__meta">{{ getTaskStatusLabel(task.status) }}</div>
            <div v-if="getTaskError(task)" class="manual-query-task__error">
              {{ getTaskError(task) }}
            </div>
          </div>
          <el-button text type="primary" @click="retryTaskLookup(task.task_id)">
            重新查询
          </el-button>
        </div>
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

.render-progress-card.is-warning {
  box-shadow: 0 18px 50px rgba(245, 158, 11, 0.1);
}

.render-progress-head {
  @apply flex items-start justify-between gap-6 mb-6;
}

.render-progress-kicker {
  @apply inline-flex items-center gap-2 text-sm font-semibold text-purple-600 mb-3;
}

.render-progress-kicker.is-warning {
  color: #d97706;
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

.render-progress-percent.is-warning {
  color: #d97706;
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

.render-task-error {
  @apply mt-3 text-xs leading-5 text-red-500 break-all;
}

.render-progress-placeholder {
  @apply mt-6 text-sm text-gray-500 text-center;
}

.warning-panel {
  @apply mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900;
}

.warning-panel__title {
  @apply font-semibold mb-2;
}

.warning-panel__item {
  @apply leading-6;
}

.warning-actions {
  @apply mt-6 flex items-center justify-center gap-3;
}

.manual-query-panel {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.draft-panel {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.draft-chip {
  @apply shrink-0 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700;
}

.draft-chip.is-inline {
  @apply max-w-full break-all;
}

.draft-card-grid {
  @apply grid gap-4;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.draft-card-shell {
  @apply min-w-0;
}

.draft-status-card {
  @apply rounded-2xl border px-4 py-4 mb-4;
}

.draft-status-card.is-idle,
.draft-status-card.is-ready {
  @apply border-gray-200 bg-gray-50;
}

.draft-status-card.is-working {
  border-color: #d8b4fe;
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%);
}

.draft-status-card.is-success {
  border-color: #86efac;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.draft-status-card.is-error {
  border-color: #fca5a5;
  background: linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%);
}

.draft-status-main {
  @apply flex flex-col gap-2;
}

.draft-status-badge {
  @apply inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold;
}

.draft-status-badge.is-idle,
.draft-status-badge.is-ready {
  @apply bg-white text-gray-600 border border-gray-200;
}

.draft-status-badge.is-working {
  color: #7c3aed;
  background: rgba(255, 255, 255, 0.9);
}

.draft-status-badge.is-success {
  color: #15803d;
  background: rgba(255, 255, 255, 0.92);
}

.draft-status-badge.is-error {
  color: #dc2626;
  background: rgba(255, 255, 255, 0.92);
}

.draft-status-title {
  @apply text-lg font-semibold text-gray-900;
}

.draft-status-desc {
  @apply text-sm leading-6 text-gray-600;
}

.draft-guide-note {
  @apply mt-4 rounded-xl border border-dashed border-gray-200 bg-white/80 px-3 py-3 text-sm leading-6 text-gray-600;
}

.draft-step-row {
  @apply mt-4 flex items-center gap-2;
}

.draft-step {
  @apply flex min-w-0 items-center gap-2 text-sm text-gray-400;
}

.draft-step.active {
  color: #7c3aed;
}

.draft-step.done {
  color: #111827;
}

.draft-step-dot {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold;
}

.draft-step.active .draft-step-dot {
  border-color: #c084fc;
  color: #7c3aed;
}

.draft-step.done .draft-step-dot {
  border-color: #86efac;
  background: #f0fdf4;
  color: #15803d;
}

.draft-step-label {
  @apply whitespace-nowrap;
}

.draft-step-line {
  @apply h-px flex-1 bg-gray-200;
}

.draft-step-line.done {
  background: linear-gradient(90deg, #86efac 0%, #c084fc 100%);
}

.draft-meta-grid {
  @apply mt-4 grid gap-3;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.draft-meta-item {
  @apply rounded-xl border border-white/70 bg-white/80 px-3 py-3;
}

.draft-meta-label {
  @apply text-xs uppercase tracking-wide text-gray-400;
}

.draft-meta-value {
  @apply mt-2 text-sm font-medium text-gray-800 break-all;
}

.draft-create-grid {
  @apply grid gap-3 items-center;
  grid-template-columns: minmax(0, 1.8fr) 120px 120px auto;
}

.draft-archive-grid {
  @apply grid gap-3;
  grid-template-columns: minmax(0, 1.6fr) auto;
}

.draft-action-row {
  @apply flex items-center gap-3;
}

.draft-feedback {
  @apply col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700;
}

.manual-query-form {
  @apply flex items-center gap-3;
}

.manual-query-tasks {
  @apply grid gap-3 mt-4;
}

.manual-query-task {
  @apply flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50;
}

.manual-query-task__id {
  @apply text-sm font-medium text-gray-800 truncate;
}

.manual-query-task__meta {
  @apply text-xs text-gray-500 mt-1;
}

.manual-query-task__error {
  @apply text-xs text-red-500 mt-1 break-all;
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
:deep(.el-input__wrapper) {
  border-radius: 10px;
}

@media (max-width: 960px) {
  .draft-card-grid {
    grid-template-columns: 1fr;
  }

  .draft-create-grid,
  .draft-archive-grid {
    grid-template-columns: 1fr;
  }

  .draft-step-row {
    @apply flex-col items-stretch;
  }

  .draft-step-line {
    @apply h-6 w-px ml-3.5;
  }

  .draft-meta-grid {
    grid-template-columns: 1fr;
  }

  .draft-feedback {
    @apply col-span-1;
  }
}
</style>
