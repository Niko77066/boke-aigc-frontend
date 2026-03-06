<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import TaskConfigForm from '@/components/creative/TaskConfigForm.vue'
import CreativeOutput from '@/components/creative/CreativeOutput.vue'
import ScriptEditor from '@/components/creative/ScriptEditor.vue'
import { VOICE_OPTIONS, SUBTITLE_OPTIONS } from '@/api/pipeline'
import type { TaskConfig } from '@/types'
import { ElMessage } from 'element-plus'
import {
  Settings, FileText, Check, ArrowRight, Pencil, X,
  Zap, Send, Loader2, StopCircle, Video, RotateCw,
  Mic, Type, Sparkles, Film, Download,
} from 'lucide-vue-next'

const router = useRouter()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

// ── Mode toggle ──────────────────────────────────────────────────
const activeMode = ref<'mock' | 'pipeline'>('pipeline')

// ── Existing mock mode state ─────────────────────────────────────
const canProceed = computed(() => creativeStore.selectedScript !== null)
const editingScript = ref(false)
const editingTtsText = ref('')

async function handleSubmit(config: TaskConfig) {
  creativeStore.updateTaskConfig(config)
  try {
    await creativeStore.generateScripts()
    ElMessage.success('文案生成完成！请选择一个方案')
  } catch {
    ElMessage.error('文案生成失败，请重试')
  }
}

function handleConfigChange(config: Partial<TaskConfig>) {
  creativeStore.updateTaskConfig(config)
}

function handleSelectScript(scriptId: string) {
  creativeStore.selectScript(scriptId)
}

function handleEditScript() {
  if (!creativeStore.selectedScript) return
  editingTtsText.value = creativeStore.selectedScript.tts_text
  editingScript.value = true
}

function handleSaveEdit() {
  if (!creativeStore.selectedScript) return
  creativeStore.updateScript({
    ...creativeStore.selectedScript,
    tts_text: editingTtsText.value,
  })
  editingScript.value = false
  ElMessage.success('文案已更新')
}

function handleCancelEdit() {
  editingScript.value = false
}

function goToConfig() {
  if (!canProceed.value) {
    ElMessage.warning('请先选择一个创意方案')
    return
  }
  workflowStore.updateWorkflowData({ selectedScript: creativeStore.selectedScript! })
  workflowStore.nextStep()
  router.push('/config')
}

// ── Pipeline mode state ──────────────────────────────────────────
const pipelineInput = ref('')
const outputRef = ref<HTMLDivElement | null>(null)
const selectedPlanIndex = ref<number | null>(null)
const manualTaskId = ref('')

const parsedPlans = computed(() => {
  if (creativeStore.pipelineRunning || !creativeStore.pipelineOutput) return []
  if (creativeStore.pipelineMode !== '文案') return []
  // Try to parse numbered plans from output (方案一/方案1/1./①)
  const text = creativeStore.pipelineOutput
  const planRegex = /(?:方案[一二三四五六七八九十\d]|[①②③④⑤]|(?:^|\n)\s*\d+[.、）)])/gm
  const matches = [...text.matchAll(planRegex)]
  if (matches.length < 2) return [] // Not enough plan markers
  const plans: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i]!.index!
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : text.length
    plans.push(text.slice(start, end).trim())
  }
  return plans
})

const hasParsedPlans = computed(() => parsedPlans.value.length >= 2)

async function handlePipelineSend() {
  const msg = pipelineInput.value.trim()
  if (!msg || creativeStore.pipelineRunning) return
  pipelineInput.value = ''
  selectedPlanIndex.value = null
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

async function handleFollowUp() {
  const msg = pipelineInput.value.trim()
  if (!msg || creativeStore.pipelineRunning) return
  pipelineInput.value = ''
  await creativeStore.sendFollowUp(msg)
  scrollOutput()
}

function handleAbort() {
  creativeStore.abortPipeline()
}

function handleResetPipeline() {
  creativeStore.resetPipeline()
  selectedPlanIndex.value = null
  pipelineInput.value = ''
}

function scrollOutput() {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

const statusCardClass = computed(() => {
  if (creativeStore.pipelineRunning) return 'is-running'
  if (creativeStore.pipelineError) return 'is-error'
  if (creativeStore.pipelineChatId) return 'is-done'
  return 'is-idle'
})

const statusLabel = computed(() => {
  if (creativeStore.pipelineRunning) return '正在生成...'
  if (creativeStore.pipelineError) return '发生错误'
  if (creativeStore.pipelineVideoStarted) return '视频制作完成'
  if (creativeStore.pipelineChatId) return '文案生成完成'
  return '等待输入'
})

function handlePipelineKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (creativeStore.pipelineChatId && !hasParsedPlans.value) {
      handleFollowUp()
    } else {
      handlePipelineSend()
    }
  }
}

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
  if (st.status === 'success') return '渲染完成 ✅'
  if (st.status === 'failed') return `渲染失败: ${st.error || '未知错误'}`
  if (st.status === 'processing') return `渲染中${st.progress != null ? ` ${st.progress}%` : '...'}`
  return `状态: ${st.status}`
})

