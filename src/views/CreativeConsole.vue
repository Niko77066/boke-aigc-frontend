<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import TaskConfigForm from '@/components/creative/TaskConfigForm.vue'
import ScriptEditor from '@/components/creative/ScriptEditor.vue'
import type { TaskConfig } from '@/types'
import { ElMessage } from 'element-plus'
import {
  Settings, FileText, Check, ArrowRight, Pencil, X,
  Loader2, Video, Film, Download, Sparkles, StopCircle,
  RotateCw,
} from 'lucide-vue-next'

const router = useRouter()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

// ── State ────────────────────────────────────────────────────────
const outputRef = ref<HTMLDivElement | null>(null)
const selectedPlanIndex = ref<number | null>(null)
const editingScript = ref(false)
const editingTtsText = ref('')
const manualTaskId = ref('')

// ── Step tracking ────────────────────────────────────────────────
// step 1 = form → generateCopy, step 2 = plan selected → generateVideo
const currentStep = computed(() => {
  if (creativeStore.pipelineVideoStarted) return 2
  if (creativeStore.pipelineOutput || creativeStore.pipelineRunning) return 1
  return 0
})

// ── Parsed plans from pipeline output ────────────────────────────
const parsedPlans = computed(() => {
  if (creativeStore.pipelineRunning || !creativeStore.pipelineOutput) return []
  if (creativeStore.pipelineMode !== '文案') return []
  const text = creativeStore.pipelineOutput
  const planRegex = /(?:方案[一二三四五六七八九十\d]|[①②③④⑤]|(?:^|\n)\s*\d+[.、）)])/gm
  const matches = [...text.matchAll(planRegex)]
  if (matches.length < 2) return []
  const plans: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i]!.index!
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : text.length
    plans.push(text.slice(start, end).trim())
  }
  return plans
})

const hasParsedPlans = computed(() => parsedPlans.value.length >= 2)

// ── Status ───────────────────────────────────────────────────────
const statusCardClass = computed(() => {
  if (creativeStore.pipelineRunning) return 'is-running'
  if (creativeStore.pipelineError) return 'is-error'
  if (creativeStore.pipelineVideoStarted) return 'is-video'
  if (creativeStore.pipelineOutput) return 'is-done'
  return 'is-idle'
})

const statusLabel = computed(() => {
  if (creativeStore.pipelineRunning && creativeStore.pipelineMode === '视频') return '视频制作中...'
  if (creativeStore.pipelineRunning) return 'AI 文案生成中...'
  if (creativeStore.pipelineError) return '发生错误'
  if (creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning) return '视频制作完成'
  if (hasParsedPlans.value) return '请选择一个方案'
  if (creativeStore.pipelineOutput) return '文案生成完成'
  return '等待生成'
})

// ── Video render tracking ────────────────────────────────────────
const renderDotClass = computed(() => {
  const s = creativeStore.videoRenderStatus?.status
  if (s === 'success') return 'dot-success'
  if (s === 'failed') return 'dot-error'
  if (s === 'processing') return 'dot-processing'
  return 'dot-pending'
})

const renderStatusLabel = computed(() => {
  const st = creativeStore.videoRenderStatus
  if (!st) return '等待中'
  if (st.status === 'success') return '渲染完成'
  if (st.status === 'failed') return `渲染失败: ${st.error || '未知错误'}`
  if (st.status === 'processing') return `渲染中${st.progress != null ? ` ${st.progress}%` : '...'}`
  return `状态: ${st.status}`
})

// ── Actions ──────────────────────────────────────────────────────

function handleConfigChange(config: Partial<TaskConfig>) {
  creativeStore.updateTaskConfig(config)
}

/** Step 1: Form submit → Pipeline generateCopy */
async function handleSubmit(config: TaskConfig) {
  creativeStore.updateTaskConfig(config)
  selectedPlanIndex.value = null

  // Build userMessage from form fields
  const parts: string[] = []
  const audienceLabels: Record<string, string> = {
    premium: '大R用户（高付费玩家）',
    sinking: '下沉市场用户',
    budget: '羊毛党（低付费用户）',
  }
  parts.push(`目标人群：${audienceLabels[config.audience] || config.audience}`)
  if (config.brainstorm_keywords.length > 0) {
    parts.push(`核心卖点：${config.brainstorm_keywords.join('、')}`)
  }
  if (config.reference_copy) {
    parts.push(`参考文案：${config.reference_copy}`)
  }
  parts.push('请为我生成 4 套创意营销文案方案。')

  const msg = parts.join('\n')
  await creativeStore.generateCopy(msg)
  scrollOutput()
}

