import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Asset, AssetFilter } from '@/types'
import { assetApi, externalApi } from '@/api'
import type { UploadVideoOptions, UploadStatusResponse, VideoStatus } from '@/api/external'
import { hasApiBaseUrl } from '@/config/runtime'

const VIDEO_STAGE_PROGRESS: Record<VideoStatus['state'], number> = {
  pending: 5,
  uploading: 25,
  analyzing: 65,
  uploading_kb: 90,
  completed: 100,
  failed: 100,
}

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<Asset[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const uploadError = ref<string | null>(null)
  const filter = ref<AssetFilter>({})
  const selectedAssets = ref<string[]>([])
  const total = ref(0)
  const page = ref(1)
  const size = ref(20)

  // 外部 API 上传状态
  const activeFolderId = ref<number | null>(null)
  const uploadState = ref<'idle' | 'uploading' | 'processing' | 'completed' | 'partial_failed' | 'error'>('idle')
  const videoStatuses = ref<VideoStatus[]>([])
  const processedCount = ref(0)
  const totalVideoCount = ref(0)
  let pollStopper: { stop: () => void } | null = null

  const filteredAssets = computed(() => {
    let result = [...assets.value]
    if (filter.value.type && filter.value.type !== 'all') {
      result = result.filter((a) => a.type === filter.value.type)
    }
    if (filter.value.tags && filter.value.tags.length > 0) {
      result = result.filter((a) => filter.value.tags!.some((t) => a.tags.includes(t)))
    }
    if (filter.value.search) {
      const q = filter.value.search.toLowerCase()
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (filter.value.status) {
      result = result.filter((a) => a.status === filter.value.status)
    }
    return result
  })

  const assetById = computed(() => {
    return (id: string) => assets.value.find((a) => a.id === id)
  })

  const uploadingAssets = computed(() => assets.value.filter((a) => a.status === 'uploading' || a.status === 'processing'))

  const taggedAssets = computed(() => assets.value.filter((a) => a.tags.length > 0))

  const statusCounts = computed(() => {
    const counts: Record<VideoStatus['state'], number> = {
      pending: 0,
      uploading: 0,
      analyzing: 0,
      uploading_kb: 0,
      completed: 0,
      failed: 0,
    }

    for (const video of videoStatuses.value) {
      counts[video.state] += 1
    }

    return counts
  })

  const uploadProgressPercent = computed(() => {
    if (uploadState.value === 'completed' || uploadState.value === 'partial_failed') {
      return 100
    }

    if (uploadState.value === 'uploading') {
      return uploadProgress.value
    }

    if (videoStatuses.value.length > 0) {
      const total = videoStatuses.value.reduce((sum, video) => sum + VIDEO_STAGE_PROGRESS[video.state], 0)
      return Math.round(total / videoStatuses.value.length)
    }

    if (totalVideoCount.value > 0) {
      return Math.round((processedCount.value / totalVideoCount.value) * 100)
    }

    return 0
  })

  const activeVideoStatus = computed(() => {
    return videoStatuses.value.find((video) => video.state !== 'completed' && video.state !== 'failed') ?? null
  })

  const currentStageLabel = computed(() => {
    if (uploadState.value === 'uploading') return '素材上传中'
    if (activeVideoStatus.value?.state === 'uploading') return '源文件上传中'
    if (activeVideoStatus.value?.state === 'analyzing') return 'AI 分析中'
    if (activeVideoStatus.value?.state === 'uploading_kb') return '回传知识库中'
    if (uploadState.value === 'completed') return '素材生成完成'
    if (uploadState.value === 'partial_failed') return '部分素材生成失败'
    if (uploadState.value === 'error') return '素材生成异常'
    return '等待任务开始'
  })

  const currentStatusSummary = computed(() => {
    if (activeVideoStatus.value) {
      return `${activeVideoStatus.value.file_name} · ${activeVideoStatus.value.state}`
    }
    if (uploadState.value === 'completed') {
      return `已完成 ${processedCount.value} / ${totalVideoCount.value || processedCount.value} 个素材`
    }
    if (uploadState.value === 'partial_failed') {
      return `成功 ${statusCounts.value.completed} 个，失败 ${statusCounts.value.failed} 个`
    }
    if (uploadError.value) {
      return uploadError.value
    }
    return '等待服务端返回处理状态'
  })

  async function fetchAssets() {
    loading.value = true
    try {
      const res = await assetApi.fetchAssets({ page: page.value, size: size.value })
      assets.value = res.assets
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  /** Mock 上传（保留 fallback） */
  async function uploadFilesMock(files: File[]) {
    uploading.value = true
    uploadProgress.value = 0
    uploadError.value = null
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        await assetApi.uploadAsset(file)
        uploadProgress.value = Math.round(((i + 1) / files.length) * 100)
      }
      await fetchAssets()
    } catch (err) {
      uploadError.value = err instanceof Error ? err.message : '上传失败'
      throw err
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  /** 真实 API 上传 + 轮询 */
  async function uploadVideos(files: File[], options?: UploadVideoOptions) {
    // 停止之前的轮询
    stopPolling()

    uploading.value = true
    uploadState.value = 'uploading'
    uploadProgress.value = 0
    uploadError.value = null
    videoStatuses.value = []
    processedCount.value = 0
    totalVideoCount.value = files.length

    try {
      const res = await externalApi.uploadVideos(files, options)
      activeFolderId.value = res.folder_id
      totalVideoCount.value = res.video_count
      uploadState.value = 'processing'
      uploading.value = false
      uploadProgress.value = 100

      // 文件流上传时先插入本地占位，目录模式则等轮询返回视频列表后再补齐
      files.forEach((f, idx) => {
        assets.value.unshift({
          id: `ext_${res.folder_id}_${idx}`,
          name: f.name,
          type: 'video',
          url: '',
          thumbnail: '',
          tags: options?.product_name ? [options.product_name] : [],
          status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          file_size: f.size,
          width: 0,
          height: 0,
          kb_id: '',
        })
      })
      total.value = assets.value.length

      pollStopper = externalApi.pollUploadStatus(
        res.folder_id,
        handleStatusUpdate,
        handlePollError,
      )
    } catch (err) {
      uploading.value = false
      uploadState.value = 'error'
      uploadError.value = err instanceof Error ? err.message : '上传失败'
      throw err
    }
  }

  function handleStatusUpdate(status: UploadStatusResponse) {
    videoStatuses.value = status.videos
    processedCount.value = status.completed + status.failed
    totalVideoCount.value = status.total

    // 用 folder_id + index 匹配，避免 duplicate filename 问题
    status.videos.forEach((v, idx) => {
      const localId = `ext_${activeFolderId.value}_${idx}`
      let localAsset = assets.value.find((a) => a.id === localId)

      if (!localAsset) {
        localAsset = {
          id: localId,
          name: v.file_name,
          type: 'video',
          url: '',
          thumbnail: '',
          tags: [],
          status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          file_size: 0,
          width: 0,
          height: 0,
          kb_id: '',
        }
        assets.value.unshift(localAsset)
      }

      localAsset.name = v.file_name
      localAsset.status = v.state === 'completed' ? 'completed' : v.state === 'failed' ? 'failed' : 'processing'
      if (v.media_id) {
        localAsset.kb_id = v.media_id
      }
      localAsset.updated_at = new Date().toISOString()
    })

    total.value = assets.value.length

    if (status.state !== 'processing') {
      uploadState.value = status.state
      stopPolling()
    }
  }

  function handlePollError(err: Error) {
    uploadState.value = 'error'
    uploadError.value = err.message
    uploading.value = false
    stopPolling()
  }

  function stopPolling() {
    if (pollStopper) {
      pollStopper.stop()
      pollStopper = null
    }
  }

  /** 统一入口：优先真实 API，fallback 到 mock */
  async function uploadFiles(files: File[], options?: UploadVideoOptions) {
    const useRealApi = hasApiBaseUrl()
    if (useRealApi) {
      await uploadVideos(files, options)
    } else {
      await uploadFilesMock(files)
    }
  }

  async function updateAssetTags(id: string, tags: string[]) {
    await assetApi.updateAssetTags(id, tags)
    const asset = assets.value.find((a) => a.id === id)
    if (asset) {
      asset.tags = tags
      asset.updated_at = new Date().toISOString()
    }
  }

  async function deleteAsset(id: string) {
    await assetApi.deleteAsset(id)
    assets.value = assets.value.filter((a) => a.id !== id)
    selectedAssets.value = selectedAssets.value.filter((s) => s !== id)
  }

  async function pollAssetStatus(id: string) {
    const updated = await assetApi.pollAssetStatus(id)
    if (updated) {
      const idx = assets.value.findIndex((a) => a.id === id)
      if (idx >= 0) {
        assets.value[idx] = updated
      }
    }
  }

  function setFilter(newFilter: Partial<AssetFilter>) {
    filter.value = { ...filter.value, ...newFilter }
  }

  function selectAsset(id: string) {
    const idx = selectedAssets.value.indexOf(id)
    if (idx >= 0) {
      selectedAssets.value.splice(idx, 1)
    } else {
      selectedAssets.value.push(id)
    }
  }

  function selectAllAssets() {
    selectedAssets.value = filteredAssets.value.map((a) => a.id)
  }

  function clearSelection() {
    selectedAssets.value = []
  }

  function resetUploadState() {
    stopPolling()
    uploading.value = false
    uploadProgress.value = 0
    uploadState.value = 'idle'
    uploadError.value = null
    videoStatuses.value = []
    processedCount.value = 0
    totalVideoCount.value = 0
    activeFolderId.value = null
  }

  return {
    assets,
    loading,
    uploading,
    uploadProgress,
    uploadError,
    uploadState,
    videoStatuses,
    processedCount,
    totalVideoCount,
    activeFolderId,
    filter,
    selectedAssets,
    total,
    page,
    size,
    filteredAssets,
    assetById,
    uploadingAssets,
    taggedAssets,
    statusCounts,
    uploadProgressPercent,
    activeVideoStatus,
    currentStageLabel,
    currentStatusSummary,
    fetchAssets,
    uploadFiles,
    uploadVideos,
    updateAssetTags,
    deleteAsset,
    pollAssetStatus,
    setFilter,
    selectAsset,
    selectAllAssets,
    clearSelection,
    resetUploadState,
  }
})
