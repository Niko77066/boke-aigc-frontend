<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useCreativeStore } from '@/stores/creative'
import { VOICE_OPTIONS, SUBTITLE_OPTIONS } from '@/api/pipeline'
import { ElMessage } from 'element-plus'
import {
  Settings, FileText, Pencil, X, Check,
  Play, Loader2, Square, Send, Mic, Type, Clapperboard,
} from 'lucide-vue-next'

const creativeStore = useCreativeStore()

// Pipeline UI state
const userInput = ref('')
const outputRef = ref<HTMLDivElement | null>(null)

const isRunning = computed(() => creativeStore.pipelineRunning)
const hasOutput = computed(() => creativeStore.pipelineOutput.length > 0)

/** 切换模式 */
function setMode(mode: '文案' | '视频') {
  creativeStore.pipelineMode = mode
}

/** 启动文案生成 */
async function handleGenerateCopy() {
  if (!userInput.value.trim()) {
    ElMessage.warning('请输入文案需求描述')
    return
  }
  await creativeStore.generateCopy(userInput.value.trim())
  scrollToBottom()
}

/** 启动视频制作 */
async function handleGenerateVideo() {
  if (!creativeStore.pipelineScript.trim()) {
    ElMessage.warning('请输入口播脚本')
    return
  }
  const extra = userInput.value.trim()
  await creativeStore.generateVideo(
    creativeStore.pipelineScript.trim(),
    extra || undefined,
  )
  scrollToBottom()
}

/** 发送追加消息 */
async function handleSendFollowUp() {
  if (!userInput.value.trim()) return
  const msg = userInput.value.trim()
  userInput.value = ''
  await creativeStore.sendFollowUp(msg)
  scrollToBottom()
}

