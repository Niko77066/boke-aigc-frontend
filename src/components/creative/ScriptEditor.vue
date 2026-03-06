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
  @apply flex flex-col rounded-2xl overflow-hidden border;
  background: var(--bg-surface);
  border-color: var(--border-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.script-editor:focus-within {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-focus);
}

/* Toolbar */
.editor-toolbar {
  @apply flex items-center gap-1 px-3 py-2 border-b;
  border-color: var(--border-color);
  background: var(--bg-muted);
}

.toolbar-btn {
  @apply w-8 h-8 flex items-center justify-center rounded-md text-sm text-gray-600 cursor-pointer;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  @apply text-purple-600;
  border-color: var(--brand-primary);
  background: rgba(124, 92, 252, 0.06);
}

.toolbar-btn:active {
  transform: scale(0.95);
}

.toolbar-divider {
  @apply w-px h-5 mx-2;
  background: var(--border-color);
}

.editor-stats {
  @apply flex items-center gap-2 ml-auto text-xs text-gray-400;
}

.stat {
  @apply text-xs text-gray-400;
}

.stat-sep {
  @apply text-gray-300;
}

/* Editor content */
.editor-content {
  @apply flex-1 p-4 text-sm text-gray-800 leading-relaxed overflow-y-auto outline-none;
  min-height: 120px;
  max-height: 300px;
}

.editor-content:empty::before {
  content: attr(data-placeholder);
  @apply text-gray-300;
  pointer-events: none;
}

.editor-content :deep(h3) {
  @apply text-base font-bold text-purple-700 mb-2;
}

.editor-content :deep(b),
.editor-content :deep(strong) {
  @apply font-bold text-gray-900;
}

.editor-content :deep(i),
.editor-content :deep(em) {
  @apply italic text-gray-600;
}

/* Footer for readonly mode */
.editor-footer {
  @apply flex items-center gap-2 px-3 py-2 border-t;
  border-color: var(--border-color);
  background: var(--bg-muted);
}
</style>