function handleManualTrack() {
  const tid = manualTaskId.value.trim()
  if (tid) {
    creativeStore.trackVideoTask(tid)
    manualTaskId.value = ''
  }
}
</script>

<template>
  <div class="creative-console flex flex-col h-full p-6 gap-6">
    <!-- Page header with mode toggle -->
    <div class="page-header flex items-start justify-between">
      <div>
        <h1 class="page-title text-2xl font-bold text-gray-900">创意控制台</h1>
        <p class="page-desc text-sm text-gray-500 mt-1">
          配置营销目标与卖点，AI 为您生成多套创意文案方案
        </p>
      </div>
      <div class="mode-toggle flex bg-gray-100 rounded-lg p-1">
        <button
          class="toggle-btn"
          :class="{ 'active-toggle': activeMode === 'pipeline' }"
          @click="activeMode = 'pipeline'"
        >
          <Zap :size="14" />
          <span>Pipeline 模式</span>
        </button>
        <button
          class="toggle-btn"
          :class="{ 'active-toggle': activeMode === 'mock' }"
          @click="activeMode = 'mock'"
        >
          <Settings :size="14" />
          <span>表单模式</span>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- MOCK MODE (existing) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <template v-if="activeMode === 'mock'">
      <div class="console-layout grid grid-cols-10 gap-6 flex-1 min-h-0">
        <div class="config-panel glass-morphism col-span-3 flex flex-col rounded-2xl overflow-hidden">
          <div class="panel-header">
            <Settings :size="16" class="text-purple-500" />
            <span class="font-semibold">任务配置</span>
          </div>
          <div class="panel-body flex-1 p-4 overflow-y-auto">
            <TaskConfigForm
              :config="creativeStore.taskConfig ?? undefined"
              @submit="handleSubmit"
              @change="handleConfigChange"
            />
          </div>
        </div>

        <div class="output-panel glass-morphism col-span-7 flex flex-col rounded-2xl overflow-hidden">
          <div class="panel-header">
            <FileText :size="16" class="text-purple-500" />
            <span class="font-semibold">创意输出</span>
          </div>
          <div class="panel-body flex-1 p-4 overflow-y-auto">
            <CreativeOutput
              :scripts="creativeStore.scripts"
              :selected-id="creativeStore.selectedScript?.id ?? null"
              :loading="creativeStore.generating"
              :progress="creativeStore.generationProgress"
              @select="handleSelectScript"
              @edit="handleEditScript"
            />
          </div>
        </div>
      </div>

      <!-- Script Editor Panel -->
      <div v-if="editingScript" class="editor-panel glass-morphism flex flex-col rounded-2xl overflow-hidden">
        <div class="panel-header">
          <Pencil :size="16" class="text-purple-500" />
          <span class="font-semibold">编辑文案 — {{ creativeStore.selectedScript?.title }}</span>
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
          <ScriptEditor v-model="editingTtsText" placeholder="编辑 TTS 播报文案..." />
        </div>
      </div>

      <!-- Bottom action bar -->
      <div class="action-bar flex items-center justify-between p-4 rounded-2xl">
        <div class="action-info">
          <span v-if="creativeStore.selectedScript" class="selected-info flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Check :size="16" />
            已选择方案: {{ creativeStore.selectedScript.title }}
          </span>
          <span v-else class="text-sm text-gray-500">请在右侧选择一个创意方案以继续</span>
        </div>
        <el-button
          type="primary" size="large" :disabled="!canProceed"
          class="next-btn" @click="goToConfig"
        >
          下一步: 音画配置
          <ArrowRight :size="16" class="ml-2" />
        </el-button>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- PIPELINE MODE -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <template v-if="activeMode === 'pipeline'">
      <div class="pipeline-layout grid grid-cols-10 gap-6 flex-1 min-h-0">

        <!-- Left sidebar: voice/subtitle config + status -->
        <div class="pipeline-config glass-morphism col-span-3 flex flex-col rounded-2xl overflow-hidden">
          <div class="panel-header">
            <Sparkles :size="16" class="text-purple-500" />
            <span class="font-semibold">Pipeline 配置</span>
          </div>
          <div class="panel-body flex-1 p-4 flex flex-col gap-5">
            <!-- Voice selector -->
            <div class="config-field">
              <label class="field-label">
                <Mic :size="14" class="text-purple-400" />
                配音语音
              </label>
              <el-select v-model="creativeStore.pipelineVoice" class="w-full" :disabled="creativeStore.pipelineRunning">
                <el-option
                  v-for="v in VOICE_OPTIONS"
                  :key="v.value"
                  :label="v.label"
                  :value="v.value"
                />
              </el-select>
            </div>

            <!-- Subtitle selector -->
            <div class="config-field">
              <label class="field-label">
                <Type :size="14" class="text-purple-400" />
                字幕样式
              </label>
              <el-select v-model="creativeStore.pipelineSubtitle" class="w-full" :disabled="creativeStore.pipelineRunning">
                <el-option
                  v-for="s in SUBTITLE_OPTIONS"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </el-select>
            </div>

            <!-- Status indicator -->
            <div class="pipeline-status mt-auto">
              <div class="status-card p-3 rounded-xl border" :class="statusCardClass">
                <div class="flex items-center gap-2 text-sm font-medium">
                  <Loader2 v-if="creativeStore.pipelineRunning" :size="14" class="animate-spin" />
                  <Zap v-else :size="14" />
                  <span>{{ statusLabel }}</span>
                </div>
                <div v-if="creativeStore.pipelineChatId" class="text-xs text-gray-400 mt-1 truncate">
                  会话: {{ creativeStore.pipelineChatId.slice(0, 12) }}…
                </div>
              </div>
              <button
                v-if="creativeStore.pipelineChatId"
                class="reset-btn mt-2"
                @click="handleResetPipeline"
              >
                <RotateCw :size="12" />
                重置对话
              </button>
            </div>
          </div>
        </div>

        <!-- Right: chat area -->
        <div class="pipeline-chat glass-morphism col-span-7 flex flex-col rounded-2xl overflow-hidden">
          <div class="panel-header">
            <Zap :size="16" class="text-purple-500" />
            <span class="font-semibold">
              {{ creativeStore.pipelineVideoStarted ? 'AI 视频制作' : 'AI 文案生成' }}
            </span>
            <span v-if="creativeStore.pipelineRunning" class="ml-2 text-xs text-purple-500 font-normal flex items-center gap-1">
              <Loader2 :size="12" class="animate-spin" />
              生成中...
            </span>
          </div>

          <!-- Output area -->
          <div ref="outputRef" class="chat-output flex-1 p-5 overflow-y-auto">
            <!-- Empty state -->
            <div v-if="!creativeStore.pipelineOutput && !creativeStore.pipelineRunning && !creativeStore.pipelineError" class="empty-state">
              <div class="empty-icon">
                <Sparkles :size="48" class="text-gray-300" />
              </div>
              <h3 class="text-lg font-semibold text-gray-700 mt-4">开始创作</h3>
              <p class="text-sm text-gray-400 mt-1 max-w-sm text-center">
                输入您的营销需求，AI 将为您生成 4 套创意文案方案。选择方案后自动启动视频制作。
              </p>
            </div>

            <!-- Streaming / completed output -->
            <div v-else class="output-content">
              <!-- Error display -->
              <div v-if="creativeStore.pipelineError" class="error-banner">
                <span class="text-sm">{{ creativeStore.pipelineError }}</span>
              </div>

              <!-- Output text (markdown-like) -->
              <div v-if="creativeStore.pipelineOutput" class="output-text whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {{ creativeStore.pipelineOutput }}
                <span v-if="creativeStore.pipelineRunning" class="typing-cursor">▌</span>
              </div>

              <!-- Parsed plans selection -->
              <div v-if="hasParsedPlans && !creativeStore.pipelineVideoStarted" class="plans-grid mt-6">
                <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Video :size="14" />
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
                    <div class="plan-preview">{{ plan.slice(0, 100) }}{{ plan.length > 100 ? '...' : '' }}</div>
                  </button>
                </div>
              </div>

              <!-- Video mode indicator -->
              <div v-if="creativeStore.pipelineVideoStarted && !creativeStore.pipelineRunning && !creativeStore.pipelineError" class="video-done-banner mt-4">
                <Check :size="16" />
                <span>视频制作流程已完成，请查看上方输出了解详情</span>
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

          <!-- Input area -->
          <div class="chat-input-area p-4 border-t border-gray-100">
            <div class="input-row flex items-end gap-3">
              <textarea
                v-model="pipelineInput"
                class="chat-textarea"
                :placeholder="creativeStore.pipelineVideoStarted ? '发送追加指令...' : '描述您的营销需求，例如：为波克捕鱼制作一条面向年轻用户的短视频广告...'"
                rows="2"
                :disabled="creativeStore.pipelineRunning"
                @keydown="handlePipelineKeydown"
              />
              <button
                v-if="creativeStore.pipelineRunning"
                class="send-btn stop-btn"
                @click="handleAbort"
              >
                <StopCircle :size="20" />
              </button>
              <button
                v-else
                class="send-btn"
                :disabled="!pipelineInput.trim()"
                @click="creativeStore.pipelineChatId && !hasParsedPlans ? handleFollowUp() : handlePipelineSend()"
              >
                <Send :size="20" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
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