/** Step 2: Select plan → Pipeline generateVideo */
async function handleSelectPlan(index: number) {
  selectedPlanIndex.value = index
  const planText = parsedPlans.value[index] ?? ''
  if (!planText) return
  ElMessage.success(`已选择方案 ${index + 1}，正在启动视频制作...`)
  await creativeStore.generateVideo(planText)
  scrollOutput()
}

function handleAbort() {
  creativeStore.abortPipeline()
}

function handleReset() {
  creativeStore.resetPipeline()
  selectedPlanIndex.value = null
  manualTaskId.value = ''
}

function handleEditPlan() {
  if (selectedPlanIndex.value === null) return
  editingTtsText.value = parsedPlans.value[selectedPlanIndex.value] ?? ''
  editingScript.value = true
}

function handleSaveEdit() {
  editingScript.value = false
  if (editingTtsText.value.trim()) {
    ElMessage.success('文案已编辑，点击方案卡片重新启动视频制作')
  }
}

function handleCancelEdit() {
  editingScript.value = false
}

function handleManualTrack() {
  const tid = manualTaskId.value.trim()
  if (tid) {
    creativeStore.trackVideoTask(tid)
    manualTaskId.value = ''
  }
}

function goToConfig() {
  workflowStore.nextStep()
  router.push('/config')
}

function scrollOutput() {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}
</script>

