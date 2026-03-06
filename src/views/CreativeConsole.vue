<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useCreativeStore } from '@/stores/creative'
import { VOICE_OPTIONS, SUBTITLE_OPTIONS } from '@/api/pipeline'
import { ElMessage } from 'element-plus'
import {
  FileText, Pencil, X, Check,
  Play, Loader2, Square, Send, Mic, Type, Clapperboard,
  ArrowRight, RotateCw, Sparkles,
} from 'lucide-vue-next'

const creativeStore = useCreativeStore()

// UI state
const userInput = ref('')
const outputRef = ref<HTMLDivElement | null>(null)

const isRunning = computed(() => creativeStore.pipelineRunning)
const hasOutput = computed(() => creativeStore.pipelineOutput.length > 0)

// 当前处于哪个阶段
const currentPhase = computed(() => {
  if (creativeStore.pipelineMode === '视频') return 'video'
  if (hasOutput.value && !isRunning.value) return 'select' // 文案已生成，等用户选择
  return 'copyInput' // 输入文案需求
})

// Auto-scroll on output change
watch(() => creativeStore.pipelineOutput, () => {
  scrollToBottom()
})

/** Step 1: 启动文案生成 */
async function handleGenerateCopy() {
  const msg = userInput.value.trim()
  if (!msg) {
    ElMessage.warning('请输入文案需求描述')
    return
  }
  userInput.value = ''
  await creativeStore.generateCopy(msg)
}

/** Step 2: 选中文案 → 自动启动视频制作 */
async function handleSelectAndMakeVideo(copyText: string) {
  creativeStore.pipelineScript = copyText
  creativeStore.pipelineMode = '视频'
  // 重置 chatId 开启新对话
  creativeStore.pipelineChatId = null
  creativeStore.pipelineOutput = ''
  creativeStore.pipelineToolCalls = []
  await creativeStore.generateVideo(copyText)
}

/** 追加消息（多轮对话） */
async function handleSendFollowUp() {
  const msg = userInput.value.trim()
  if (!msg) return
  userInput.value = ''
  await creativeStore.sendFollowUp(msg)
}

/** 主操作 */
async function handleMainAction() {
  if (isRunning.value) return

  if (currentPhase.value === 'video' && creativeStore.pipelineChatId && hasOutput.value) {
    // 视频阶段多轮追加
    await handleSendFollowUp()
  } else if (currentPhase.value === 'copyInput' || currentPhase.value === 'select') {
    // 文案阶段：追加或新生成
    if (creativeStore.pipelineChatId && hasOutput.value) {
      await handleSendFollowUp()
    } else {
      await handleGenerateCopy()
    }
  }
}

