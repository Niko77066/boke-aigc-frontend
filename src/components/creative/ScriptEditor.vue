<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
  placeholder?: string
}>(), {
  readonly: false,
  placeholder: '请输入文案内容...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement | null>(null)

const charCount = computed(() => props.modelValue.length)
const wordCount = computed(() => {
  const text = props.modelValue.trim()
  if (!text) return 0
  // Count Chinese characters + English words
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (text.match(/[a-zA-Z]+/g) || []).length
  return chinese + english
})

function execCommand(command: string, value?: string) {
  document.execCommand(command, false, value)
  syncContent()
}

function handleBold() {
  execCommand('bold')
}

function handleItalic() {
  execCommand('italic')
}

function handleHeading() {
  // Toggle between heading and paragraph
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const parent = sel.anchorNode?.parentElement
    if (parent?.tagName === 'H3') {
      execCommand('formatBlock', 'p')
    } else {
      execCommand('formatBlock', 'h3')
    }
  }
}

function syncContent() {
  if (editorRef.value) {
    const text = editorRef.value.innerText || ''
    emit('update:modelValue', text)
  }
}

function handleInput() {
  syncContent()
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// Sync external modelValue changes into the editor
watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && editorRef.value.innerText !== newVal) {
    editorRef.value.innerText = newVal
  }
})

onMounted(() => {
  if (editorRef.value && props.modelValue) {
    editorRef.value.innerText = props.modelValue
  }
})
</script>

<template>
  <div class="script-editor" :class="{ 'is-readonly': readonly }">
    <!-- Toolbar -->
    <div v-if="!readonly" class="editor-toolbar">
      <button
        class="toolbar-btn"
        title="加粗 (Bold)"
        @click="handleBold"
      >
        <strong>B</strong>
      </button>
      <button
        class="toolbar-btn"
        title="斜体 (Italic)"
        @click="handleItalic"
      >
        <em>I</em>
      </button>
      <button
        class="toolbar-btn"
        title="标题 (Heading)"
        @click="handleHeading"
      >
        H
      </button>
      <div class="toolbar-divider"></div>
      <div class="editor-stats">
        <span class="stat">{{ charCount }} 字符</span>
        <span class="stat-sep">|</span>
        <span class="stat">{{ wordCount }} 词</span>
      </div>
    </div>

    <!-- Editor area -->
    <div
      ref="editorRef"
      class="editor-content"
      :contenteditable="!readonly"
      :data-placeholder="placeholder"
      @input="handleInput"
      @paste="handlePaste"
    ></div>

    <!-- Readonly stats -->
    <div v-if="readonly" class="editor-footer">
      <span class="stat">{{ charCount }} 字符</span>
      <span class="stat-sep">|</span>
      <span class="stat">{{ wordCount }} 词</span>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.script-editor {
  @apply flex flex-col rounded-xl overflow-hidden border border-white/10;
  background: rgba(20, 20, 35, 0.6);
  backdrop-filter: blur(12px);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.script-editor:focus-within {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15), inset 0 0 10px rgba(168, 85, 247, 0.05);
}

.script-editor.is-readonly {
  border-color: rgba(255, 255, 255, 0.05);
}

/* Toolbar */
.editor-toolbar {
  @apply flex items-center gap-1 px-3 py-2 border-b border-white/10;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
}

.toolbar-btn {
  @apply w-8 h-8 flex items-center justify-center rounded-md text-sm text-slate-300 cursor-pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  @apply text-white;
  background: rgba(168, 85, 247, 0.3);
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.3);
}

.toolbar-btn:active {
  transform: scale(0.95);
}

.toolbar-divider {
  @apply w-px h-5 mx-2;
  background: rgba(255, 255, 255, 0.1);
}

.editor-stats {
  @apply flex items-center gap-2 ml-auto text-xs text-slate-500;
}

.stat {
  @apply text-xs text-slate-500;
}

.stat-sep {
  @apply text-slate-600;
}

/* Editor content */
.editor-content {
  @apply flex-1 p-4 text-sm text-slate-200 leading-relaxed overflow-y-auto outline-none;
  min-height: 120px;
  max-height: 300px;
}

.editor-content:empty::before {
  content: attr(data-placeholder);
  @apply text-slate-600;
  pointer-events: none;
}

.editor-content :deep(h3) {
  @apply text-base font-bold text-purple-300 mb-2;
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
}

.editor-content :deep(b),
.editor-content :deep(strong) {
  @apply font-bold text-cyan-300;
}

.editor-content :deep(i),
.editor-content :deep(em) {
  @apply italic text-purple-200;
}

/* Footer for readonly mode */
.editor-footer {
  @apply flex items-center gap-2 px-3 py-2 border-t border-white/10;
  background: rgba(15, 15, 25, 0.4);
}
</style>
