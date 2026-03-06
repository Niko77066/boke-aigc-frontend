<script setup lang="ts">
import type { Asset } from '@/types'
import { formatFileSize, formatDuration, formatDate } from '@/utils/helpers'
import TagDisplay from '@/components/common/TagDisplay.vue'
import {
  Loading,
  VideoCamera,
  Picture,
  Delete,
  EditPen,
} from '@element-plus/icons-vue'

defineProps<{
  asset: Asset
  loading?: boolean
}>()

const emit = defineEmits<{
  tagUpdate: [assetId: string]
  delete: [assetId: string]
}>()
</script>

<template>
  <div class="asset-card">
    <div class="card-thumbnail">
      <img :src="asset.thumbnail" :alt="asset.name" loading="lazy" class="thumbnail-img" />
      
      <div v-if="asset.status === 'processing'" class="processing-overlay">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span class="mt-2 text-xs font-semibold">处理中...</span>
      </div>

      <div class="card-overlay">
        <div class="overlay-actions">
          <el-button circle type="primary" @click.stop="emit('tagUpdate', asset.id)">
            <el-icon :size="16"><EditPen /></el-icon>
          </el-button>
          <el-button circle type="danger" @click.stop="emit('delete', asset.id)">
            <el-icon :size="16"><Delete /></el-icon>
          </el-button>
        </div>
        <div class="overlay-tags">
          <TagDisplay :tags="asset.tags" :max-display="3" />
        </div>
      </div>

      <div class="type-badge">
        <el-icon :size="12">
          <component :is="asset.type === 'video' ? VideoCamera : Picture" />
        </el-icon>
      </div>
      <div v-if="asset.type === 'video' && asset.duration" class="duration-badge">
        {{ formatDuration(asset.duration) }}
      </div>
    </div>

    <div class="card-body p-3">
      <div class="card-name" :title="asset.name">{{ asset.name }}</div>
      <div class="card-meta">
        <span>{{ formatFileSize(asset.file_size) }}</span>
        <span>•</span>
        <span>{{ formatDate(asset.created_at) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.asset-card {
  @apply relative rounded-lg overflow-hidden transition-all duration-300;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
}
.asset-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glow-primary);
  border-color: var(--brand-primary);
}

.card-thumbnail {
  @apply relative aspect-video overflow-hidden;
}
.thumbnail-img {
  @apply w-full h-full object-cover transition-transform duration-300;
}
.asset-card:hover .thumbnail-img {
  transform: scale(1.1);
}

.processing-overlay {
  @apply absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-purple-300;
  backdrop-filter: blur(4px);
}

.card-overlay {
  @apply absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-300 p-3 flex flex-col justify-between;
}
.asset-card:hover .card-overlay {
  opacity: 1;
}
.overlay-actions {
  @apply flex items-center justify-end gap-2;
}
.overlay-tags {
  @apply self-start;
}

.type-badge, .duration-badge {
  @apply absolute text-white text-xs px-2 py-1 rounded-full;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
}
.type-badge { @apply top-2 left-2; }
.duration-badge { @apply bottom-2 right-2; }

.card-name {
  @apply text-sm font-semibold text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis;
}
.card-meta {
  @apply flex items-center gap-2 text-xs text-slate-500 mt-1;
}
</style>