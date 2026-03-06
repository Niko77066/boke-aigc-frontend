import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskConfig, Script } from '@/types'
import { agentApi } from '@/api'
import { callPipelineStream, type PipelineVariables } from '@/api/pipeline'
import { KB_ID } from '@/utils/constants'

export const useCreativeStore = defineStore('creative', () => {
  // === 原有文案生成（mock） ===
  const taskConfig = ref<TaskConfig | null>(null)
  const scripts = ref<Script[]>([])
  const selectedScript = ref<Script | null>(null)
  const generating = ref(false)
  const generationProgress = ref(0)
  const error = ref<string | null>(null)

  // === Pipeline 状态 ===
  const pipelineMode = ref<'文案' | '视频'>('文案')
  const pipelineRunning = ref(false)
  const pipelineOutput = ref('')
  const pipelineToolCalls = ref<Array<{ name: string; args: string; timestamp: number }>>([])
  const pipelineChatId = ref<string | null>(null)
  const pipelineAbortController = ref<AbortController | null>(null)

  // Pipeline 配置
  const pipelineVoice = ref<PipelineVariables['voice']>('活力男声')
  const pipelineSubtitle = ref<PipelineVariables['text']>('极简黑底')
  const pipelineScript = ref('') // 口播文案

  // Computed
  const hasPipelineOutput = computed(() => pipelineOutput.value.length > 0)

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

  /**
   * 启动 Pipeline（文案 or 视频模式）
   */
  async function runPipeline(userMessage: string) {
    pipelineRunning.value = true
    pipelineOutput.value = ''
    pipelineToolCalls.value = []
    error.value = null

    const chatId = pipelineChatId.value || `aigc-${Date.now()}`
    pipelineChatId.value = chatId

    const controller = new AbortController()
    pipelineAbortController.value = controller

    const variables: PipelineVariables = {
      mode: pipelineMode.value,
      copy: pipelineScript.value || undefined,
      voice: pipelineVoice.value,
      text: pipelineSubtitle.value,
    }

    try {
      await callPipelineStream(
        { variables, userMessage, chatId },
        (_chunk, accumulated) => {
          pipelineOutput.value = accumulated
        },
        (toolName, args) => {
          pipelineToolCalls.value.push({ name: toolName, args, timestamp: Date.now() })
        },
        controller.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error.value = e instanceof Error ? e.message : 'Pipeline 执行失败'
      }
    } finally {
      pipelineRunning.value = false
      pipelineAbortController.value = null
    }
  }

  /** 文案模式：生成买量文案 */
  async function generateCopy(userMessage: string) {
    pipelineMode.value = '文案'
    return runPipeline(userMessage)
  }

  /** 视频模式：启动自动剪辑 */
  async function generateVideo(script: string, userMessage?: string) {
    pipelineMode.value = '视频'
    pipelineScript.value = script
    return runPipeline(userMessage || '请开始制作视频')
  }

  /** 多轮追加消息 */
  async function sendFollowUp(message: string) {
    if (!pipelineChatId.value) {
      error.value = '请先启动 Pipeline'
      return
    }
    pipelineRunning.value = true
    const prevOutput = pipelineOutput.value
    pipelineOutput.value = ''
    error.value = null

    const controller = new AbortController()
    pipelineAbortController.value = controller

    try {
      await callPipelineStream(
        {
          variables: {
            mode: pipelineMode.value,
            copy: pipelineScript.value || undefined,
            voice: pipelineVoice.value,
            text: pipelineSubtitle.value,
          },
          userMessage: message,
          chatId: pipelineChatId.value,
        },
        (_chunk, accumulated) => {
          pipelineOutput.value = accumulated
        },
        (toolName, args) => {
          pipelineToolCalls.value.push({ name: toolName, args, timestamp: Date.now() })
        },
        controller.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error.value = e instanceof Error ? e.message : 'Pipeline 执行失败'
        pipelineOutput.value = prevOutput
      }
    } finally {
      pipelineRunning.value = false
      pipelineAbortController.value = null
    }
  }

  function abortPipeline() {
    pipelineAbortController.value?.abort()
    pipelineRunning.value = false
  }

  function resetPipeline() {
    abortPipeline()
    pipelineOutput.value = ''
    pipelineToolCalls.value = []
    pipelineChatId.value = null
    pipelineScript.value = ''
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
    resetPipeline()
  }

  return {
    // State
    taskConfig, scripts, selectedScript, generating, generationProgress, error,
    pipelineMode, pipelineRunning, pipelineOutput, pipelineToolCalls,
    pipelineChatId, pipelineVoice, pipelineSubtitle, pipelineScript,
    hasPipelineOutput,
    // Actions
    updateTaskConfig, generateScripts,
    runPipeline, generateCopy, generateVideo, sendFollowUp,
    abortPipeline, resetPipeline,
    selectScript, updateScript, resetCreative,
  }
})
