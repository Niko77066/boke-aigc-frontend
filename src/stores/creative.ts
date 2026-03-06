import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskConfig, Script } from '@/types'
import { agentApi } from '@/api'
import {
  callPipelineStream,
  type PipelineMode,
  type VoiceOption,
  type SubtitleOption,
} from '@/api/pipeline'
import {
  extractTaskId,
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

  // ── Script selection (parsed from pipeline output) ──────────────
  const scripts = ref<Script[]>([])
  const selectedScript = ref<Script | null>(null)
  const generating = ref(false)
  const generationProgress = ref(0)
  const error = ref<string | null>(null)

  // ── Video render tracking (CapCut MCP) ──────────────────────────
  const videoTaskId = ref<string | null>(null)
  const videoDraftId = ref<string | null>(null)
  const videoRenderStatus = ref<VideoTaskStatus | null>(null)
  const videoPolling = ref(false)

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

  /** Helper: get voice/subtitle from current taskConfig */
  function getVoice(): VoiceOption {
    return (taskConfig.value?.voice as VoiceOption) || '活力男声'
  }
  function getSubtitle(): SubtitleOption {
    return (taskConfig.value?.subtitle as SubtitleOption) || '大字报'
  }

  // ── Legacy mock actions (kept for compatibility) ────────────────
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
    if (script) {
      selectedScript.value = script
    }
  }

  function updateScript(script: Script) {
    const idx = scripts.value.findIndex((s) => s.id === script.id)
    if (idx >= 0) {
      scripts.value[idx] = script
    }
    if (selectedScript.value?.id === script.id) {
      selectedScript.value = script
    }
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

  /** Generate copy (mode=文案) via FastGPT streaming */
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
        variables: {
          mode: '文案',
          voice: getVoice(),
          text: getSubtitle(),
        },
        userMessage: msg,
        chatId: pipelineChatId.value,
      },
      (delta) => {
        pipelineOutput.value += delta
      },
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

  /** Generate video (mode=视频) via FastGPT streaming */
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
        variables: {
          mode: '视频',
          copy: script,
          voice: getVoice(),
          text: getSubtitle(),
        },
        userMessage: msg || '请根据这份文案为我制作营销视频',
        chatId: pipelineChatId.value,
      },
      (delta) => {
        pipelineOutput.value += delta
      },
      (fullText, chatId) => {
        pipelineOutput.value = fullText
        if (chatId) pipelineChatId.value = chatId
        pipelineRunning.value = false
        // Auto-detect task_id/draft_id and start render polling
        autoDetectAndPoll(fullText)
      },
      (err) => {
        pipelineError.value = err.message
        pipelineRunning.value = false
      },
      abortController.signal,
    )
  }

  /** Cancel an in-flight streaming request */
  function abortPipeline() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    pipelineRunning.value = false
  }

  /** Reset pipeline state for a fresh conversation */
  function resetPipeline() {
    abortPipeline()
    pipelineMode.value = '文案'
    pipelineOutput.value = ''
    pipelineChatId.value = undefined
    pipelineError.value = null
    pipelineVideoStarted.value = false
    videoTaskId.value = null
    videoDraftId.value = null
    videoRenderStatus.value = null
    videoPolling.value = false
  }

  /** Auto-detect task_id / draft_id from pipeline video output and start polling */
  function autoDetectAndPoll(text: string) {
    const tid = extractTaskId(text)
    const did = extractDraftId(text)
    if (tid) videoTaskId.value = tid
    if (did) videoDraftId.value = did
    if (tid) {
      startVideoPolling(tid)
    }
  }

  /** Poll CapCut render task until complete */
  async function startVideoPolling(taskId: string) {
    if (videoPolling.value) return
    videoPolling.value = true

    try {
      const final = await pollVideoTask(
        taskId,
        (status) => {
          videoRenderStatus.value = status
        },
        5000,
        300000,
      )
      videoRenderStatus.value = final
    } catch (e) {
      videoRenderStatus.value = {
        task_id: taskId,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      }
    } finally {
      videoPolling.value = false
    }
  }

  /** Manually set a task_id and start polling */
  function trackVideoTask(taskId: string) {
    videoTaskId.value = taskId
    startVideoPolling(taskId)
  }

  return {
    // config
    taskConfig,
    updateTaskConfig,
    // legacy mock state (kept for CreativeOutput compatibility)
    scripts,
    selectedScript,
    generating,
    generationProgress,
    error,
    generateScripts,
    selectScript,
    updateScript,
    resetCreative,
    // pipeline state
    pipelineMode,
    pipelineRunning,
    pipelineOutput,
    pipelineChatId,
    pipelineError,
    pipelineVideoStarted,
    generateCopy,
    generateVideo,
    abortPipeline,
    resetPipeline,
    // video render tracking
    videoTaskId,
    videoDraftId,
    videoRenderStatus,
    videoPolling,
    trackVideoTask,
  }
})
