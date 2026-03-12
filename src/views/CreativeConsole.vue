<script setup lang="ts">
import { computed, ref, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import TaskConfigForm from '@/components/creative/TaskConfigForm.vue'
import ScriptEditor from '@/components/creative/ScriptEditor.vue'
import type { TaskConfig } from '@/types'
import { ElMessage } from 'element-plus'
import {
  Settings, FileText, Check, Pencil, X,
  Loader2, Video, Sparkles, StopCircle, RotateCw, ArrowRight,
} from 'lucide-vue-next'

const router = useRouter()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

// ── State ────────────────────────────────────────────────────────
const outputRef = ref<HTMLDivElement | null>(null)
const selectedPlanIndex = ref<number | null>(null)
const editingScript = ref(false)
const editingTtsText = ref('')
const redirectingToResult = ref(false)

function redirectToResult() {
  if (redirectingToResult.value) return
  redirectingToResult.value = true

  workflowStore.nextStep()
  router.push({
    path: '/result',
    query: {
      taskIds: creativeStore.videoTaskIds.join(',') || undefined,
      draftIds: creativeStore.videoDraftIds.join(',') || undefined,
      draftId: creativeStore.videoDraftId || undefined,
    },
  })
}

// ── Auto-redirect callback ───────────────────────────────────────
onMounted(() => {
  creativeStore.onAllVideosDone(redirectToResult)
  creativeStore.resumePendingVideoPolling()
})

watch(
  () => [
    creativeStore.pipelineVideoStarted,
    creativeStore.pipelineRunning,
    creativeStore.pipelineError,
    creativeStore.videoTaskIds.length,
    creativeStore.videoPollingCount,
    creativeStore.videoAllDone,
  ],
  () => {
    if (!creativeStore.pipelineVideoStarted) {
      redirectingToResult.value = false
      return
    }

    const canRedirectWithoutTasks = !creativeStore.pipelineRunning && !creativeStore.pipelineError && creativeStore.videoTaskIds.length === 0
    const canRedirectWithTasks = !creativeStore.pipelineRunning && creativeStore.videoAllDone

    if (canRedirectWithoutTasks || canRedirectWithTasks) {
      redirectToResult()
    }
  },
)

// ── Step tracking ────────────────────────────────────────────────
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
  if (creativeStore.videoPollingCount > 0) return '视频渲染中...'
  if (creativeStore.pipelineRunning && creativeStore.pipelineMode === '视频') return '视频制作中...'
  if (creativeStore.pipelineRunning) return 'AI 文案生成中...'
  if (creativeStore.pipelineError) return '发生错误'
  if (creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning) return '视频流程完成，等待渲染...'
  if (hasParsedPlans.value) return '请选择一个方案'
  if (creativeStore.pipelineOutput) return '文案生成完成'
  return '等待生成'
})

// ── Actions ──────────────────────────────────────────────────────

function handleConfigChange(config: Partial<TaskConfig>) {
  creativeStore.updateTaskConfig(config)
}

