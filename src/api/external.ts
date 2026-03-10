/**
 * 外部视频上传 API — 对接 BlueAI 视频处理服务
 * 基础地址优先读取运行时配置，其次读取 VITE_API_BASE_URL
 */

import { getApiBaseUrl } from '@/config/runtime'

const BASE_URL: string = getApiBaseUrl()

function buildUrl(path: string): string {
  return `${BASE_URL}${path}`
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => null)
  return (err as { message?: string } | null)?.message ?? fallback
}

function toNetworkErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `无法连接素材管理 API（${BASE_URL || '未配置 API 地址'}）。请检查服务是否启动、地址是否可达，或后端是否放开了 CORS。原始错误: ${error.message}`
  }
  return `无法连接素材管理 API（${BASE_URL || '未配置 API 地址'}）。请检查服务是否启动、地址是否可达，或后端是否放开了 CORS。`
}

/** 上传视频响应 */
export interface UploadVideoResponse {
  status: number
  state: 'processing' | 'error'
  message: string
  folder_id: number
  video_count: number
}

/** 单个视频状态 */
export interface VideoStatus {
  file_name: string
  media_id: string
  state: 'pending' | 'uploading' | 'analyzing' | 'uploading_kb' | 'completed' | 'failed'
}

/** 上传状态响应 */
export interface UploadStatusResponse {
  status: number
  state: 'processing' | 'completed' | 'partial_failed'
  total: number
  completed: number
  failed: number
  videos: VideoStatus[]
}

/** 上传选项 */
export interface UploadVideoOptions {
  folder?: string
  product_name?: string
  folder_name?: string
  analyze_prompt?: string
}

/** 上传视频文件（multipart/form-data） */
export async function uploadVideos(
  files: File[],
  options?: UploadVideoOptions,
): Promise<UploadVideoResponse> {
  if (files.length === 0 && !options?.folder) {
    throw new Error('请提供上传文件，或填写服务器素材目录')
  }

  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.product_name) formData.append('product_name', options.product_name)
  if (options?.folder_name) formData.append('folder_name', options.folder_name)
  if (options?.analyze_prompt) formData.append('analyze_prompt', options.analyze_prompt)

  try {
    const res = await fetch(buildUrl('/api/external/upload-video'), {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `上传失败: ${res.status}`))
    }

    return res.json() as Promise<UploadVideoResponse>
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(toNetworkErrorMessage(error))
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error(toNetworkErrorMessage(error))
  }
}

/** 查询处理状态 */
export async function getUploadStatus(folderId: number): Promise<UploadStatusResponse> {
  try {
    const res = await fetch(buildUrl(`/api/external/upload-status/${folderId}`))

    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `查询失败: ${res.status}`))
    }

    return res.json() as Promise<UploadStatusResponse>
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(toNetworkErrorMessage(error))
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error(toNetworkErrorMessage(error))
  }
}

/** 轮询直到处理完成，返回最终状态 */
export function pollUploadStatus(
  folderId: number,
  onUpdate: (status: UploadStatusResponse) => void,
  onError?: (err: Error) => void,
  intervalMs = 5000,
  maxRetries = 60,
): { stop: () => void } {
  let timer: ReturnType<typeof setInterval> | null = null
  let stopped = false
  let failCount = 0
  let lastError: Error | null = null

  async function tick() {
    if (stopped) return
    try {
      const status = await getUploadStatus(folderId)
      failCount = 0
      lastError = null
      onUpdate(status)
      if (status.state !== 'processing') {
        stop()
      }
    } catch (err) {
      failCount++
      lastError = err instanceof Error ? err : new Error('轮询失败')
      if (failCount >= maxRetries) {
        const error = new Error(`轮询超时: 连续 ${failCount} 次失败。${lastError.message}`)
        onError?.(error)
        stop()
      }
    }
  }

  function stop() {
    stopped = true
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // 立即查一次，然后定时轮询
  void tick()
  timer = setInterval(() => void tick(), intervalMs)

  return { stop }
}
