/**
 * FastGPT AIGC Pipeline API
 * 对接蓝色光标 AI 平台 workflow
 *
 * 两条路径:
 * 1. mode=文案 → Gemini 3.1 Pro 生成 4 套买量文案方案
 * 2. mode=视频 → Claude 4-6 Opus 调用 TTS + 素材检索 + 剪映 MCP 自动剪辑
 */

const PIPELINE_BASE_URL = 'https://ai.blue-converse.com/api/v1'
const PIPELINE_API_KEY = 'converse-yZLNsh2BGTWNL65KHFAmry3R2wGGCcs4vBWl2WOtPBzg8bnIUocHvjlxcAIN'

/** Workflow 变量 */
export interface PipelineVariables {
  /** 模式: "文案" | "视频" */
  mode: '文案' | '视频'
  /** 口播脚本（视频模式必填） */
  copy?: string
  /** 配音风格 */
  voice?: '活力男声' | '专业男声' | '甜美女声' | '沉稳女声'
  /** 字幕样式 */
  text?: '大字报' | '极简黑底' | '综艺花字'
}

export interface PipelineRequest {
  /** Workflow 变量 */
  variables: PipelineVariables
  /** 用户消息 */
  userMessage: string
  /** 会话 ID（多轮对话） */
  chatId?: string
  /** 是否流式 */
  stream?: boolean
}

export interface PipelineResponse {
  content: string
  nodeResults?: Array<{
    id: string
    nodeId: string
    moduleName: string
    moduleType: string
    runningTime: number
    totalPoints?: number
    model?: string
    toolDetail?: Array<{
      toolName: string
      params: string
      response: string
    }>
  }>
}

/**
 * 非流式调用
 */
export async function callPipeline(req: PipelineRequest): Promise<PipelineResponse> {
  const resp = await fetch(`${PIPELINE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIPELINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: '',
      stream: false,
      detail: true,
      chatId: req.chatId || `aigc-${Date.now()}`,
      variables: req.variables,
      messages: [{ role: 'user', content: req.userMessage }],
    }),
  })

  if (!resp.ok) {
    throw new Error(`Pipeline API error: ${resp.status} ${resp.statusText}`)
  }

  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    nodeResults: data.responseData,
  }
}

/**
 * 流式调用 — 实时展示 AI 输出
 */
export async function callPipelineStream(
  req: PipelineRequest,
  onChunk: (text: string, accumulated: string) => void,
  onToolCall?: (toolName: string, args: string) => void,
  signal?: AbortSignal,
): Promise<PipelineResponse> {
  const resp = await fetch(`${PIPELINE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PIPELINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: '',
      stream: true,
      detail: true,
      chatId: req.chatId || `aigc-${Date.now()}`,
      variables: req.variables,
      messages: [{ role: 'user', content: req.userMessage }],
    }),
    signal,
  })

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => '')
    throw new Error(`Pipeline API error: ${resp.status} - ${errorText}`)
  }

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('Response body not readable')

  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta

        if (delta?.content) {
          accumulated += delta.content
          onChunk(delta.content, accumulated)
        }

        if (delta?.tool_calls && onToolCall) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              onToolCall(tc.function.name, tc.function.arguments ?? '')
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return { content: accumulated }
}

/** 文案模式可选配音 */
export const VOICE_OPTIONS = ['活力男声', '专业男声', '甜美女声', '沉稳女声'] as const
/** 字幕样式选项 */
export const SUBTITLE_OPTIONS = ['大字报', '极简黑底', '综艺花字'] as const
