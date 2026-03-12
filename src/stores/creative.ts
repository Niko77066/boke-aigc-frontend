import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { TaskConfig, Script } from '@/types'
import { agentApi } from '@/api'
import {
  callPipelineStream,
  type PipelineMode,
  type VoiceOption,
  type SubtitleOption,
} from '@/api/pipeline'
import {
  extractAllTaskIds,
  extractAllDraftIds,
  pollVideoTask,
  type VideoTaskStatus,
} from '@/api/capcut'
import { KB_ID } from '@/utils/constants'

const CREATIVE_STORAGE_KEY = 'boke-aigc:creative'
const EXPECTED_VIDEO_TASK_COUNT = 2

function normalizeVideoTaskIdsList(taskIds: string[]): string[] {
  return [...new Set(taskIds)].slice(-EXPECTED_VIDEO_TASK_COUNT)
}

function normalizeVideoDraftIdsList(draftIds: string[]): string[] {
  return [...new Set(draftIds.map((draftId) => draftId.trim()).filter(Boolean))].slice(-EXPECTED_VIDEO_TASK_COUNT)
}

interface PersistedCreativeState {
  taskConfig: TaskConfig | null
  pipelineMode: PipelineMode
  pipelineOutput: string
  pipelineChatId?: string
  pipelineError: string | null
  pipelineVideoStarted: boolean
  videoTaskIds: string[]
  videoDraftIds?: string[]
  videoDraftId: string | null
  draftArchiveIds?: Record<string, string>
  videoRenderStatuses: VideoTaskStatus[]
}

function loadPersistedState(): PersistedCreativeState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CREATIVE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedCreativeState
  } catch {
    return null
  }
}

function persistState(state: PersistedCreativeState) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(CREATIVE_STORAGE_KEY, JSON.stringify(state))
}

