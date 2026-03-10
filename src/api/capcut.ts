/**
 * KOX-CUT-API (剪映/CapCut) — 成片查询 & 草稿管理
 *
 * MCP endpoint: https://cutapi.koxagent.com/cutmcp/mcp
 * Status endpoint: https://cutapi.koxagent.com/video_task_status
 * Auth: Bearer token (encrypted in workflow config)
 *
 * For the frontend:
 *   - generate_video / get_tracks still go through MCP
 *   - video_task_status is polled via direct HTTP API
 */

const CAPCUT_MCP_URL = 'https://cutapi.koxagent.com/cutmcp/mcp'
const CAPCUT_STATUS_URL = 'https://cutapi.koxagent.com/video_task_status'
const CAPCUT_SECRET = 'cc94f2a95d7d2bdacd522ff619e4a898:8bf3bde7f8e481437b3e0d8bf54c1ddb753834706b9655645ffb648fda:ba02bf4abd1b72da80a0198dd9202e8f'

// ── Types ───────────────────────────────────────────────────────

export interface VideoTaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'success' | 'failed' | string
  render_status?: string
  progress?: number
  video_url?: string
  cover_url?: string
  draft_id?: string
  message?: string | null
  error?: string
  duration?: number
  width?: number
  height?: number
}

interface VideoTaskStatusApiItem {
  created_at?: string
  draft_id?: string | null
  extra?: Record<string, unknown>
  id?: number
  message?: string | null
  progress?: number | null
  render_status?: string
  task_id?: string
  updated_at?: string
  video_name?: string | null
  oss_url?: string | null
}

interface VideoTaskStatusApiResponse {
  data?: VideoTaskStatusApiItem
  error?: string
  success?: boolean
}

export interface DraftTrack {
  name: string
  type: string
  render_index: number
  muted: boolean
  segment_count: number
  end_time: number
}

export interface DraftInfo {
  draft_id: string
  tracks: DraftTrack[]
}

// ── MCP JSON-RPC call helper ────────────────────────────────────

interface MCPRequest {
  method: string
  params: {
    name: string
    arguments: Record<string, unknown>
  }
}

interface MCPResponse {
  result?: {
    content?: Array<{ type: string; text?: string }>
  }
  error?: { code: number; message: string }
}

let requestId = 1

function parseErrorMessage(rawText: string, fallback: string): string {
  let message = fallback

  try {
    const parsed = JSON.parse(rawText) as {
      error?: string
      message?: string
      error_description?: string
    }
    if (parsed.error_description) {
      message = parsed.error_description
    } else if (parsed.message) {
      message = parsed.message
    } else if (parsed.error) {
      message = parsed.error
    }
  } catch {
    if (rawText.trim()) message = rawText.trim()
  }

  return message
}

async function mcpCall<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
  const body: MCPRequest = {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  }

  const res = await fetch(CAPCUT_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CAPCUT_SECRET}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: requestId++,
      ...body,
    }),
  })

  const rawText = await res.text()

  if (!res.ok) {
    const message = parseErrorMessage(rawText, `CapCut MCP ${res.status}: ${res.statusText}`)

    if (res.status === 401) {
      throw new Error(`CapCut MCP 鉴权失败：${message}`)
    }
    throw new Error(message)
  }

  const data: MCPResponse = JSON.parse(rawText) as MCPResponse

  if (data.error) {
    throw new Error(`MCP error ${data.error.code}: ${data.error.message}`)
  }

  // MCP returns content as text JSON in content[0].text
  const text = data.result?.content?.[0]?.text
  if (!text) {
    throw new Error('Empty MCP response')
  }

  return JSON.parse(text) as T
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Query video render task status via direct HTTP API.
 * The API returns render_status/oss_url; normalize it to the frontend shape.
 */