/** 重新生成文案 */
function handleRegenerate() {
  creativeStore.resetPipeline()
  creativeStore.pipelineMode = '文案'
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleMainAction()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

/**
 * 从 AI 输出中提取方案文案块
 * FastGPT 文案节点产出格式: **方案一/二/三/四：【xxx型】**
 */
const extractedPlans = computed(() => {
  const text = creativeStore.pipelineOutput
  if (!text || creativeStore.pipelineMode !== '文案' || isRunning.value) return []

  const plans: Array<{ title: string; content: string }> = []
  // 按 "**方案" 分割
  const regex = /\*\*方案[一二三四]：(.+?)\*\*/g
  let match: RegExpExecArray | null
  const positions: Array<{ title: string; start: number }> = []

  while ((match = regex.exec(text)) !== null) {
    positions.push({ title: match[0].replace(/\*\*/g, ''), start: match.index })
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start
    const end = i < positions.length - 1 ? positions[i + 1].start : text.length
    const content = text.slice(start, end).trim()
    plans.push({ title: positions[i].title, content })
  }

  return plans
})
</script>

<template>
  <div class="creative-console flex flex-col h-full">
    <!-- Header -->
    <div class="console-header px-6 pt-5 pb-2">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">创意控制台</h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ currentPhase === 'video' ? '🎬 视频制作中 — AI 自动配音 + 素材匹配 + 剪映剪辑' :
               currentPhase === 'select' ? '📋 文案已生成 — 选择一套方案启动视频制作' :
               '✍️ Step 1: 输入需求，AI 生成 4 套买量文案方案' }}
          </p>
        </div>
        <!-- Phase indicator -->
        <div class="phase-indicator flex items-center gap-2">
          <div class="phase-dot" :class="{ 'phase-active': currentPhase !== 'video', 'phase-done': currentPhase === 'video' }">
            <Pencil :size="12" />
          </div>
          <div class="phase-line" :class="{ 'phase-line-active': currentPhase === 'video' }"></div>
          <div class="phase-dot" :class="{ 'phase-active': currentPhase === 'video' }">
            <Clapperboard :size="12" />
          </div>
        </div>
      </div>
    </div>

    <!-- Config Bar -->
    <div class="config-bar px-6 py-2 flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <Mic :size="14" class="text-gray-400" />
        <el-select v-model="creativeStore.pipelineVoice" size="small" style="width: 130px">
          <el-option v-for="v in VOICE_OPTIONS" :key="v" :label="v" :value="v" />
        </el-select>
      </div>
      <div class="flex items-center gap-2">
        <Type :size="14" class="text-gray-400" />
        <el-select v-model="creativeStore.pipelineSubtitle" size="small" style="width: 120px">
          <el-option v-for="s in SUBTITLE_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
      </div>

      <!-- Tool calls -->
      <div v-if="creativeStore.pipelineToolCalls.length > 0" class="ml-auto flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
        <Sparkles :size="12" />
        <span>{{ creativeStore.pipelineToolCalls.length }} 工具调用</span>
      </div>

      <!-- Regenerate button (visible in select phase) -->
      <button
        v-if="currentPhase === 'select'"
        class="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
        @click="handleRegenerate"
      >
        <RotateCw :size="12" />
        <span>重新生成</span>
      </button>
    </div>

    <!-- Main Output -->
    <div class="output-area flex-1 mx-6 mb-3 rounded-xl overflow-hidden border border-gray-200 bg-white">
      <div ref="outputRef" class="output-scroll h-full overflow-y-auto p-5">
        <!-- Empty state -->
        <div v-if="!hasOutput && !isRunning" class="empty-state flex flex-col items-center justify-center h-full text-center">
          <div class="empty-icon w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <Pencil :size="28" class="text-purple-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-700">输入需求，AI 生成买量文案</h3>
          <p class="text-sm text-gray-400 mt-2 max-w-md">
            描述目标人群、卖点或创意方向，AI 将产出 4 套不同策略的投放文案方案。<br />
            选中方案后自动进入视频制作环节。
          </p>
        </div>

        <!-- AI Output -->
        <div v-else>
          <!-- Raw output text -->
          <div class="ai-output whitespace-pre-wrap text-gray-800 leading-relaxed text-sm" v-text="creativeStore.pipelineOutput"></div>

          <!-- Loading indicator -->
          <div v-if="isRunning" class="typing-indicator mt-4 flex items-center gap-2 text-purple-500">
            <Loader2 :size="16" class="animate-spin" />
            <span class="text-sm">
              {{ creativeStore.pipelineMode === '文案' ? 'AI 正在生成文案方案...' : 'AI 正在制作视频（TTS → 素材匹配 → 剪辑）...' }}
            </span>
          </div>

          <!-- Plan selection cards (visible when copy is done) -->
          <div v-if="currentPhase === 'select' && extractedPlans.length > 0" class="plan-cards mt-6 grid grid-cols-2 gap-3">
            <div
              v-for="(plan, idx) in extractedPlans"
              :key="idx"
              class="plan-card p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
              @click="handleSelectAndMakeVideo(plan.content)"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-purple-600">{{ plan.title }}</span>
                <ArrowRight :size="14" class="text-gray-300" />
              </div>
              <p class="text-xs text-gray-500 line-clamp-3">{{ plan.content.slice(0, 150) }}...</p>
              <div class="mt-3 flex items-center gap-1 text-xs text-purple-500 font-medium">
                <Play :size="12" />
                <span>选择并制作视频</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Bar -->
    <div class="input-bar mx-6 mb-5">
      <div class="input-wrapper flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:border-purple-400 focus-within:shadow-md transition-all">
        <textarea
          v-model="userInput"
          class="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 resize-none px-2"
          rows="1"
          :placeholder="currentPhase === 'video'
            ? '追加指令（如：换一种更激昂的配音风格）...'
            : currentPhase === 'select'
              ? '追加要求或直接点击上方卡片选择方案...'
              : '描述文案需求（如：针对30-50岁男性，强调爆金爽感和福利白嫖）...'"
          @keydown="handleKeydown"
        ></textarea>

        <el-button
          v-if="isRunning"
          type="danger"
          circle
          size="small"
          title="中止"
          @click="creativeStore.abortPipeline()"
        >
          <Square :size="14" />
        </el-button>
        <el-button
          v-else
          type="primary"
          circle
          size="small"
          :disabled="!userInput.trim()"
          @click="handleMainAction"
        >
          <Send :size="14" />
        </el-button>
      </div>

      <div v-if="creativeStore.error" class="mt-2 text-xs text-red-500 flex items-center gap-1">
        <X :size="12" />
        {{ creativeStore.error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* Phase indicator */
.phase-dot {
  @apply w-7 h-7 rounded-full flex items-center justify-center border-2 border-gray-200 text-gray-400;
  transition: all 0.3s ease;
}
.phase-dot.phase-active {
  @apply border-purple-500 text-purple-500 bg-purple-50;
}
.phase-dot.phase-done {
  @apply border-green-500 text-white bg-green-500;
}
.phase-line {
  @apply w-8 h-0.5 bg-gray-200 rounded;
  transition: background 0.3s ease;
}
.phase-line.phase-line-active {
  @apply bg-purple-500;
}

/* Output */
.output-area {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.empty-state {
  min-height: 280px;
}

.ai-output {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.typing-indicator {
  animation: fade-pulse 1.5s ease-in-out infinite;
}

@keyframes fade-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Plan cards */
.plan-card {
  background: linear-gradient(135deg, #FAFAFF 0%, #FFFFFF 100%);
}
.plan-card:hover {
  background: linear-gradient(135deg, #F3F0FF 0%, #FFFFFF 100%);
}

/* Input */
.input-wrapper {
  min-height: 44px;
}
.input-wrapper textarea {
  max-height: 120px;
  line-height: 1.5;
}

/* Element Plus */
:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}
:deep(.el-button.is-circle) {
  width: 32px;
  height: 32px;
}
</style>
