<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/asset'
import FileUploader from '@/components/upload/FileUploader.vue'
import AssetCard from '@/components/upload/AssetCard.vue'
import TagInput from '@/components/common/TagInput.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, FolderOpened, Upload, Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import type { UploadVideoOptions } from '@/api/external'

const assetStore = useAssetStore()
const editingAssetId = ref<string | null>(null)
const editingTags = ref<string[]>([])
const searchQuery = ref('')
const typeFilter = ref<'all' | 'video' | 'image'>('all')
const showTagDialog = computed({
  get: () => editingAssetId.value !== null,
  set: (val: boolean) => { if (!val) editingAssetId.value = null },
})

// 上传配置
const showUploadConfig = ref(false)
const productName = ref('')
const folderName = ref('')
const analyzePrompt = ref('')

const useRealApi = Boolean(import.meta.env.VITE_API_BASE_URL)

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

// 状态中文映射
const videoStateLabel: Record<string, string> = {
  pending: '等待处理',
  uploading: '上传中',
  analyzing: 'AI 分析中',
  uploading_kb: '入库中',
  completed: '已完成',
  failed: '失败',
}

const uploadStateLabel = computed(() => {
  const map: Record<string, string> = {
    idle: '',
    uploading: '正在上传...',
    processing: '服务器处理中...',
    completed: '全部处理完成',
    partial_failed: '部分处理失败',
    error: '上传出错',
  }
  return map[assetStore.uploadState] ?? ''
})

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
    const options: UploadVideoOptions = {}
    if (productName.value) options.product_name = productName.value
    if (folderName.value) options.folder_name = folderName.value
    if (analyzePrompt.value) options.analyze_prompt = analyzePrompt.value

    await assetStore.uploadFiles(files, options)
    ElMessage.success(`成功上传 ${files.length} 个文件`)
  } catch {
    ElMessage.error(assetStore.uploadError ?? '上传失败，请重试')
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

    <!-- 上传区域 -->
    <div class="upload-section">
      <FileUploader @upload="handleUpload" @error="handleUploadError" />

      <!-- 上传配置（真实 API 模式时显示） -->
      <div v-if="useRealApi" class="upload-config mt-3">
        <div
          class="config-toggle flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-cyan-300 transition-colors"
          @click="showUploadConfig = !showUploadConfig"
        >
          <el-icon><Upload /></el-icon>
          <span>{{ showUploadConfig ? '收起上传配置' : '展开上传配置（产品名/分析维度）' }}</span>
        </div>
        <transition name="fade-slide">
          <div v-if="showUploadConfig" class="config-fields glass-morphism rounded-lg p-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <el-input
              v-model="productName"
              placeholder="产品名称（可选）"
              clearable
              size="default"
            >
              <template #prepend>产品</template>
            </el-input>
            <el-input
              v-model="folderName"
              placeholder="文件夹名称（可选）"
              clearable
              size="default"
            >
              <template #prepend>分组</template>
            </el-input>
            <el-input
              v-model="analyzePrompt"
              placeholder="自定义分析 Prompt（可选）"
              clearable
              size="default"
            >
              <template #prepend>分析</template>
            </el-input>
          </div>
        </transition>
      </div>

      <!-- 上传/处理状态 -->
      <div
        v-if="assetStore.uploadState !== 'idle'"
        class="upload-status glass-morphism rounded-lg p-4 mt-3"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium" :class="{
            'text-cyan-300': assetStore.uploadState === 'processing',
            'text-green-400': assetStore.uploadState === 'completed',
            'text-yellow-400': assetStore.uploadState === 'partial_failed',
            'text-red-400': assetStore.uploadState === 'error',
            'text-purple-300': assetStore.uploadState === 'uploading',
          }">
            <el-icon v-if="assetStore.uploadState === 'processing' || assetStore.uploadState === 'uploading'" class="is-loading mr-1"><Loading /></el-icon>
            <el-icon v-else-if="assetStore.uploadState === 'completed'" class="mr-1"><CircleCheck /></el-icon>
            <el-icon v-else-if="assetStore.uploadState === 'error' || assetStore.uploadState === 'partial_failed'" class="mr-1"><CircleClose /></el-icon>
            {{ uploadStateLabel }}
          </span>
          <span v-if="assetStore.totalVideoCount > 0" class="text-xs text-slate-400">
            {{ assetStore.processedCount }} / {{ assetStore.totalVideoCount }} 个视频
          </span>
        </div>
        <el-progress
          v-if="assetStore.uploadState === 'processing'"
          :percentage="assetStore.totalVideoCount > 0 ? Math.round((assetStore.processedCount / assetStore.totalVideoCount) * 100) : 0"
          :stroke-width="6"
          color="#22d3ee"
        />
        <!-- 各视频状态明细 -->
        <div v-if="assetStore.videoStatuses.length > 0" class="video-status-list mt-3 space-y-1">
          <div
            v-for="v in assetStore.videoStatuses"
            :key="v.file_name"
            class="flex items-center justify-between text-xs py-1 px-2 rounded"
            :class="{
              'bg-green-900/20': v.state === 'completed',
              'bg-red-900/20': v.state === 'failed',
              'bg-slate-800/40': v.state !== 'completed' && v.state !== 'failed',
            }"
          >
            <span class="text-slate-300 truncate max-w-[60%]">{{ v.file_name }}</span>
            <span :class="{
              'text-green-400': v.state === 'completed',
              'text-red-400': v.state === 'failed',
              'text-cyan-300': v.state === 'analyzing',
              'text-purple-300': v.state === 'uploading' || v.state === 'uploading_kb',
              'text-slate-400': v.state === 'pending',
            }">
              {{ videoStateLabel[v.state] ?? v.state }}
            </span>
          </div>
        </div>
        <!-- 错误信息 -->
        <div v-if="assetStore.uploadError" class="mt-2 text-xs text-red-400">
          {{ assetStore.uploadError }}
        </div>
      </div>
    </div>

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
@reference "tailwindcss";

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
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
