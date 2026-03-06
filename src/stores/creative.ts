import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  extractDraftId,
  pollVideoTask,
  type VideoTaskStatus,
} from '@/api/capcut'
import { KB_ID } from '@/utils/constants'

export const useCreativeStore = defineStore('creative', () => {
  // ── Form / config state ─────────────────────────────────────────
  const taskConfig = ref<TaskConfig | null>(null)

  // ── Pipeline state ──────────────────────────────────────────────
  const pipelineMode = ref<PipelineMode>('文案')
  const pipelineRunning = ref(false)
  const pipelineOutput = ref('')
  const pipelineChatId = ref<string | undefined>(undefined)
  const pipelineError = ref<string | null>(null)
  const pipelineVideoStarted = ref(false)

  // ── Script selection (legacy mock) ──────────────────────────────
  const scripts = ref<Script[]>([])
  const selectedScript = ref<Script | null>(null)
  const generating = ref(false)
  const generationProgress = ref(0)
  const error = ref<string | null>(null)

  // ── Video render tracking (CapCut MCP) — multi task_id ──────────
  const videoTaskIds = ref<string[]>([])
  const videoDraftId = ref<string | null>(null)
  const videoRenderStatuses = ref<Map<string, VideoTaskStatus>>(new Map())
  const videoPollingCount = ref(0)

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
    return (taskConfig.value?.voice as VoiceOption) || '活力男声'
  }
  function getSubtitle(): SubtitleOption {
    return (taskConfig.value?.subtitle as SubtitleOption) || '大字报'
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
    videoTaskIds.value = []
    videoDraftId.value = null
    videoRenderStatuses.value = new Map()
    videoPollingCount.value = 0
    _onAllVideosDone = null
  }

  // ── Video render tracking ───────────────────────────────────────

  function autoDetectAndPoll(text: string) {
    const tids = extractAllTaskIds(text)
    const did = extractDraftId(text)
    if (tids.length > 0) videoTaskIds.value = tids
    if (did) videoDraftId.value = did

    if (tids.length > 0) {
      for (const tid of tids) {
        startVideoPolling(tid)
      }
    } else {
      // 没提取到 task_id，直接触发完成回调跳转
      if (_onAllVideosDone) {
        _onAllVideosDone()
      }
    }
  }

  async function startVideoPolling(taskId: string) {
    videoPollingCount.value++

    try {
      const final = await pollVideoTask(
        taskId,
        (status) => {
          videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, status))
        },
        5000,
        300000,
      )
      videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, final))
    } catch (e) {
      const errStatus: VideoTaskStatus = {
        task_id: taskId,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      }
      videoRenderStatuses.value = new Map(videoRenderStatuses.value.set(taskId, errStatus))
    } finally {
      videoPollingCount.value--
      // Check if ALL polling is done
      if (videoPollingCount.value === 0 && _onAllVideosDone) {
        _onAllVideosDone()
      }
    }
  }

  function trackVideoTask(taskId: string) {
    if (!videoTaskIds.value.includes(taskId)) {
      videoTaskIds.value = [...videoTaskIds.value, taskId]
    }
    startVideoPolling(taskId)
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
    videoTaskIds, videoDraftId, videoRenderStatuses, videoPollingCount,
    videoAllDone, videoStatusList,
    trackVideoTask, onAllVideosDone,
  }
})
