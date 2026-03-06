<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import { getDraftTracks, type DraftInfo } from '@/api/capcut'
import {
  Film, Download, ExternalLink, Video, RotateCw, CheckCircle2,
  AlertTriangle, Layers, Clock, Loader2,
} from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const router = useRouter()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

// ── Video statuses from store ────────────────────────────────────
const videoStatuses = computed(() => creativeStore.videoStatusList)
const successVideos = computed(() => videoStatuses.value.filter((s) => s.status === 'success'))
const failedVideos = computed(() => videoStatuses.value.filter((s) => s.status === 'failed'))
const hasVideos = computed(() => successVideos.value.length > 0)

// ── Draft info ───────────────────────────────────────────────────
const draftInfo = ref<DraftInfo | null>(null)
const draftLoading = ref(false)
const draftError = ref<string | null>(null)

async function loadDraftInfo() {
  const did = creativeStore.videoDraftId
  if (!did) return
  draftLoading.value = true
  draftError.value = null
  try {
    draftInfo.value = await getDraftTracks(did)
  } catch (e) {
    draftError.value = e instanceof Error ? e.message : String(e)
  } finally {
    draftLoading.value = false
  }
}

// ── Actions ──────────────────────────────────────────────────────
function startOver() {
  creativeStore.resetPipeline()
  creativeStore.resetCreative()
  workflowStore.resetWorkflow()
  router.push('/creative')
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const min = Math.floor(s / 60)
  const sec = s % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

function triggerConfetti() {
  const duration = 4 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) return clearInterval(interval)
    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

onMounted(() => {
  if (hasVideos.value) triggerConfetti()
  if (creativeStore.videoDraftId) loadDraftInfo()
})
</script>

<template>
  <div class="result-delivery flex flex-col h-full p-6 gap-6">
    <!-- Page header -->
    <div class="page-header p-5">
      <h1 class="page-title text-2xl font-bold text-gray-900">成片交付</h1>
      <p class="page-desc text-sm text-gray-500 mt-1">
        预览 AI 产线自动生成的营销视频，下载成片或查看剪映草稿
      </p>
    </div>

    <!-- Main content -->
    <div class="results-section glass-morphism flex-1 flex flex-col rounded-2xl overflow-hidden p-6">
      <!-- Failure notice -->
      <div v-if="failedVideos.length > 0" class="failure-notice mb-4">
        <AlertTriangle :size="16" />
        <span>{{ failedVideos.length }} 个视频渲染失败</span>
      </div>

      <!-- Video cards -->
      <div v-if="hasVideos" class="video-grid">
        <div class="flex items-center gap-2 mb-4">
          <Film :size="20" class="text-purple-500" />
          <h3 class="text-lg font-semibold text-gray-900">AI 产线成片</h3>
          <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium ml-auto">
            {{ successVideos.length }} 个视频
          </span>
        </div>

        <div class="grid gap-6" :class="successVideos.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'">
          <div
            v-for="(vid, idx) in successVideos"
            :key="vid.task_id"
            class="video-card"
          >
            <div class="video-label">
              <span class="text-xs font-bold text-purple-600">视频 {{ idx + 1 }}</span>
              <span v-if="vid.duration" class="text-xs text-gray-400 ml-auto flex items-center gap-1">
                <Clock :size="12" />
                {{ formatDuration(vid.duration) }}
              </span>
            </div>
            <video
              :src="vid.video_url"
              controls
              :poster="vid.cover_url"
              class="w-full rounded-xl bg-black aspect-video"
            />
            <div class="video-actions mt-3 flex gap-2">
              <a
                :href="vid.video_url"
                target="_blank"
                download
                class="action-btn primary"
              >
                <Download :size="14" />
                下载成片
              </a>
              <a
                :href="vid.video_url"
                target="_blank"
                class="action-btn secondary"
              >
                <ExternalLink :size="14" />
                新窗口播放
              </a>
            </div>
            <div class="text-xs text-gray-400 mt-2">task_id: {{ vid.task_id }}</div>
          </div>
        </div>
      </div>

      <!-- Draft info card -->
      <div v-if="creativeStore.videoDraftId" class="draft-section mt-6">
        <div class="flex items-center gap-2 mb-3">
          <Layers :size="18" class="text-purple-500" />
          <h3 class="text-base font-semibold text-gray-900">剪映草稿信息</h3>
        </div>

        <div v-if="draftLoading" class="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 :size="16" class="animate-spin" />
          加载草稿信息中...
        </div>

        <div v-else-if="draftError" class="text-sm text-red-500">
          草稿信息加载失败: {{ draftError }}
        </div>

        <div v-else-if="draftInfo" class="draft-card">
          <div class="text-xs text-gray-500 mb-3">草稿 ID: {{ draftInfo.draft_id }}</div>
          <div class="tracks-grid">
            <div
              v-for="track in draftInfo.tracks"
              :key="track.name"
              class="track-item"
            >
              <div class="track-name">{{ track.name }}</div>
              <div class="track-meta">
                <span>类型: {{ track.type }}</span>
                <span>片段: {{ track.segment_count }}</span>
                <span v-if="track.end_time">时长: {{ formatDuration(track.end_time) }}</span>
                <span v-if="track.muted" class="text-orange-500">已静音</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-sm text-gray-400">暂无草稿详情</div>
      </div>

      <!-- No results -->
      <div v-if="!hasVideos && failedVideos.length === 0" class="empty-results">
        <Video :size="64" class="text-gray-300" />
        <h2 class="text-xl font-semibold text-gray-700 mt-4">暂无渲染结果</h2>
        <p class="text-gray-500 mt-2 mb-4">请先完成创意生成与视频制作</p>
        <el-button type="primary" @click="router.push('/creative')">
          前往创意控制台
        </el-button>
      </div>
    </div>

    <!-- Action bar -->
    <div v-if="hasVideos" class="action-bar glass-morphism flex items-center justify-between p-4 rounded-2xl">
      <div class="success-count flex items-center gap-2 text-sm font-medium text-emerald-600">
        <CheckCircle2 :size="16" />
        {{ successVideos.length }} 个视频渲染成功
        <span v-if="failedVideos.length > 0" class="text-red-400 ml-2">
          ({{ failedVideos.length }} 个失败)
        </span>
      </div>
      <el-button size="large" @click="startOver">
        <RotateCw :size="16" class="mr-1" />
        重新制作
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.page-header {
  @apply bg-white border border-gray-200 rounded-2xl;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.glass-morphism:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.failure-notice {
  @apply flex items-center gap-2 p-3 rounded-lg text-sm font-medium;
  background: #FFF5F5;
  border: 1px solid #FFD6D6;
  color: #FF6B6B;
}

/* ── Video cards ──────────────────────────────── */
.video-card {
  @apply p-4 rounded-2xl border border-gray-200 bg-white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.video-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.video-label {
  @apply flex items-center mb-3;
}

.action-btn {
  @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer;
}
.action-btn.primary {
  @apply bg-purple-600 text-white hover:bg-purple-700;
}
.action-btn.secondary {
  @apply border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600;
}

/* ── Draft card ───────────────────────────────── */
.draft-card {
  @apply p-4 rounded-xl border border-gray-200 bg-gray-50;
}

.tracks-grid {
  @apply flex flex-col gap-2;
}

.track-item {
  @apply flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100;
}

.track-name {
  @apply text-sm font-medium text-gray-800;
}

.track-meta {
  @apply flex items-center gap-3 text-xs text-gray-500;
}

/* ── Empty state ──────────────────────────────── */
.empty-results {
  @apply flex flex-col items-center justify-center h-full text-center;
}

/* ── Action bar ───────────────────────────────── */
.action-bar {
  @apply bg-white border border-gray-200 rounded-2xl;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ── Element Plus overrides ───────────────────── */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}
:deep(.el-button--primary) {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
}
:deep(.el-button--primary:hover) {
  background-color: var(--brand-primary-dark);
  border-color: var(--brand-primary-dark);
}
</style>
