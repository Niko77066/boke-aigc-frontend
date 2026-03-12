// FastGPT Pipeline API - OpenAI-compatible chat completions with workflow variables

const PIPELINE_URL = '/api/pipeline/v1/chat/completions'

// ── Option constants ──────────────────────────────────────────────

export const VOICE_OPTIONS = [
  { value: '气场御姐', label: '气场御姐' },
  { value: '治愈温柔', label: '治愈温柔' },
  { value: '甜台少女', label: '甜台少女' },
  { value: '软萌夹子', label: '软萌夹子' },
] as const

export const SUBTITLE_OPTIONS = [
  { value: '轻快醒目', label: '轻快醒目' },
  { value: '高能冲击', label: '高能冲击' },
  { value: '爆款横幅', label: '爆款横幅' },
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

interface PipelineErrorPayload {
  error?: string | { message?: string }
  message?: string
  detail?: string
}

interface SSEEventFrame {
  event: string
  data: string
}

function extractErrorMessage(payload: string): string | null {
  if (!payload.trim()) return null

  try {
    const parsed = JSON.parse(payload) as PipelineErrorPayload
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim()
    if (typeof parsed.error === 'object' && parsed.error !== null && typeof parsed.error.message === 'string' && parsed.error.message.trim()) {
      return parsed.error.message.trim()
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim()
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) return parsed.detail.trim()
  } catch {
    return payload.trim()
  }

  return null
}

function parseSSEFrames(chunk: string): SSEEventFrame[] {
  const normalized = chunk.replace(/\r\n/g, '\n')
  const rawFrames = normalized.split('\n\n')
  const frames: SSEEventFrame[] = []

  for (const rawFrame of rawFrames) {
    const lines = rawFrame.split('\n')
    let event = 'message'
    const dataLines: string[] = []

    for (const line of lines) {
      if (!line || line.startsWith(':')) continue
      if (line.startsWith('event:')) {
        event = line.slice(6).trim() || 'message'
        continue
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    if (dataLines.length === 0) continue
    frames.push({ event, data: dataLines.join('\n') })
  }

  return frames
}

function consumeSSEBuffer(buffer: string): { frames: SSEEventFrame[]; remainder: string } {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const lastDelimiterIndex = normalized.lastIndexOf('\n\n')

  if (lastDelimiterIndex === -1) {
    return { frames: [], remainder: buffer }
  }

  const complete = normalized.slice(0, lastDelimiterIndex)
  const remainder = normalized.slice(lastDelimiterIndex + 2)

  return {
    frames: parseSSEFrames(complete),
    remainder,
  }
}

function handleStreamFrame(
  frame: SSEEventFrame,
  state: { fullText: string; chatId?: string },
  onDelta: (text: string) => void,
): { shouldStop: boolean; error: Error | null } {
  const payload = frame.data.trim()
  if (!payload || payload === '[DONE]') {
    return { shouldStop: payload === '[DONE]', error: null }
  }

  if (frame.event === 'error') {
    return {
      shouldStop: true,
      error: new Error(extractErrorMessage(payload) || 'Pipeline stream error'),
    }
  }

  if (frame.event !== 'answer' && frame.event !== 'message') {
    return { shouldStop: false, error: null }
  }

  try {
    const parsed: StreamDelta = JSON.parse(payload)
    if (parsed.chatId) state.chatId = parsed.chatId

    const choice = parsed.choices?.[0]
    const content = choice?.delta?.content
    if (content) {
      state.fullText += content
      onDelta(content)
    }

    return { shouldStop: choice?.finish_reason === 'stop', error: null }
  } catch {
    const maybeError = extractErrorMessage(payload)
    if (maybeError) {
      return { shouldStop: true, error: new Error(maybeError) }
    }
    return { shouldStop: false, error: null }
  }
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
        Accept: 'text/event-stream, application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    const detail = extractErrorMessage(errorText)
    onError(new Error(detail || `Pipeline API ${res.status}: ${res.statusText}`))
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  const streamState: { fullText: string; chatId?: string } = { fullText: '' }
  let shouldStop = false
  let streamError: Error | null = null

  try {
    while (!shouldStop) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const { frames, remainder } = consumeSSEBuffer(buffer)
      buffer = remainder

      for (const frame of frames) {
        const result = handleStreamFrame(frame, streamState, onDelta)
        shouldStop = result.shouldStop
        if (result.error) {
          streamError = result.error
          break
        }
        if (shouldStop) break
      }
    }
  } catch (e) {
    if (signal?.aborted) return
    onError(e instanceof Error ? e : new Error(String(e)))
    return
  }

  if (!shouldStop && buffer.trim()) {
    const trailingFrames = parseSSEFrames(`${buffer}\n\n`)
    for (const frame of trailingFrames) {
      const result = handleStreamFrame(frame, streamState, onDelta)
      if (result.error) {
        streamError = result.error
        break
      }
      if (result.shouldStop) break
    }
  }

  if (streamError) {
    onError(streamError)
    return
  }

  onDone(streamState.fullText, streamState.chatId)
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
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    const detail = extractErrorMessage(errorText)
    throw new Error(detail || `Pipeline API ${res.status}: ${res.statusText}`)
  }

  const data: PipelineResponse = await res.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    chatId: data.chatId,
  }
}