export async function getVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  const url = new URL(CAPCUT_STATUS_URL)
  url.searchParams.set('task_id', taskId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${CAPCUT_SECRET}`,
    },
  })

  const rawText = await res.text()

  if (!res.ok) {
    const message = parseErrorMessage(rawText, `CapCut status API ${res.status}: ${res.statusText}`)
    if (res.status === 401) {
      throw new Error(`CapCut 状态查询鉴权失败：${message}`)
    }
    throw new Error(message)
  }

  const payload = JSON.parse(rawText) as VideoTaskStatusApiResponse

  if (!payload.success) {
    throw new Error(payload.error || 'CapCut 状态查询失败')
  }

  const data = payload.data
  if (!data?.task_id) {
    throw new Error('CapCut 状态查询返回缺少 task_id')
  }

  const renderStatus = data.render_status?.toLowerCase() || ''
  const normalizedStatus = (() => {
    if (['completed', 'success', 'succeeded'].includes(renderStatus)) return 'success'
    if (['failed', 'error', 'canceled', 'cancelled'].includes(renderStatus)) return 'failed'
    if (['pending', 'queued'].includes(renderStatus)) return 'pending'
    if (renderStatus) return 'processing'
    return data.oss_url ? 'success' : 'processing'
  })()

  return {
    task_id: data.task_id,
    status: normalizedStatus,
    render_status: data.render_status,
    progress: data.progress ?? undefined,
    video_url: data.oss_url ?? undefined,
    draft_id: data.draft_id ?? undefined,
    message: data.message ?? null,
    error: normalizedStatus === 'failed' ? (data.message || payload.error || '视频渲染失败') : undefined,
  }
}

/**
 * Get all tracks in a draft
 */
export async function getDraftTracks(draftId: string): Promise<DraftInfo> {
  const tracks = await mcpCall<DraftTrack[]>('get_tracks', { draft_id: draftId })
  return { draft_id: draftId, tracks }
}

/**
 * Trigger video render from a draft
 */
export async function generateVideo(
  draftId: string,
  resolution: string = '1080P',
  name?: string,
): Promise<{ task_id: string }> {
  return mcpCall<{ task_id: string }>('generate_video', {
    draft_id: draftId,
    resolution,
    ...(name ? { name } : {}),
  })
}

/**
 * Poll task status until complete or timeout.
 * Returns final status. Calls onProgress with each update.
 */
export async function pollVideoTask(
  taskId: string,
  onProgress?: (status: VideoTaskStatus) => void,
  intervalMs: number = 5000,
  timeoutMs: number = 300000,
): Promise<VideoTaskStatus> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const status = await getVideoTaskStatus(taskId)
    onProgress?.(status)

    if (status.status === 'success' || status.status === 'failed') {
      return status
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`Video render timeout after ${timeoutMs / 1000}s`)
}

/**
 * Extract first task_id from pipeline output text.
 */
export function extractTaskId(text: string): string | null {
  const ids = extractAllTaskIds(text)
  return ids.length > 0 ? ids[0]! : null
}

const TASK_CONTEXT_PATTERN = /(task|render|渲染|任务|video|视频|版本|进度|status|处理中|完成|成功|失败|queued|processing|completed|pending)/i
const STRONG_TASK_CONTEXT_PATTERN = /(task|render|渲染|任务)/i
const NON_TASK_CONTEXT_PATTERN = /(draft|草稿|chat[_\s-]?id|request[_\s-]?id|kb[_\s-]?id)/i
const CONTEXTUAL_CODE_ID_PATTERN = /`([a-zA-Z0-9_-]{8,})`/g
const CONTEXTUAL_UUID_PATTERN = /\b([a-f0-9]{8}-[a-f0-9-]{8,})\b/gi
const TASK_TAIL_LINE_LIMIT = 60
const TASK_TAIL_CHAR_LIMIT = 4000
const TASK_SECTION_MARKER_PATTERN = /(渲染状态|render status|task[_\s-]*id|任务\s*id|任务编号|\*\*v\d+\*\*|视频\s*\d+)/i

function pushTaskIdCandidate(seen: Set<string>, candidate: string | undefined, context?: string) {
  if (!candidate || candidate.length < 8) return

  const normalized = candidate.trim()
  if (!normalized) return

  const lowerContext = context?.toLowerCase() || ''
  if (NON_TASK_CONTEXT_PATTERN.test(lowerContext) && !STRONG_TASK_CONTEXT_PATTERN.test(lowerContext)) {
    return
  }

  seen.add(normalized)
}

function collectTaskIdsFromContext(text: string, seen: Set<string>) {
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || !TASK_CONTEXT_PATTERN.test(line)) continue

    for (const match of line.matchAll(CONTEXTUAL_CODE_ID_PATTERN)) {
      pushTaskIdCandidate(seen, match[1], line)
    }

    for (const match of line.matchAll(CONTEXTUAL_UUID_PATTERN)) {
      pushTaskIdCandidate(seen, match[1], line)
    }
  }
}

function getTaskExtractionTail(text: string): string {
  const lines = text.split('\n')
  let startIndex = Math.max(0, lines.length - TASK_TAIL_LINE_LIMIT)

  for (let i = lines.length - 1; i >= 0; i--) {
    if (TASK_SECTION_MARKER_PATTERN.test(lines[i] || '')) {
      startIndex = Math.max(0, i - 2)
      break
    }
  }

  const tailLines = lines.slice(startIndex).join('\n')

  if (tailLines.length <= TASK_TAIL_CHAR_LIMIT) {
    return tailLines
  }

  return tailLines.slice(-TASK_TAIL_CHAR_LIMIT)
}

/**
 * Extract ALL task_ids from pipeline output text.
 * The workflow may produce multiple videos, each with its own task_id.
 */
export function extractAllTaskIds(text: string): string[] {
  const tailText = getTaskExtractionTail(text)
  const patterns = [
    /\btask[\s_-]*id\b\s*[：:=]\s*[("'`“”‘’]*([a-zA-Z0-9_-]+)[)"'`“”‘’]*/gi,
    /task_id["\s]*[:=]\s*["'`]?([a-zA-Z0-9_-]+)["'`]?/gi,
    /task[\s_-]*id["\s]*[：:=]\s*["'`]?([a-zA-Z0-9_-]+)["'`]?/gi,
    /taskId["\s]*[:=]\s*["'`]?([a-zA-Z0-9_-]+)["'`]?/gi,
    /-\s*\*\*[^*]+\*\*.*?task_id\s*[:：]\s*`?([a-zA-Z0-9_-]+)`?/gi,
    /-\s*\*\*[^*]+\*\*\s*`([a-zA-Z0-9_-]{8,})`\s*(?:->|→|➡|渲染|render)/gi,
    /\*\*[^*]+\*\*\s*`([a-zA-Z0-9_-]{8,})`\s*(?:->|→|➡|渲染|render)/gi,
    /\(\s*task\s*id\s*[:：]\s*`?([a-zA-Z0-9_-]{8,})`?\s*\)/gi,
    /任务\s*ID[：:\s]*["'`]?([a-zA-Z0-9_-]+)["'`]?/gi,
    /任务编号[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/g,
    /渲染任务[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/g,
    /render.*?id["\s]*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /\*\*task_id\*\*[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /`task_id`[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /[?&]task_id=([a-zA-Z0-9_-]+)/gi,
  ]

  const seen = new Set<string>()
  for (const p of patterns) {
    for (const m of tailText.matchAll(p)) {
      pushTaskIdCandidate(seen, m[1], m[0])
    }
  }

  collectTaskIdsFromContext(tailText, seen)

  return [...seen]
}

/**
 * Extract video URLs directly from pipeline output text.
 */
export function extractVideoUrls(text: string): string[] {
  const pattern = /https?:\/\/[^\s"'<>]+\.(?:mp4|mov|webm|avi)(?:\?[^\s"'<>]*)?/gi
  const seen = new Set<string>()
  for (const m of text.matchAll(pattern)) {
    seen.add(m[0])
  }
  return [...seen]
}

/**
 * Extract draft_id from pipeline output text.
 */
export function extractDraftId(text: string): string | null {
  const patterns = [
    /\bdraft[\s_-]*id\b\s*[：:=]\s*[("'`“”‘’]*([a-zA-Z0-9_-]+)[)"'`“”‘’]*/i,
    /draft_id["\s]*[：:=]\s*["']?([a-zA-Z0-9_-]+)["']?/i,
    /草稿ID[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/,
  ]

  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}
