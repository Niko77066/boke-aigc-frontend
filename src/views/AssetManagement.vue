<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/asset'
import FileUploader from '@/components/upload/FileUploader.vue'
import AssetCard from '@/components/upload/AssetCard.vue'
import TagInput from '@/components/common/TagInput.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, FolderOpen, Upload, Loader2, CheckCircle, XCircle } from 'lucide-vue-next'
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
        <h1 class="page-title text-2xl font-bold text-gray-900">资产管理</h1>
        <p class="page-desc text-sm text-gray-500 mt-1">
          上传和管理捕鱼游戏营销素材，AI自动打标分类
        </p>
      </div>
      <div class="header-stats flex items-center gap-6 text-center">
        <div>
          <span class="text-2xl font-bold text-purple-600">{{ assetStore.assets.length }}</span>
          <span class="block text-xs text-gray-500">总素材</span>
        </div>
        <div>
          <span class="text-2xl font-bold text-blue-500">{{ processingAssets.length }}</span>
          <span class="block text-xs text-gray-500">处理中</span>
        </div>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-section">
      <FileUploader @upload="handleUpload" @error="handleUploadError" />

      <!-- 上传配置（真实 API 模式时显示） -->
      <div v-if="useRealApi" class="upload-config mt-3">
        <div
          class="config-toggle flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-purple-600 transition-colors"
          @click="showUploadConfig = !showUploadConfig"
        >
          <Upload :size="16" />
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
        class="upload-status rounded-lg p-4 mt-3"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium" :class="{
            'text-blue-500': assetStore.uploadState === 'processing',
            'text-emerald-600': assetStore.uploadState === 'completed',
            'text-amber-500': assetStore.uploadState === 'partial_failed',
            'text-red-500': assetStore.uploadState === 'error',
            'text-purple-600': assetStore.uploadState === 'uploading',
          }">
            <Loader2 v-if="assetStore.uploadState === 'processing' || assetStore.uploadState === 'uploading'" :size="16" class="animate-spin mr-1 inline-block align-text-bottom" />
            <CheckCircle v-else-if="assetStore.uploadState === 'completed'" :size="16" class="mr-1 inline-block align-text-bottom" />
            <XCircle v-else-if="assetStore.uploadState === 'error' || assetStore.uploadState === 'partial_failed'" :size="16" class="mr-1 inline-block align-text-bottom" />
            {{ uploadStateLabel }}
          </span>
          <span v-if="assetStore.totalVideoCount > 0" class="text-xs text-gray-500">
            {{ assetStore.processedCount }} / {{ assetStore.totalVideoCount }} 个视频
          </span>
        </div>
        <el-progress
          v-if="assetStore.uploadState === 'processing'"
          :percentage="assetStore.totalVideoCount > 0 ? Math.round((assetStore.processedCount / assetStore.totalVideoCount) * 100) : 0"
          :stroke-width="6"
          color="#7C5CFC"
        />
        <!-- 各视频状态明细 -->
        <div v-if="assetStore.videoStatuses.length > 0" class="video-status-list mt-3 space-y-1">
          <div
            v-for="v in assetStore.videoStatuses"
            :key="v.file_name"
            class="flex items-center justify-between text-xs py-1 px-2 rounded"
            :class="{
              'bg-emerald-50': v.state === 'completed',
              'bg-red-50': v.state === 'failed',
              'bg-gray-50': v.state !== 'completed' && v.state !== 'failed',
            }"
          >
            <span class="text-gray-700 truncate max-w-[60%]">{{ v.file_name }}</span>
            <span :class="{
              'text-emerald-600': v.state === 'completed',
              'text-red-500': v.state === 'failed',
              'text-blue-500': v.state === 'analyzing',
              'text-purple-600': v.state === 'uploading' || v.state === 'uploading_kb',
              'text-gray-400': v.state === 'pending',
            }">
              {{ videoStateLabel[v.state] ?? v.state }}
            </span>
          </div>
        </div>
        <!-- 错误信息 -->
        <div v-if="assetStore.uploadError" class="mt-2 text-xs text-red-500">
          {{ assetStore.uploadError }}
        </div>
      </div>
    </div>

    <div class="glass-morphism flex-1 flex flex-col rounded-2xl overflow-hidden p-5 gap-4">
      <!-- Filters -->
      <div class="filter-bar flex items-center gap-4">
        <el-input
          v-model="searchQuery"
          placeholder="搜索素材名称或标签..."
          clearable
          class="search-input flex-1"
        >
          <template #prefix><Search :size="16" class="text-gray-400" /></template>
        </el-input>
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
        <div v-else-if="displayedAssets.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
          <FolderOpen :size="64" />
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

/* Base Container */
.asset-management {
  background-color: #F8F7F4;
  color: #111827;
}

/* Page Header */
.page-header {
  @apply bg-white border border-gray-200 rounded-xl p-6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.page-header:hover {
  box-shadow: var(--shadow-md);
}

/* Glass Morphism - clean card */
.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-morphism:hover {
  border-color: #d1d5db;
  box-shadow: var(--shadow-md);
}

/* Upload Config */
.config-toggle {
  transition: all 0.3s ease;
}
.config-fields {
  @apply bg-gray-50 border-t border-gray-200;
}

/* Upload Status */
.upload-status {
  @apply bg-purple-50;
  border-left: 2px solid #a78bfa;
}
.video-status-list > div {
  border: 1px solid transparent;
  transition: all 0.3s ease;
}
.video-status-list > div:hover {
  @apply bg-purple-50;
  border-color: #e9d5ff;
}

/* Grid */
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

/* Skeleton */
.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border: 1px solid #e5e7eb;
}
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Element Plus Overrides - Light theme */
:deep(.el-input__wrapper) {
  background-color: #ffffff !important;
  border: 1px solid #d1d5db !important;
  box-shadow: none !important;
  transition: all 0.3s ease !important;
}
:deep(.el-input__wrapper.is-focus),
:deep(.el-input__wrapper:hover) {
  border-color: var(--brand-primary) !important;
  box-shadow: 0 0 0 2px rgba(124, 92, 252, 0.1) !important;
}
:deep(.el-input-group__prepend) {
  background-color: #f9fafb !important;
  border: 1px solid #d1d5db !important;
  border-right: none !important;
  color: #6b7280 !important;
  font-weight: 600;
}
:deep(.el-radio-button__inner) {
  background-color: #ffffff !important;
  border: 1px solid #d1d5db !important;
  color: #6b7280 !important;
  transition: all 0.3s ease !important;
}
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #f5f3ff !important;
  color: var(--brand-primary) !important;
  border-color: var(--brand-primary) !important;
  box-shadow: -1px 0 0 0 var(--brand-primary) !important;
}
:deep(.el-dialog) {
  background: #ffffff !important;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  border-radius: 1rem !important;
}
:deep(.el-dialog__title) {
  color: #111827 !important;
}
:deep(.el-button) {
  background-color: #ffffff !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  transition: all 0.3s ease !important;
}
:deep(.el-button:hover) {
  background-color: #f9fafb !important;
  border-color: var(--brand-primary) !important;
  color: var(--brand-primary) !important;
}
:deep(.el-button--primary) {
  background: var(--brand-primary) !important;
  border: none !important;
  color: #ffffff !important;
}
:deep(.el-button--primary:hover) {
  background: var(--brand-primary-dark) !important;
  box-shadow: var(--shadow-md) !important;
}
</style>