<template>
  <div class="creative-console flex flex-col h-full p-6 gap-6">
    <!-- Page header -->
    <div class="page-header flex items-start justify-between">
      <div>
        <h1 class="page-title text-2xl font-bold text-gray-900">创意控制台</h1>
        <p class="page-desc text-sm text-gray-500 mt-1">
          配置营销目标与卖点，AI 为您生成多套创意文案方案，选择方案后自动启动视频制作
        </p>
      </div>
      <!-- Status pill -->
      <div class="status-pill" :class="statusCardClass">
        <Loader2 v-if="creativeStore.pipelineRunning" :size="14" class="animate-spin" />
        <Sparkles v-else :size="14" />
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Main layout: left config panel + right output panel -->
    <div class="console-layout grid grid-cols-10 gap-6 flex-1 min-h-0">
      <!-- Left: form config -->
      <div class="config-panel glass-morphism col-span-3 flex flex-col rounded-2xl overflow-hidden">
        <div class="panel-header">
          <Settings :size="16" class="text-purple-500" />
          <span class="font-semibold">任务配置</span>
        </div>
        <div class="panel-body flex-1 p-4 overflow-y-auto">
          <TaskConfigForm
            :config="creativeStore.taskConfig ?? undefined"
            :loading="creativeStore.pipelineRunning && creativeStore.pipelineMode === '文案'"
            @submit="handleSubmit"
            @change="handleConfigChange"
          />
        </div>
      </div>

      <!-- Right: output panel -->
      <div class="output-panel glass-morphism col-span-7 flex flex-col rounded-2xl overflow-hidden">
        <div class="panel-header">
          <FileText :size="16" class="text-purple-500" />
          <span class="font-semibold">
            {{ currentStep >= 2 ? 'AI 视频制作' : 'AI 文案输出' }}
          </span>
          <span v-if="creativeStore.pipelineRunning" class="ml-2 text-xs text-purple-500 font-normal flex items-center gap-1">
            <Loader2 :size="12" class="animate-spin" />
            生成中...
          </span>
          <!-- Abort button -->
          <button
            v-if="creativeStore.pipelineRunning"
            class="ml-auto abort-btn"
            @click="handleAbort"
          >
            <StopCircle :size="14" />
            停止
          </button>
          <!-- Reset button -->
          <button
            v-else-if="creativeStore.pipelineOutput"
            class="ml-auto reset-btn"
            @click="handleReset"
          >
            <RotateCw :size="14" />
            重置
          </button>
        </div>

        <div ref="outputRef" class="panel-body flex-1 p-5 overflow-y-auto">
          <!-- Empty state -->
          <div v-if="!creativeStore.pipelineOutput && !creativeStore.pipelineRunning && !creativeStore.pipelineError" class="empty-state">
            <Sparkles :size="48" class="text-gray-300" />
            <h3 class="text-lg font-semibold text-gray-700 mt-4">等待生成创意文案</h3>
            <p class="text-sm text-gray-400 mt-1 max-w-sm text-center">
              配置左侧参数后点击"AI 生成创意文案"，将为您生成 4 套营销方案
            </p>
          </div>

          <!-- Content area -->
          <div v-else class="output-content">
            <!-- Error -->
            <div v-if="creativeStore.pipelineError" class="error-banner">
              <span class="text-sm">{{ creativeStore.pipelineError }}</span>
            </div>

            <!-- Streaming / completed text -->
            <div v-if="creativeStore.pipelineOutput" class="output-text whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {{ creativeStore.pipelineOutput }}
              <span v-if="creativeStore.pipelineRunning" class="typing-cursor">▌</span>
            </div>

            <!-- Plan selection cards (after copy generation completes) -->
            <div v-if="hasParsedPlans && !creativeStore.pipelineVideoStarted" class="plans-section mt-6">
              <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Video :size="14" class="text-purple-500" />
                选择一个方案启动视频制作
              </h4>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="(plan, idx) in parsedPlans"
                  :key="idx"
                  class="plan-card"
                  :class="{ 'selected-plan': selectedPlanIndex === idx }"
                  @click="handleSelectPlan(idx)"
                >
                  <div class="plan-number">方案 {{ idx + 1 }}</div>
                  <div class="plan-preview">{{ plan.slice(0, 120) }}{{ plan.length > 120 ? '...' : '' }}</div>
                </button>
              </div>
            </div>

            <!-- Video done banner -->
            <div v-if="creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning && !creativeStore.pipelineError" class="video-done-banner mt-4">
              <Check :size="16" />
              <span>视频制作流程已完成</span>
            </div>

            <!-- Video render tracking panel -->
            <div v-if="creativeStore.videoTaskId || creativeStore.videoPolling" class="render-panel mt-4 p-4 rounded-xl border border-purple-200 bg-purple-50/50">
              <div class="flex items-center gap-2 mb-3">
                <Film :size="18" class="text-purple-500" />
                <span class="font-semibold text-sm text-purple-700">视频渲染状态</span>
                <span v-if="creativeStore.videoPolling" class="ml-auto text-xs text-purple-400 animate-pulse">轮询中...</span>
              </div>

              <div v-if="creativeStore.videoRenderStatus" class="render-status">
                <div class="flex items-center gap-2 mb-2">
                  <span class="status-dot" :class="renderDotClass" />
                  <span class="text-sm font-medium">{{ renderStatusLabel }}</span>
                </div>

                <!-- Progress bar -->
                <div v-if="creativeStore.videoRenderStatus.progress != null" class="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div class="bg-purple-500 h-2 rounded-full transition-all duration-500" :style="{ width: `${creativeStore.videoRenderStatus.progress}%` }" />
                </div>

                <!-- Download link -->
                <div v-if="creativeStore.videoRenderStatus.video_url" class="mt-3">
                  <a
                    :href="creativeStore.videoRenderStatus.video_url"
                    target="_blank"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                  >
                    <Download :size="16" />
                    下载成片
                  </a>
                </div>

                <!-- Error -->
                <div v-if="creativeStore.videoRenderStatus.error" class="mt-2 text-sm text-red-500">
                  {{ creativeStore.videoRenderStatus.error }}
                </div>
              </div>

              <!-- Manual task_id input -->
              <div v-if="!creativeStore.videoPolling && !creativeStore.videoRenderStatus?.video_url" class="mt-3 flex gap-2">
                <input
                  v-model="manualTaskId"
                  class="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-300"
                  placeholder="输入 task_id 手动查询..."
                />
                <button
                  class="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition"
                  :disabled="!manualTaskId.trim()"
                  @click="handleManualTrack"
                >
                  查询
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Script Editor (edit selected plan before video) -->
    <div v-if="editingScript" class="editor-panel glass-morphism flex flex-col rounded-2xl overflow-hidden">
      <div class="panel-header">
        <Pencil :size="16" class="text-purple-500" />
        <span class="font-semibold">编辑文案</span>
        <div class="flex items-center gap-2 ml-auto">
          <el-button size="small" @click="handleCancelEdit">
            <X :size="16" class="mr-1" />取消
          </el-button>
          <el-button type="primary" size="small" @click="handleSaveEdit">
            <Check :size="16" class="mr-1" />保存
          </el-button>
        </div>
      </div>
      <div class="panel-body p-4">
        <ScriptEditor v-model="editingTtsText" placeholder="编辑文案内容..." />
      </div>
    </div>

    <!-- Bottom action bar (visible when plans are available or video done) -->
    <div v-if="hasParsedPlans || creativeStore.pipelineVideoStarted" class="action-bar flex items-center justify-between p-4 rounded-2xl">
      <div class="action-info">
        <span v-if="selectedPlanIndex !== null && !creativeStore.pipelineVideoStarted" class="selected-info flex items-center gap-2 text-sm font-medium text-emerald-600">
          <Check :size="16" />
          已选择方案 {{ selectedPlanIndex + 1 }}
          <button class="text-purple-500 hover:text-purple-700 underline text-xs ml-2" @click="handleEditPlan">
            编辑文案
          </button>
        </span>
        <span v-else-if="creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning" class="selected-info flex items-center gap-2 text-sm font-medium text-emerald-600">
          <Check :size="16" />
          视频制作完成
        </span>
        <span v-else class="text-sm text-gray-500">在上方选择一个方案以启动视频制作</span>
      </div>
      <el-button
        v-if="creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning"
        type="primary" size="large"
        class="next-btn" @click="goToConfig"
      >
        下一步: 音画配置
        <ArrowRight :size="16" class="ml-2" />
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* ── Card base ────────────────────────────────────── */
.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.config-panel:hover, .output-panel:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-md);
}

