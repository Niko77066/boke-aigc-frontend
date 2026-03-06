<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/asset'
import FileUploader from '@/components/upload/FileUploader.vue'
import AssetCard from '@/components/upload/AssetCard.vue'
import TagInput from '@/components/common/TagInput.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, FolderOpened } from '@element-plus/icons-vue'

const assetStore = useAssetStore()
const editingAssetId = ref<string | null>(null)
const editingTags = ref<string[]>([])
const searchQuery = ref('')
const typeFilter = ref<'all' | 'video' | 'image'>('all')
const showTagDialog = computed({
  get: () => editingAssetId.value !== null,
  set: (val: boolean) => { if (!val) editingAssetId.value = null },
})

onMounted(() => {
  assetStore.fetchAssets()
})

const displayedAssets = computed(() => {
  let result = [...assetStore.assets]
  if (typeFilter.value !== 'all') {
    result = result.filter((a) => a.type === typeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (a) => a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
  return result
})

const processingAssets = computed(() => assetStore.assets.filter((a) => a.status === 'processing'))

// Poll processing assets
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollTimer = setInterval(() => {
    for (const asset of processingAssets.value) {
      assetStore.pollAssetStatus(asset.id)
    }
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

async function handleUpload(files: File[]) {
  try {
    await assetStore.uploadFiles(files)
    ElMessage.success(`成功上传 ${files.length} 个文件`)
  } catch {
    ElMessage.error('上传失败，请重试')
  }
}

function handleUploadError(msg: string) {
  ElMessage.warning(msg)
}

async function handleDelete(assetId: string) {
  try {
    await ElMessageBox.confirm('确定要删除这个资产吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await assetStore.deleteAsset(assetId)
    ElMessage.success('删除成功')
  } catch {
    // cancelled
  }
}

function startEditTags(assetId: string) {
  const asset = assetStore.assetById(assetId)
  if (asset) {
    editingAssetId.value = assetId
    editingTags.value = [...asset.tags]
  }
}

async function saveTags() {
  if (editingAssetId.value) {
    await assetStore.updateAssetTags(editingAssetId.value, editingTags.value)
    editingAssetId.value = null
    ElMessage.success('标签已更新')
  }
}
</script>

<template>
  <div class="asset-management flex flex-col h-full p-6 gap-6">
    <div class="page-header flex items-start justify-between">
      <div>
        <h1 class="page-title text-2xl font-bold text-white">资产管理</h1>
        <p class="page-desc text-sm text-slate-400 mt-1">
          上传和管理捕鱼游戏营销素材，AI自动打标分类
        </p>
      </div>
      <div class="header-stats flex items-center gap-6 text-center">
        <div>
          <span class="text-2xl font-bold text-purple-300">{{ assetStore.assets.length }}</span>
          <span class="block text-xs text-slate-400">总素材</span>
        </div>
        <div>
          <span class="text-2xl font-bold text-cyan-300">{{ processingAssets.length }}</span>
          <span class="block text-xs text-slate-400">处理中</span>
        </div>
      </div>
    </div>

    <FileUploader @upload="handleUpload" @error="handleUploadError" />

    <div class="glass-morphism flex-1 flex flex-col rounded-xl overflow-hidden p-5 gap-4">
      <!-- Filters -->
      <div class="filter-bar flex items-center gap-4">
        <el-input
          v-model="searchQuery"
          placeholder="搜索素材名称或标签..."
          :prefix-icon="Search"
          clearable
          class="search-input flex-1"
        />
        <el-radio-group v-model="typeFilter">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="video">视频</el-radio-button>
          <el-radio-button value="image">图片</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Asset grid -->
      <div class="asset-grid-container flex-1 overflow-y-auto pr-2">
        <div v-if="assetStore.loading" class="grid grid-cols-asset gap-4">
          <div v-for="i in 6" :key="i" class="skeleton h-52 rounded-lg"></div>
        </div>
        <div v-else-if="displayedAssets.length === 0" class="flex flex-col items-center justify-center h-full text-slate-500">
          <el-icon :size="64"><FolderOpened /></el-icon>
          <p class="mt-4 text-lg">暂无素材</p>
          <p class="text-sm">拖拽文件到上方区域开始上传</p>
        </div>
        <div v-else class="grid grid-cols-asset gap-4">
          <AssetCard
            v-for="asset in displayedAssets"
            :key="asset.id"
            :asset="asset"
            @delete="handleDelete"
            @tag-update="startEditTags"
          />
        </div>
      </div>
    </div>

    <!-- Tag editing dialog -->
    <el-dialog v-model="showTagDialog" title="编辑标签" width="480px" :close-on-click-modal="false">
      <TagInput :tags="editingTags" placeholder="输入标签后按回车添加" @update:tags="editingTags = $event" />
      <template #footer>
        <el-button @click="showTagDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTags">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.grid-cols-asset {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.asset-grid-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.asset-grid-container::-webkit-scrollbar {
  display: none;
}
.skeleton {
  background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>