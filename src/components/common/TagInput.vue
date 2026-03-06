<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  tags: string[]
  placeholder?: string
  maxTags?: number
}>(), {
  placeholder: '输入标签后按回车添加',
  maxTags: 20,
})

const emit = defineEmits<{
  'update:tags': [tags: string[]]
}>()

const inputValue = ref('')

function addTag() {
  const value = inputValue.value.trim()
  if (!value) return
  if (props.tags.includes(value)) {
    inputValue.value = ''
    return
  }
  if (props.tags.length >= props.maxTags) return

  emit('update:tags', [...props.tags, value])
  inputValue.value = ''
}

function removeTag(tag: string) {
  emit('update:tags', props.tags.filter((t) => t !== tag))
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag()
  }
  if (e.key === 'Backspace' && !inputValue.value && props.tags.length > 0) {
    emit('update:tags', props.tags.slice(0, -1))
  }
}
</script>

<template>
  <div class="tag-input-wrapper">
    <div class="tag-input-container">
      <span
        v-for="tag in tags"
        :key="tag"
        class="capsule-tag"
      >
        {{ tag }}
        <X class="tag-close" :size="12" @click="removeTag(tag)" />
      </span>
      <input
        v-model="inputValue"
        class="tag-raw-input"
        :placeholder="tags.length === 0 ? placeholder : ''"
        @keydown="handleKeydown"
        @blur="addTag"
      />
    </div>
    <div v-if="maxTags" class="tag-count">{{ tags.length }}/{{ maxTags }}</div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.tag-input-wrapper {
  width: 100%;
}

.tag-input-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  min-height: 38px;
  transition: border-color 0.2s;
  cursor: text;
}
.tag-input-container:focus-within {
  border-color: var(--brand-primary);
}

.capsule-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  @apply bg-purple-50 text-purple-600 border border-purple-200;
}

.tag-close {
  margin-left: 4px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.tag-close:hover {
  opacity: 1;
}

.tag-raw-input {
  flex: 1;
  min-width: 80px;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2937;
  font-size: 13px;
  padding: 2px 4px;
}
.tag-raw-input::placeholder {
  color: #d1d5db;
  opacity: 1;
}

.tag-count {
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.5;
  margin-top: 4px;
}
</style>
