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
import { Settings, FileText, Check, ArrowRight, Pencil, X } from 'lucide-vue-next'

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
      <h1 class="page-title text-2xl font-bold text-gray-900">创意控制台</h1>
      <p class="page-desc text-sm text-gray-500 mt-1">
        配置营销目标与卖点，AI 为您生成多套创意文案方案
      </p>
    </div>

    <div class="console-layout grid grid-cols-10 gap-6 flex-1 min-h-0">
      <!-- Left: Config panel (3/10) -->
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

      <!-- Right: Output area (7/10) -->
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
        <ScriptEditor
          v-model="editingTtsText"
          placeholder="编辑 TTS 播报文案..."
        />
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
        type="primary"
        size="large"
        :disabled="!canProceed"
        class="next-btn"
        @click="goToConfig"
      >
        下一步: 音画配置
        <ArrowRight :size="16" class="ml-2" />
      </el-button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/* Clean card base */
.glass-morphism {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.config-panel:hover, .output-panel:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-md);
}

/* Panel header: light gray bg */
.panel-header {
  @apply flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-gray-800;
}

/* Action Bar */
.action-bar {
  @apply bg-white border border-gray-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Next button */
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

.next-btn:active:not(.is-disabled) {
  transform: translateY(0);
}

.next-btn.is-disabled {
  @apply bg-gray-200 text-gray-400;
  box-shadow: none;
  opacity: 1;
}

/* Editor panel */
.editor-panel {
  @apply border border-purple-200;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.editor-panel .panel-header {
  @apply flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-gray-800;
}
</style>