/* ── Panel header ─────────────────────────────────── */
.panel-header {
  @apply flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700;
  background: linear-gradient(135deg, #FAFAFF 0%, #F8F7F4 100%);
}

/* ── Status pill ──────────────────────────────────── */
.status-pill {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold;
  transition: all 0.2s ease;
}
.status-pill.is-idle {
  @apply bg-gray-100 text-gray-500;
}
.status-pill.is-running {
  @apply bg-purple-100 text-purple-600;
}
.status-pill.is-done {
  @apply bg-emerald-100 text-emerald-600;
}
.status-pill.is-video {
  @apply bg-blue-100 text-blue-600;
}
.status-pill.is-error {
  @apply bg-red-100 text-red-500;
}

/* ── Abort / Reset buttons in header ──────────────── */
.abort-btn {
  @apply flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer;
}
.reset-btn {
  @apply flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer;
}

/* ── Empty state ──────────────────────────────────── */
.empty-state {
  @apply flex flex-col items-center justify-center h-full text-center;
}

/* ── Output text ──────────────────────────────────── */
.output-text {
  font-family: 'Inter', 'PingFang SC', system-ui, sans-serif;
}

.typing-cursor {
  @apply text-purple-500;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.error-banner {
  @apply p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 mb-4;
}

/* ── Plan cards ───────────────────────────────────── */
.plan-card {
  @apply text-left p-3 rounded-xl border border-gray-200 cursor-pointer transition-all;
  background: var(--bg-surface);
}
.plan-card:hover {
  @apply border-purple-300;
  box-shadow: var(--shadow-md);
}
.plan-card.selected-plan {
  @apply border-purple-500 bg-purple-50;
  box-shadow: var(--shadow-focus);
}
.plan-number {
  @apply text-xs font-bold text-purple-600 mb-1;
}
.plan-preview {
  @apply text-xs text-gray-600 leading-relaxed line-clamp-3;
}

.video-done-banner {
  @apply flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium;
}

/* ── Render panel ─────────────────────────────────── */
.render-panel {
  animation: fadeIn 0.3s ease;
}
.status-dot {
  @apply w-2.5 h-2.5 rounded-full;
}
.dot-success { @apply bg-emerald-500; }
.dot-error { @apply bg-red-500; }
.dot-processing { @apply bg-amber-500 animate-pulse; }
.dot-pending { @apply bg-gray-400; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Action bar ───────────────────────────────────── */
.action-bar {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.next-btn {
  @apply font-bold rounded-lg px-8 py-5 text-white relative overflow-hidden border-0;
  background: var(--brand-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}
.next-btn:hover:not(.is-disabled) {
  background: var(--brand-primary-dark);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.next-btn.is-disabled {
  @apply bg-gray-200 text-gray-400;
  box-shadow: none;
  opacity: 1;
}

/* ── Editor panel ─────────────────────────────────── */
.editor-panel {
  @apply border border-purple-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.editor-panel .panel-header {
  @apply flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-gray-800;
}
</style>