export const useCreativeStore = defineStore('creative', () => {
  const persisted = loadPersistedState()
  const initialVideoTaskIds = normalizeVideoTaskIdsList(persisted?.videoTaskIds ?? [])
  const initialVideoDraftIds = normalizeVideoDraftIdsList(
    persisted?.videoDraftIds
      ?? (persisted?.videoDraftId ? [persisted.videoDraftId] : []),
  )
  const initialDraftArchiveIds = Object.fromEntries(
    Object.entries(persisted?.draftArchiveIds ?? {})
      .map(([draftId, archiveId]) => [draftId.trim(), archiveId.trim()] as const)
      .filter(([draftId, archiveId]) => Boolean(draftId) && Boolean(archiveId)),
  )
  const initialVideoRenderStatuses = new Map(
    (persisted?.videoRenderStatuses ?? [])
      .filter((status) => initialVideoTaskIds.includes(status.task_id))
      .map((status) => [status.task_id, status] as const),
  )

  // ── Form / config state ─────────────────────────────────────────
  const taskConfig = ref<TaskConfig | null>(persisted?.taskConfig ?? null)

  // ── Pipeline state ──────────────────────────────────────────────
  const pipelineMode = ref<PipelineMode>(persisted?.pipelineMode ?? '文案')
  const pipelineRunning = ref(false)
  const pipelineOutput = ref(persisted?.pipelineOutput ?? '')
  const pipelineChatId = ref<string | undefined>(persisted?.pipelineChatId)
  const pipelineError = ref<string | null>(persisted?.pipelineError ?? null)
  const pipelineVideoStarted = ref(persisted?.pipelineVideoStarted ?? false)

  // ── Script selection (legacy mock) ──────────────────────────────
  const scripts = ref<Script[]>([])
  const selectedScript = ref<Script | null>(null)
  const generating = ref(false)
  const generationProgress = ref(0)
  const error = ref<string | null>(null)

  // ── Video render tracking (CapCut MCP) — multi task_id ──────────
  const videoTaskIds = ref<string[]>(initialVideoTaskIds)
  const videoDraftIds = ref<string[]>(initialVideoDraftIds)
  const videoDraftId = computed(() => videoDraftIds.value[0] ?? null)
  const draftArchiveIds = ref<Record<string, string>>(initialDraftArchiveIds)
  const videoRenderStatuses = ref<Map<string, VideoTaskStatus>>(initialVideoRenderStatuses)
  const videoPollingCount = ref(0)
  const activeVideoPolling = new Set<string>()
  const hasRecoverableResult = computed(() => {
    return pipelineVideoStarted.value
      || videoTaskIds.value.length > 0
      || videoRenderStatuses.value.size > 0
      || videoDraftIds.value.length > 0
  })

  /** True when all polling tasks have finished (success or failed) */
  const videoAllDone = computed(() => {
    if (videoTaskIds.value.length === 0) return false
    if (videoPollingCount.value > 0) return false
    return videoTaskIds.value.every((tid) => {
      const s = videoRenderStatuses.value.get(tid)
      return s?.status === 'success' || s?.status === 'failed'
    })
  })

  /** Convenience: array of all statuses */
  const videoStatusList = computed(() => {
    return videoTaskIds.value
      .map((tid) => videoRenderStatuses.value.get(tid))
      .filter((s): s is VideoTaskStatus => !!s)
  })

  /** Callback invoked when all video tasks finish — set by the view for auto-redirect */
  let _onAllVideosDone: (() => void) | null = null
  function onAllVideosDone(cb: () => void) {
    _onAllVideosDone = cb
  }

  let abortController: AbortController | null = null

  watch(
    () => ({
      taskConfig: taskConfig.value,
      pipelineMode: pipelineMode.value,
      pipelineOutput: pipelineOutput.value,
      pipelineChatId: pipelineChatId.value,
      pipelineError: pipelineError.value,
      pipelineVideoStarted: pipelineVideoStarted.value,
      videoTaskIds: videoTaskIds.value,
      videoDraftIds: videoDraftIds.value,
      videoDraftId: videoDraftId.value,
      draftArchiveIds: draftArchiveIds.value,
      videoRenderStatuses: [...videoRenderStatuses.value.values()],
    }),
    (state) => {
      persistState(state)
    },
    { deep: true },
  )

  function clearVideoTracking() {
    videoTaskIds.value = []
    videoDraftIds.value = []
    draftArchiveIds.value = {}
    videoRenderStatuses.value = new Map()
    videoPollingCount.value = 0
    activeVideoPolling.clear()
  }

  function normalizeVideoTaskIds(taskIds: string[]): string[] {
    return normalizeVideoTaskIdsList(taskIds)
  }

  function normalizeVideoDraftIds(draftIds: string[]): string[] {
    return normalizeVideoDraftIdsList(draftIds)
  }

  function applyVideoTaskIds(taskIds: string[]) {
    const normalized = normalizeVideoTaskIds(taskIds)
    videoTaskIds.value = normalized

    const nextStatuses = new Map<string, VideoTaskStatus>()
    for (const taskId of normalized) {
      const status = videoRenderStatuses.value.get(taskId)
      if (status) nextStatuses.set(taskId, status)
    }
    videoRenderStatuses.value = nextStatuses

    return normalized
  }

  function applyVideoDraftIds(draftIds: string[]) {
    const normalized = normalizeVideoDraftIds(draftIds)
    const allowedDraftIds = new Set(normalized)
    const nextArchiveIds = Object.fromEntries(
      Object.entries(draftArchiveIds.value).filter(([draftId]) => allowedDraftIds.has(draftId)),
    )

    videoDraftIds.value = normalized
    draftArchiveIds.value = nextArchiveIds
    return videoDraftIds.value
  }

  function addVideoDraftId(draftId: string) {
    const normalizedDraftId = draftId.trim()
    if (!normalizedDraftId) return videoDraftIds.value
    return applyVideoDraftIds([...videoDraftIds.value, normalizedDraftId])
  }

  function setDraftArchiveId(draftId: string, archiveId: string | null) {
    const normalizedDraftId = draftId.trim()
    if (!normalizedDraftId) return

    const nextArchiveIds = { ...draftArchiveIds.value }
    const normalizedArchiveId = archiveId?.trim()

    if (normalizedArchiveId) {
      nextArchiveIds[normalizedDraftId] = normalizedArchiveId
    } else {
      delete nextArchiveIds[normalizedDraftId]
    }

    draftArchiveIds.value = nextArchiveIds
  }

  function getDraftArchiveId(draftId: string): string | null {
    const normalizedDraftId = draftId.trim()
    if (!normalizedDraftId) return null
    return draftArchiveIds.value[normalizedDraftId] ?? null
  }

  // ── Config helpers ──────────────────────────────────────────────
  function updateTaskConfig(config: Partial<TaskConfig>) {
    if (taskConfig.value) {
      taskConfig.value = { ...taskConfig.value, ...config }
    } else {
      taskConfig.value = {
        audience: 'premium',
        brainstorm_keywords: [],
        kb_id: KB_ID,
        ...config,
      }
    }
  }

  function getVoice(): VoiceOption {
    return (taskConfig.value?.voice as VoiceOption) || '气场御姐'
  }
  function getSubtitle(): SubtitleOption {
    return (taskConfig.value?.subtitle as SubtitleOption) || '轻快醒目'
  }

  // ── Legacy mock actions ─────────────────────────────────────────
  async function generateScripts() {
    if (!taskConfig.value) return
    generating.value = true
    generationProgress.value = 0
    error.value = null

    try {
      const progressTimer = setInterval(() => {
        if (generationProgress.value < 90) {
          generationProgress.value += Math.floor(Math.random() * 15) + 5
        }
      }, 800)

      const response = await agentApi.generateCopy({
        action_route: 'generate_copy',
        audience: taskConfig.value.audience,
        reference_copy: taskConfig.value.reference_copy,
        brainstorm_keywords: taskConfig.value.brainstorm_keywords,
        kb_id: taskConfig.value.kb_id,
      })

      clearInterval(progressTimer)
      generationProgress.value = 100
      scripts.value = response.scripts
    } catch (e) {
      error.value = e instanceof Error ? e.message : '文案生成失败，请重试'
    } finally {
      generating.value = false
    }
  }

  function selectScript(scriptId: string) {
    const script = scripts.value.find((s) => s.id === scriptId)
    if (script) selectedScript.value = script
  }

  function updateScript(script: Script) {
    const idx = scripts.value.findIndex((s) => s.id === script.id)
    if (idx >= 0) scripts.value[idx] = script
    if (selectedScript.value?.id === script.id) selectedScript.value = script
  }

  function resetCreative() {
    taskConfig.value = null
    scripts.value = []
    selectedScript.value = null
    generating.value = false
    generationProgress.value = 0
    error.value = null
  }

  // ── Pipeline actions ────────────────────────────────────────────

  async function generateCopy(msg: string) {
    abortPipeline()
    clearVideoTracking()
    pipelineMode.value = '文案'
    pipelineRunning.value = true
    pipelineOutput.value = ''
    pipelineError.value = null
    pipelineVideoStarted.value = false

    abortController = new AbortController()

    await callPipelineStream(
      {
        variables: { mode: '文案', voice: getVoice(), text: getSubtitle() },
        userMessage: msg,
        chatId: pipelineChatId.value,
      },
      (delta) => { pipelineOutput.value += delta },
      (fullText, chatId) => {
        pipelineOutput.value = fullText
        if (chatId) pipelineChatId.value = chatId
        pipelineRunning.value = false
      },
      (err) => {
        pipelineError.value = err.message
        pipelineRunning.value = false
      },
      abortController.signal,
    )
  }

  async function generateVideo(script: string, msg?: string) {
    abortPipeline()
    clearVideoTracking()
    pipelineMode.value = '视频'
    pipelineRunning.value = true
    pipelineOutput.value = ''
    pipelineError.value = null
    pipelineVideoStarted.value = true

    abortController = new AbortController()

    await callPipelineStream(
      {
        variables: { mode: '视频', copy: script, voice: getVoice(), text: getSubtitle() },
        userMessage: msg || '请根据这份文案为我制作营销视频',
        chatId: pipelineChatId.value,
      },
      (delta) => { pipelineOutput.value += delta },
      (fullText, chatId) => {
        pipelineOutput.value = fullText
        if (chatId) pipelineChatId.value = chatId
        pipelineRunning.value = false
        autoDetectAndPoll(fullText)
      },
      (err) => {
        pipelineError.value = err.message
        pipelineRunning.value = false
      },
      abortController.signal,
    )
  }

  function abortPipeline() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    pipelineRunning.value = false
  }

  function resetPipeline() {
    abortPipeline()
    pipelineMode.value = '文案'
    pipelineOutput.value = ''
    pipelineChatId.value = undefined
    pipelineError.value = null
    pipelineVideoStarted.value = false
    clearVideoTracking()
    _onAllVideosDone = null
  }

  // ── Video render tracking ───────────────────────────────────────

  function syncVideoTasksFromOutput(text: string): string[] {
    const tids = extractAllTaskIds(text)
    const draftIds = extractAllDraftIds(text)
    if (tids.length > 0) {
      applyVideoTaskIds(tids)
    }
    if (draftIds.length > 0) {
      applyVideoDraftIds([...videoDraftIds.value, ...draftIds])
    }
    return normalizeVideoTaskIds(tids)
  }

  function autoDetectAndPoll(text: string) {
    const tids = syncVideoTasksFromOutput(text)

    if (tids.length > 0) {
      for (const tid of tids) {
        startVideoPolling(tid)
      }
    }

    // 视频流输出结束后就跳转到成片交付页。
    // 如果识别到了 task_id，结果页会继续轮询并展示渲染状态；
    // 如果没有识别到，也允许结果页做兜底恢复和手动补查。
    if (_onAllVideosDone) {
      const callback = _onAllVideosDone
      _onAllVideosDone = null
      callback()
    }
  }

  async function startVideoPolling(taskId: string) {
    if (activeVideoPolling.has(taskId)) return

    activeVideoPolling.add(taskId)
    videoPollingCount.value++

    try {
      const final = await pollVideoTask(
        taskId,
        (status) => {
          if (status.draft_id) {
            addVideoDraftId(status.draft_id)
          }
          videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, status))
        },
        5000,
        300000,
      )
      if (final.draft_id) {
        addVideoDraftId(final.draft_id)
      }
      videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, final))
    } catch (e) {
      const errStatus: VideoTaskStatus = {
        task_id: taskId,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      }
      videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, errStatus))
    } finally {
      activeVideoPolling.delete(taskId)
      videoPollingCount.value--
      // Check if ALL polling is done
      if (videoPollingCount.value === 0 && _onAllVideosDone) {
        _onAllVideosDone()
      }
    }
  }

  function trackVideoTask(taskId: string) {
    applyVideoTaskIds([...videoTaskIds.value, taskId])
    startVideoPolling(taskId)
  }

  function setVideoDraftId(draftId: string | null) {
    videoDraftIds.value = draftId ? [draftId.trim()].filter(Boolean) : []
  }

  function setVideoDraftIds(draftIds: string[]) {
    applyVideoDraftIds(draftIds)
  }

  function restoreResultContext(payload: {
    taskIds?: string[]
    draftIds?: string[]
    draftId?: string | null
    pipelineOutput?: string
    pipelineVideoStarted?: boolean
  }) {
    if (payload.taskIds?.length) {
      applyVideoTaskIds(payload.taskIds)
    }
    if (payload.draftIds?.length) {
      applyVideoDraftIds(payload.draftIds)
    } else if (payload.draftId) {
      setVideoDraftId(payload.draftId)
    }
    if (payload.pipelineOutput !== undefined) {
      pipelineOutput.value = payload.pipelineOutput
    }
    if (payload.pipelineVideoStarted !== undefined) {
      pipelineVideoStarted.value = payload.pipelineVideoStarted
    }
  }

  function resumePendingVideoPolling() {
    for (const taskId of videoTaskIds.value) {
      const status = videoRenderStatuses.value.get(taskId)
      if (!status || (status.status !== 'success' && status.status !== 'failed')) {
        startVideoPolling(taskId)
      }
    }
  }

  function recoverVideoTasksFromOutput(text?: string) {
    const sourceText = text ?? pipelineOutput.value
    if (!sourceText.trim()) return []

    const taskIds = syncVideoTasksFromOutput(sourceText)
    for (const taskId of taskIds) {
      const status = videoRenderStatuses.value.get(taskId)
      if (!status || (status.status !== 'success' && status.status !== 'failed')) {
        startVideoPolling(taskId)
      }
    }
    return taskIds
  }

  return {
    // config
    taskConfig,
    updateTaskConfig,
    // legacy mock
    scripts, selectedScript, generating, generationProgress, error,
    generateScripts, selectScript, updateScript, resetCreative,
    // pipeline state
    pipelineMode, pipelineRunning, pipelineOutput, pipelineChatId,
    pipelineError, pipelineVideoStarted,
    generateCopy, generateVideo, abortPipeline, resetPipeline,
    // video render tracking (multi)
    videoTaskIds, videoDraftIds, videoDraftId, draftArchiveIds, videoRenderStatuses, videoPollingCount,
    videoAllDone, videoStatusList, hasRecoverableResult,
    trackVideoTask, onAllVideosDone, addVideoDraftId, setVideoDraftId, setVideoDraftIds,
    setDraftArchiveId, getDraftArchiveId,
    restoreResultContext, resumePendingVideoPolling, recoverVideoTasksFromOutput,
  }
})
