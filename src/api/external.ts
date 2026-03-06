/**
 * 外部视频上传 API — 对接 BlueAI 视频处理服务
 * 基础地址通过 VITE_API_BASE_URL 配置，默认 http://localhost:8060
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8060'

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
  product_name?: string
  folder_name?: string
  analyze_prompt?: string
}

/** 上传视频文件（multipart/form-data） */
export async function uploadVideos(
  files: File[],
  options?: UploadVideoOptions,
): Promise<UploadVideoResponse> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  if (options?.product_name) formData.append('product_name', options.product_name)
  if (options?.folder_name) formData.append('folder_name', options.folder_name)
  if (options?.analyze_prompt) formData.append('analyze_prompt', options.analyze_prompt)

  const res = await fetch(`${BASE_URL}/api/external/upload-video`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? `上传失败: ${res.status}`)
  }

  return res.json() as Promise<UploadVideoResponse>
}

/** 查询处理状态 */
export async function getUploadStatus(folderId: number): Promise<UploadStatusResponse> {
  const res = await fetch(`${BASE_URL}/api/external/upload-status/${folderId}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? `查询失败: ${res.status}`)
  }

  return res.json() as Promise<UploadStatusResponse>
}

/** 轮询直到处理完成，返回最终状态 */
export function pollUploadStatus(
  folderId: number,
  onUpdate: (status: UploadStatusResponse) => void,
  intervalMs = 5000,
): { stop: () => void } {
  let timer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  async function tick() {
    if (stopped) return
    try {
      const status = await getUploadStatus(folderId)
      onUpdate(status)
      if (status.state !== 'processing') {
        stop()
      }
    } catch (err) {
      console.error('[pollUploadStatus] error:', err)
      // 继续轮询，不因单次失败停止
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