async function handleSubmit(config: TaskConfig) {
  creativeStore.updateTaskConfig(config)
  selectedPlanIndex.value = null

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
  redirectingToResult.value = false
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
          按新版工作流先生成 4 套文案方案，再通过按钮卡片直接推进视频制作
        </p>
      </div>
      <div class="status-pill" :class="statusCardClass">
        <Loader2 v-if="creativeStore.pipelineRunning || creativeStore.videoPollingCount > 0" :size="14" class="animate-spin" />
        <Sparkles v-else :size="14" />
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Main layout: left config + right output -->
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
          <button
            v-if="creativeStore.pipelineRunning"
            class="ml-auto abort-btn"
            @click="handleAbort"
          >
            <StopCircle :size="14" />
            停止
          </button>
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
            <h3 class="text-lg font-semibold text-gray-700 mt-4">等待启动文案模式</h3>
            <p class="text-sm text-gray-400 mt-1 max-w-sm text-center">
              配置左侧参数后点击“生成 4 套营销文案”，再选择右侧方案按钮进入视频流程
            </p>
          </div>

          <!-- Content area -->
          <div v-else class="output-content">
            <div v-if="creativeStore.pipelineError" class="error-banner">
              <span class="text-sm">{{ creativeStore.pipelineError }}</span>
            </div>

            <div v-if="creativeStore.pipelineOutput" class="output-text whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {{ creativeStore.pipelineOutput }}
              <span v-if="creativeStore.pipelineRunning" class="typing-cursor">▌</span>
            </div>

            <!-- Plan selection cards -->
            <div v-if="hasParsedPlans && !creativeStore.pipelineVideoStarted" class="plans-section mt-6">
              <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Video :size="14" class="text-purple-500" />
                选择一个方案按钮，直接启动视频制作
              </h4>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="(plan, idx) in parsedPlans"
                  :key="idx"
                  class="plan-card"
                  :class="{ 'selected-plan': selectedPlanIndex === idx }"
                  @click="handleSelectPlan(idx)"
                >
                  <div class="plan-card__head">
                    <div class="plan-number">方案 {{ idx + 1 }}</div>
                    <div class="plan-cta">
                      <span>{{ selectedPlanIndex === idx ? '制作中' : '选这套做视频' }}</span>
                      <ArrowRight :size="14" />
                    </div>
                  </div>
                  <div class="plan-preview">{{ plan.slice(0, 120) }}{{ plan.length > 120 ? '...' : '' }}</div>
                </button>
              </div>
            </div>

            <!-- Video streaming done + waiting for render -->
            <div v-if="creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning && !creativeStore.pipelineError" class="video-done-banner mt-4">
              <template v-if="creativeStore.videoPollingCount > 0">
                <Loader2 :size="16" class="animate-spin" />
                <span>视频制作完成，正在等待渲染... 渲染完成后将自动跳转到成片交付</span>
              </template>
              <template v-else-if="creativeStore.videoTaskIds.length === 0">
                <Check :size="16" />
                <span>视频制作流程完成，等待提取渲染任务 ID...</span>
              </template>
              <template v-else>
                <Check :size="16" />
                <span>所有渲染完成，正在跳转...</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Script Editor overlay -->
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

    <!-- Bottom action bar -->
    <div v-if="hasParsedPlans && !creativeStore.pipelineVideoStarted" class="action-bar flex items-center justify-between p-4 rounded-2xl">
      <div class="action-info">
        <span v-if="selectedPlanIndex !== null" class="selected-info flex items-center gap-2 text-sm font-medium text-emerald-600">
          <Check :size="16" />
          已选择方案 {{ selectedPlanIndex + 1 }}
          <button class="action-link-btn ml-2" @click="handleEditPlan">
            <Pencil :size="13" />
            编辑当前文案
          </button>
        </span>
        <span v-else class="text-sm text-gray-500">在上方点击任一方案按钮，系统会把该方案作为 `copy` 变量送入视频模式</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.config-panel:hover, .output-panel:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-md);
}

.panel-header {
  @apply flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700;
  background: linear-gradient(135deg, #FAFAFF 0%, #F8F7F4 100%);
}

.status-pill {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold;
  transition: all 0.2s ease;
}
.status-pill.is-idle { @apply bg-gray-100 text-gray-500; }
.status-pill.is-running { @apply bg-purple-100 text-purple-600; }
.status-pill.is-done { @apply bg-emerald-100 text-emerald-600; }
.status-pill.is-video { @apply bg-blue-100 text-blue-600; }
.status-pill.is-error { @apply bg-red-100 text-red-500; }

.abort-btn {
  @apply flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer;
}
.reset-btn {
  @apply flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-full text-center;
}

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

.plan-card {
  @apply text-left p-3 rounded-xl border border-gray-200 cursor-pointer transition-all;
  background: var(--bg-surface);
}
.plan-card:hover {
  border-color: #F97316;
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.12);
}
.plan-card.selected-plan {
  border-color: #F97316;
  background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%);
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.16);
}
.plan-card__head {
  @apply flex items-center justify-between gap-3 mb-2;
}
.plan-number { @apply text-xs font-bold text-purple-600; }
.plan-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #FFF7ED;
  color: #C2410C;
  font-size: 11px;
  font-weight: 700;
}
.plan-card.selected-plan .plan-cta {
  background: linear-gradient(135deg, #F97316 0%, #FB7185 100%);
  color: #FFFFFF;
}
.plan-preview { @apply text-xs text-gray-600 leading-relaxed line-clamp-3; }

.video-done-banner {
  @apply flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium;
}

.action-bar {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #7C3AED;
  background: rgba(124, 58, 237, 0.08);
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-link-btn:hover {
  background: rgba(124, 58, 237, 0.14);
  color: #6D28D9;
}

.editor-panel {
  @apply border border-purple-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.editor-panel .panel-header {
  @apply flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-gray-800;
}
</style>
