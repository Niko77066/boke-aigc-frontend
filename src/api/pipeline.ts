// FastGPT Pipeline API - OpenAI-compatible chat completions with workflow variables

const PIPELINE_URL = 'https://ai.blue-converse.com/api/v1/chat/completions'
const PIPELINE_KEY = 'Bearer converse-yZLNsh2BGTWNL65KHFAmry3R2wGGCcs4vBWl2WOtPBzg8bnIUocHvjlxcAIN'

// ── Option constants ──────────────────────────────────────────────

export const VOICE_OPTIONS = [
  { value: '活力男声', label: '活力男声' },
  { value: '专业男声', label: '专业男声' },
  { value: '甜美女声', label: '甜美女声' },
  { value: '沉稳女声', label: '沉稳女声' },
] as const

export const SUBTITLE_OPTIONS = [
  { value: '大字报', label: '大字报' },
  { value: '极简黑底', label: '极简黑底' },
  { value: '综艺花字', label: '综艺花字' },
] as const

export type PipelineMode = '文案' | '视频'
export type VoiceOption = (typeof VOICE_OPTIONS)[number]['value']
export type SubtitleOption = (typeof SUBTITLE_OPTIONS)[number]['value']

// ── Request / Response types ──────────────────────────────────────

export interface PipelineVariables {
  mode: PipelineMode
  copy?: string
  voice?: VoiceOption
  text?: SubtitleOption
}

export interface PipelineRequest {
  variables: PipelineVariables
  userMessage: string
  chatId?: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  chatId?: string
  stream: boolean
  detail: boolean
  variables: PipelineVariables
  messages: ChatMessage[]
}

export interface PipelineResponse {
  id: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  /** FastGPT returns chatId at top level for multi-turn */
  chatId?: string
}

// ── SSE delta shape (OpenAI streaming) ────────────────────────────

export interface StreamDelta {
  id?: string
  choices?: Array<{
    delta?: { content?: string; role?: string }
    finish_reason?: string | null
  }>
  chatId?: string
}

// ── Streaming call ────────────────────────────────────────────────

export async function callPipelineStream(
  req: PipelineRequest,
  onDelta: (text: string) => void,
  onDone: (fullText: string, chatId?: string) => void,
  onError: (err: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body: RequestBody = {
    stream: true,
    detail: true,
    variables: req.variables,
    messages: [{ role: 'user', content: req.userMessage }],
  }
  if (req.chatId) body.chatId = req.chatId

  let res: Response
  try {
    res = await fetch(PIPELINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: PIPELINE_KEY,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  if (!res.ok) {
    onError(new Error(`Pipeline API ${res.status}: ${res.statusText}`))
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let chatId: string | undefined

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process SSE lines
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data:')) continue

        const json = trimmed.slice(5).trim()
        if (!json || json === '[DONE]') continue

        try {
          const parsed: StreamDelta = JSON.parse(json)
          if (parsed.chatId) chatId = parsed.chatId
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullText += content
            onDelta(content)
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  } catch (e) {
    if (signal?.aborted) return
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  onDone(fullText, chatId)
}

// ── Non-streaming call ────────────────────────────────────────────

export async function callPipeline(
  req: PipelineRequest,
  signal?: AbortSignal,
): Promise<{ content: string; chatId?: string }> {
  const body: RequestBody = {
    stream: false,
    detail: true,
    variables: req.variables,
    messages: [{ role: 'user', content: req.userMessage }],
  }
  if (req.chatId) body.chatId = req.chatId

  const res = await fetch(PIPELINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: PIPELINE_KEY,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    throw new Error(`Pipeline API ${res.status}: ${res.statusText}`)
  }

  const data: PipelineResponse = await res.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    chatId: data.chatId,
  }
}
