/**
 * KOX-CUT-API (剪映/CapCut MCP) — 成片查询 & 草稿管理
 *
 * MCP endpoint: https://cutapi.koxagent.com/cutmcp/mcp
 * Auth: Bearer token (encrypted in workflow config)
 *
 * For the frontend we only need read/status operations:
 *   - get_video_task_status → poll render progress & get download URL
 *   - get_tracks → inspect draft structure
 *   - generate_video → trigger render (if re-render needed)
 */

const CAPCUT_MCP_URL = 'https://cutapi.koxagent.com/cutmcp/mcp'
const CAPCUT_SECRET = 'cc94f2a95d7d2bdacd522ff619e4a898:8bf3bde7f8e481437b3e0d8bf54c1ddb753834706b9655645ffb648fda:ba02bf4abd1b72da80a0198dd9202e8f'

// ── Types ───────────────────────────────────────────────────────

export interface VideoTaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'success' | 'failed' | string
  progress?: number
  video_url?: string
  cover_url?: string
  error?: string
  duration?: number
  width?: number
  height?: number
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

  if (!res.ok) {
    throw new Error(`CapCut MCP ${res.status}: ${res.statusText}`)
  }

  const data: MCPResponse = await res.json()

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
 * Query video render task status. Returns progress/URL when done.
 */
export async function getVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  return mcpCall<VideoTaskStatus>('get_video_task_status', { task_id: taskId })
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

/**
 * Extract ALL task_ids from pipeline output text.
 * The workflow may produce multiple videos, each with its own task_id.
 */
export function extractAllTaskIds(text: string): string[] {
  const patterns = [
    /task_id["\s]*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /任务ID[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/g,
    /任务编号[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/g,
    /渲染任务[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/g,
    /render.*?id["\s]*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /\*\*task_id\*\*[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
    /`task_id`[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/gi,
  ]

  const seen = new Set<string>()
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      if (m[1] && m[1].length >= 4) seen.add(m[1])
    }
  }
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
    /draft_id["\s]*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/i,
    /草稿ID[：:]\s*["']?([a-zA-Z0-9_-]+)["']?/,
  ]

  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}
