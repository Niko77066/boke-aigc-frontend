import type { Asset, GetAssetsResponse, UploadAssetResponse, UpdateTagsResponse } from '@/types'
import { delay, generateId } from '@/utils/helpers'

let assets: Asset[] = []

export async function fetchAssets(params?: { page?: number; size?: number; type?: string; tags?: string[] }): Promise<GetAssetsResponse> {
  await delay(600)
  let filtered = [...assets]

  if (params?.type && params.type !== 'all') {
    filtered = filtered.filter((a) => a.type === params.type)
  }
  if (params?.tags && params.tags.length > 0) {
    filtered = filtered.filter((a) => params.tags!.some((t) => a.tags.includes(t)))
  }

  const page = params?.page ?? 1
  const size = params?.size ?? 20
  const start = (page - 1) * size
  const paged = filtered.slice(start, start + size)

  return {
    assets: paged,
    total: filtered.length,
    page,
    size,
  }
}

export async function uploadAsset(_file: File): Promise<UploadAssetResponse> {
  await delay(1500)
  const assetId = generateId('asset')
  const newAsset: Asset = {
    id: assetId,
    name: _file.name,
    type: _file.type.startsWith('video') ? 'video' : 'image',
    url: `https://mock-cdn.boke.com/uploads/${assetId}`,
    thumbnail: `https://picsum.photos/seed/${assetId}/320/180`,
    tags: [],
    status: 'processing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    file_size: _file.size,
    duration: _file.type.startsWith('video') ? Math.floor(Math.random() * 30) + 5 : undefined,
    width: 1920,
    height: 1080,
    kb_id: 'kb_boke_fishing_001',
  }
  assets.unshift(newAsset)

  // Simulate processing completion after a delay
  setTimeout(() => {
    const found = assets.find((a) => a.id === assetId)
    if (found) {
      found.status = 'completed'
      found.tags = ['自动标签', '捕鱼游戏']
      found.updated_at = new Date().toISOString()
    }
  }, 3000)

  return {
    asset_id: assetId,
    status: 'processing',
  }
}

export async function pollAssetStatus(assetId: string): Promise<Asset | undefined> {
  await delay(500)
  return assets.find((a) => a.id === assetId)
}

export async function updateAssetTags(assetId: string, tags: string[]): Promise<UpdateTagsResponse> {
  await delay(400)
  const asset = assets.find((a) => a.id === assetId)
  if (asset) {
    asset.tags = tags
    asset.updated_at = new Date().toISOString()
  }
  return {
    asset_id: assetId,
    tags,
    updated_at: new Date().toISOString(),
  }
}

export async function deleteAsset(assetId: string): Promise<void> {
  await delay(400)
  assets = assets.filter((a) => a.id !== assetId)
}