.config-panel:hover, .output-panel:hover,
.pipeline-config:hover, .pipeline-chat:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-md);
}

/* ── Panel header ─────────────────────────────────── */
.panel-header {
  @apply flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-gray-700;
  background: linear-gradient(135deg, #FAFAFF 0%, #F8F7F4 100%);
}

/* ── Mode toggle ──────────────────────────────────── */
.toggle-btn {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-500 cursor-pointer;
  transition: all 0.2s ease;
}
.toggle-btn:hover {
  @apply text-gray-700;
}
.active-toggle {
  @apply bg-white text-purple-600 shadow-sm;
}

/* ── Action bar (mock mode) ───────────────────────── */
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

/* ── Editor panel (mock mode) ─────────────────────── */
.editor-panel {
  @apply border border-purple-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.editor-panel .panel-header {
  @apply flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-gray-800;
}

/* ── Pipeline config fields ───────────────────────── */
.config-field {
  @apply flex flex-col gap-1.5;
}
.field-label {
  @apply flex items-center gap-1.5 text-xs font-semibold text-gray-600;
}

/* ── Pipeline status card ─────────────────────────── */
.status-card {
  background: var(--bg-muted);
  border-color: var(--border-color);
}
.status-card.is-running {
  @apply border-purple-200 bg-purple-50;
  color: var(--brand-primary);
}
.status-card.is-done {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600;
}
.status-card.is-error {
  @apply border-red-200 bg-red-50 text-red-500;
}
.status-card.is-idle {
  @apply text-gray-500;
}

.reset-btn {
  @apply flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 cursor-pointer transition-colors w-full justify-center py-1;
}

/* ── Chat output ──────────────────────────────────── */
.chat-output {
  -ms-overflow-style: none;
  scrollbar-width: thin;
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

/* ── Chat input ───────────────────────────────────── */
.chat-textarea {
  @apply flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition-all;
  background: var(--bg-surface);
}
.chat-textarea:focus {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-focus);
}
.chat-textarea::placeholder {
  @apply text-gray-400;
}
.chat-textarea:disabled {
  @apply bg-gray-50 text-gray-400 cursor-not-allowed;
}

.send-btn {
  @apply flex items-center justify-center w-11 h-11 rounded-xl text-white transition-all;
  background: var(--brand-primary);
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) {
  background: var(--brand-primary-dark);
  transform: translateY(-1px);
}
.send-btn:disabled {
  @apply bg-gray-200 text-gray-400 cursor-not-allowed;
}
.send-btn.stop-btn {
  @apply bg-red-500;
}
.send-btn.stop-btn:hover {
  @apply bg-red-600;
}
</style>
