<script setup lang="ts">
import { ref } from 'vue'
import { MAX_FILE_SIZE, SUPPORTED_VIDEO_FORMATS, SUPPORTED_IMAGE_FORMATS } from '@/utils/constants'
import { formatFileSize, getFileExtension } from '@/utils/helpers'
import { Upload } from 'lucide-vue-next'

withDefaults(defineProps<{
  accept?: string[]
  multiple?: boolean
  maxSize?: number
}>(), {
  accept: () => [...SUPPORTED_VIDEO_FORMATS, ...SUPPORTED_IMAGE_FORMATS],
  multiple: true,
  maxSize: MAX_FILE_SIZE,
})

const emit = defineEmits<{
  upload: [files: File[]]
  error: [msg: string]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    handleFiles(Array.from(input.files))
    input.value = ''
  }
}

function handleFiles(files: File[]) {
  const validFiles: File[] = []
  for (const file of files) {
    const ext = getFileExtension(file.name)
    const allFormats = [...SUPPORTED_VIDEO_FORMATS, ...SUPPORTED_IMAGE_FORMATS]
    if (!allFormats.includes(ext)) {
      emit('error', `不支持的文件格式: ${file.name}`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      emit('error', `文件超过大小限制 (${formatFileSize(MAX_FILE_SIZE)}): ${file.name}`)
      continue
    }
    validFiles.push(file)
  }
  if (validFiles.length > 0) {
    emit('upload', validFiles)
  }
}

function triggerInput() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="file-uploader"
    :class="{ 'is-dragging': isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="triggerInput"
  >
    <div class="uploader-content">
      <input
        ref="fileInput"
        type="file"
        :multiple="multiple"
        :accept="accept.join(',')"
        class="hidden"
        @change="onFileChange"
      />
      <div class="upload-icon">
        <Upload :size="40" />
      </div>
      <p class="upload-title">拖拽文件到这里，或 <span class="upload-link">点击上传</span></p>
      <p class="upload-hint">支持 MP4, PNG, JPG 等格式，单文件不超过 {{ formatFileSize(maxSize) }}</p>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.file-uploader {
  @apply relative p-1 rounded-xl cursor-pointer transition-all duration-300 bg-white;
  border: 2px dashed #d1d5db;
}

.file-uploader:hover {
  border-color: var(--brand-primary);
  transform: translateY(-2px);
}

.file-uploader.is-dragging {
  border-style: solid;
  border-color: transparent;
  background: repeating-conic-gradient(from var(--angle), var(--brand-primary) 0% 25%, transparent 25% 50%) 0 0 / 2rem 2rem;
  animation: march 10s linear infinite;
}

@keyframes march {
  to { --angle: 360deg; }
}

.uploader-content {
  @apply flex flex-col items-center justify-center gap-2 text-center p-8 rounded-lg bg-white;
}

.upload-icon {
  @apply text-purple-400 transition-all;
}
.file-uploader:hover .upload-icon {
  @apply text-purple-500;
  transform: scale(1.1);
}

.upload-title {
  @apply text-base font-semibold text-gray-700;
}
.upload-link {
  @apply text-purple-500 font-bold;
}
.upload-hint {
  @apply text-xs text-gray-400;
}
</style>
