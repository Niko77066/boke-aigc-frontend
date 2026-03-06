import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Asset, AssetFilter } from '@/types'
import { assetApi } from '@/api'

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<Asset[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const filter = ref<AssetFilter>({})
  const selectedAssets = ref<string[]>([])
  const total = ref(0)
  const page = ref(1)
  const size = ref(20)

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

  async function uploadFiles(files: File[]) {
    uploading.value = true
    uploadProgress.value = 0
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        await assetApi.uploadAsset(file)
        uploadProgress.value = Math.round(((i + 1) / files.length) * 100)
      }
      await fetchAssets()
    } finally {
      uploading.value = false
      uploadProgress.value = 0
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

  return {
    assets,
    loading,
    uploading,
    uploadProgress,
    filter,
    selectedAssets,
    total,
    page,
    size,
    filteredAssets,
    assetById,
    uploadingAssets,
    taggedAssets,
    fetchAssets,
    uploadFiles,
    updateAssetTags,
    deleteAsset,
    pollAssetStatus,
    setFilter,
    selectAsset,
    selectAllAssets,
    clearSelection,
  }
})
