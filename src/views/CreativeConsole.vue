<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCreativeStore } from '@/stores/creative'
import { useWorkflowStore } from '@/stores/workflow'
import TaskConfigForm from '@/components/creative/TaskConfigForm.vue'
import CreativeOutput from '@/components/creative/CreativeOutput.vue'
import ScriptEditor from '@/components/creative/ScriptEditor.vue'
import type { TaskConfig, Script } from '@/types'
import { ElMessage } from 'element-plus'
import { Setting, Document, Check, ArrowRight, Edit, Close } from '@element-plus/icons-vue'

const router = useRouter()
const creativeStore = useCreativeStore()
const workflowStore = useWorkflowStore()

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
</script>

<template>
  <div class="creative-console flex flex-col h-full p-6 gap-6">
    <div class="page-header">
      <h1 class="page-title text-2xl font-bold text-white">创意控制台</h1>
      <p class="page-desc text-sm text-slate-400 mt-1">
        配置营销目标与卖点，AI 为您生成多套创意文案方案
      </p>
    </div>

    <div class="console-layout grid grid-cols-10 gap-6 flex-1 min-h-0">
      <!-- Left: Config panel (3/10) -->
      <div class="config-panel glass-morphism col-span-3 flex flex-col rounded-xl overflow-hidden">
        <div class="panel-header">
          <el-icon :size="16"><Setting /></el-icon>
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

      <!-- Right: Output area (7/10) -->
      <div class="output-panel glass-morphism col-span-7 flex flex-col rounded-xl overflow-hidden">
        <div class="panel-header">
          <el-icon :size="16"><Document /></el-icon>
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
    <div v-if="editingScript" class="editor-panel glass-morphism flex flex-col rounded-xl overflow-hidden">
      <div class="panel-header">
        <el-icon :size="16"><Edit /></el-icon>
        <span class="font-semibold">编辑文案 — {{ creativeStore.selectedScript?.title }}</span>
        <div class="flex items-center gap-2 ml-auto">
          <el-button size="small" @click="handleCancelEdit">
            <el-icon class="mr-1"><Close /></el-icon>取消
          </el-button>
          <el-button type="primary" size="small" @click="handleSaveEdit">
            <el-icon class="mr-1"><Check /></el-icon>保存
          </el-button>
        </div>
      </div>
      <div class="panel-body p-4">
        <ScriptEditor
          v-model="editingTtsText"
          placeholder="编辑 TTS 播报文案..."
        />
      </div>
    </div>

    <!-- Bottom action bar -->
    <div class="action-bar glass-morphism flex items-center justify-between p-4 rounded-xl">
      <div class="action-info">
        <span v-if="creativeStore.selectedScript" class="selected-info flex items-center gap-2 text-sm font-medium text-green-400">
          <el-icon :size="16"><Check /></el-icon>
          已选择方案: {{ creativeStore.selectedScript.title }}
        </span>
        <span v-else class="text-sm text-slate-400">请在右侧选择一个创意方案以继续</span>
      </div>
      <el-button
        type="primary"
        size="large"
        :disabled="!canProceed"
        class="next-btn"
        @click="goToConfig"
      >
        下一步: 音画配置
        <el-icon class="ml-2"><ArrowRight /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* 基础 Glass Morphism 层次 */
.glass-morphism {
  @apply bg-slate-900/40 backdrop-blur-xl border border-white/10;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.config-panel:hover, .output-panel:hover {
  @apply border-purple-500/30;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), 
              inset 0 0 0 1px rgba(168, 85, 247, 0.2),
              0 0 20px rgba(168, 85, 247, 0.1);
}

/* 面板标题栏：渐变底色 + 微光 */
.panel-header {
  @apply flex items-center gap-2 px-4 py-3 border-b border-white/10;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 15px -3px rgba(168, 85, 247, 0.15);
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
}

.panel-header .el-icon {
  @apply text-cyan-400;
  filter: drop-shadow(0 0 5px rgba(6, 182, 212, 0.6));
}

/* Action Bar：Neon 边框呼吸动画 */
@keyframes neon-breathe {
  0%, 100% {
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.1), inset 0 0 5px rgba(6, 182, 212, 0.05);
    border-color: rgba(6, 182, 212, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2);
    border-color: rgba(6, 182, 212, 0.6);
  }
}

.action-bar {
  @apply bg-slate-900/70 backdrop-blur-2xl border;
  animation: neon-breathe 3s infinite ease-in-out;
}

/* 下一步按钮：Scale + Glow 扩散 */
.next-btn {
  @apply font-bold rounded-lg px-8 py-5 text-white relative overflow-hidden border-0;
  background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
}

.next-btn::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #c084fc 0%, #22d3ee 100%);
  opacity: 0;
  z-index: -1;
  transition: opacity 0.4s ease;
}

.next-btn:hover:not(.is-disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.6), 
              0 0 60px rgba(6, 182, 212, 0.4),
              inset 0 0 10px rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
}

.next-btn:hover:not(.is-disabled)::before {
  opacity: 1;
}

.next-btn:active:not(.is-disabled) {
  transform: translateY(1px) scale(0.98);
}

.next-btn.is-disabled {
  background: #334155;
  box-shadow: none;
  opacity: 0.5;
  transform: none;
}

/* Editor panel */
.editor-panel {
  @apply border border-purple-500/30;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
}

.editor-panel .panel-header {
  @apply flex items-center gap-2 px-4 py-3 border-b border-white/10;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.08) 100%);
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
}

.editor-panel .panel-header .el-icon {
  @apply text-cyan-400;
  filter: drop-shadow(0 0 5px rgba(6, 182, 212, 0.6));
}
</style>