/** 主操作按钮 */
async function handleMainAction() {
  if (creativeStore.pipelineChatId && hasOutput.value) {
    // 多轮对话
    await handleSendFollowUp()
  } else if (creativeStore.pipelineMode === '文案') {
    await handleGenerateCopy()
  } else {
    await handleGenerateVideo()
  }
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
</script>

<template>
  <div class="creative-console flex flex-col h-full">
    <!-- Header -->
    <div class="console-header px-6 pt-5 pb-3">
      <h1 class="text-2xl font-bold text-gray-900">创意控制台</h1>
      <p class="text-sm text-gray-500 mt-1">AI 自动化产线 — 文案生成 & 视频制作</p>
    </div>

    <!-- Mode Toggle + Config -->
    <div class="config-bar px-6 py-3 flex items-center gap-4 flex-wrap">
      <!-- Mode Switch -->
      <div class="mode-switch flex bg-gray-100 rounded-lg p-1">
        <button
          class="mode-btn"
          :class="{ 'mode-active': creativeStore.pipelineMode === '文案' }"
          @click="setMode('文案')"
        >
          <Pencil :size="14" />
          <span>文案生成</span>
        </button>
        <button
          class="mode-btn"
          :class="{ 'mode-active': creativeStore.pipelineMode === '视频' }"
          @click="setMode('视频')"
        >
          <Clapperboard :size="14" />
          <span>视频制作</span>
        </button>
      </div>

      <!-- Voice Select -->
      <div class="flex items-center gap-2">
        <Mic :size="14" class="text-gray-400" />
        <el-select
          v-model="creativeStore.pipelineVoice"
          size="small"
          style="width: 130px"
          placeholder="配音"
        >
          <el-option
            v-for="v in VOICE_OPTIONS"
            :key="v"
            :label="v"
            :value="v"
          />
        </el-select>
      </div>

      <!-- Subtitle Select -->
      <div class="flex items-center gap-2">
        <Type :size="14" class="text-gray-400" />
        <el-select
          v-model="creativeStore.pipelineSubtitle"
          size="small"
          style="width: 120px"
          placeholder="字幕"
        >
          <el-option
            v-for="s in SUBTITLE_OPTIONS"
            :key="s"
            :label="s"
            :value="s"
          />
        </el-select>
      </div>

      <!-- Tool calls badge -->
      <div v-if="creativeStore.pipelineToolCalls.length > 0" class="ml-auto flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
        <Settings :size="12" class="animate-spin" />
        <span>{{ creativeStore.pipelineToolCalls.length }} 个工具调用</span>
      </div>
    </div>

    <!-- Output Area -->
    <div class="output-area flex-1 mx-6 mb-3 rounded-xl overflow-hidden border border-gray-200 bg-white">
      <div ref="outputRef" class="output-scroll h-full overflow-y-auto p-5">
        <!-- Empty state -->
        <div v-if="!hasOutput && !isRunning" class="empty-state flex flex-col items-center justify-center h-full text-center">
          <div class="empty-icon w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <FileText :size="28" class="text-purple-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-700">
            {{ creativeStore.pipelineMode === '文案' ? '输入需求，AI 生成买量文案' : '输入口播脚本，AI 自动制作视频' }}
          </h3>
          <p class="text-sm text-gray-400 mt-2 max-w-md">
            {{ creativeStore.pipelineMode === '文案'
              ? '描述目标人群、参考素材或脑暴想法，AI 将产出 4 套不同策略的投放文案方案'
              : '输入口播文案，AI 将自动完成配音→素材匹配→剪辑→导出 1080P 视频' }}
          </p>
        </div>

        <!-- AI Output (markdown-like) -->
        <div v-else class="ai-output prose prose-sm max-w-none">
          <div class="whitespace-pre-wrap text-gray-800 leading-relaxed" v-text="creativeStore.pipelineOutput"></div>
          <div v-if="isRunning" class="typing-indicator mt-3 flex items-center gap-2 text-purple-500">
            <Loader2 :size="16" class="animate-spin" />
            <span class="text-sm">AI 正在{{ creativeStore.pipelineMode === '文案' ? '生成文案' : '制作视频' }}...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Script Input (video mode) -->
    <div v-if="creativeStore.pipelineMode === '视频'" class="script-input mx-6 mb-3">
      <div class="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
        <FileText :size="16" class="text-orange-500 mt-0.5 flex-shrink-0" />
        <textarea
          v-model="creativeStore.pipelineScript"
          class="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 resize-none"
          rows="3"
          placeholder="粘贴口播脚本文案...（如：捕鱼达人全新版本上线！超爽打击感，金币哗哗掉！）"
        ></textarea>
      </div>
    </div>

    <!-- Input Bar -->
    <div class="input-bar mx-6 mb-5">
      <div class="input-wrapper flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:border-purple-400 focus-within:shadow-md transition-all">
        <textarea
          v-model="userInput"
          class="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 resize-none px-2"
          rows="1"
          :placeholder="creativeStore.pipelineChatId && hasOutput
            ? '追加指令（如：修改方案二的Hook）...'
            : creativeStore.pipelineMode === '文案'
              ? '描述文案需求（如：针对30-50岁男性，强调爆金爽感）...'
              : '追加指令（可选）...'"
          @keydown="handleKeydown"
        ></textarea>

        <!-- Action buttons -->
        <el-button
          v-if="isRunning"
          type="danger"
          circle
          size="small"
          @click="creativeStore.abortPipeline()"
        >
          <Square :size="14" />
        </el-button>
        <el-button
          v-else
          type="primary"
          circle
          size="small"
          :disabled="creativeStore.pipelineMode === '视频' && !creativeStore.pipelineScript.trim() && !creativeStore.pipelineChatId"
          @click="handleMainAction"
        >
          <component :is="creativeStore.pipelineChatId && hasOutput ? Send : Play" :size="14" />
        </el-button>
      </div>

      <!-- Quick status -->
      <div v-if="creativeStore.error" class="mt-2 text-xs text-red-500 flex items-center gap-1">
        <X :size="12" />
        {{ creativeStore.error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.console-header {
  background: transparent;
}

.mode-btn {
  @apply flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-gray-500 cursor-pointer;
  transition: all 0.2s ease;
}
.mode-btn:hover {
  @apply text-gray-700 bg-white/60;
}
.mode-active {
  @apply bg-white text-purple-600 shadow-sm;
}

.output-area {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.empty-state {
  min-height: 300px;
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

.input-wrapper {
  min-height: 44px;
}

.input-wrapper textarea {
  max-height: 120px;
  line-height: 1.5;
}

/* Element Plus overrides */
:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}
:deep(.el-button.is-circle) {
  width: 32px;
  height: 32px;
}
</style>
