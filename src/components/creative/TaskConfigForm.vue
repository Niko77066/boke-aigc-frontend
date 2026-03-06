<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { TaskConfig } from '@/types'
import { AUDIENCES, KB_ID } from '@/utils/constants'
import TagInput from '@/components/common/TagInput.vue'
import { Wand2 } from 'lucide-vue-next'

const props = defineProps<{
  config?: Partial<TaskConfig>
}>()

const emit = defineEmits<{
  submit: [config: TaskConfig]
  change: [config: Partial<TaskConfig>]
}>()

const form = reactive<TaskConfig>({
  audience: props.config?.audience ?? 'premium',
  reference_copy: props.config?.reference_copy ?? '',
  brainstorm_keywords: props.config?.brainstorm_keywords ?? [],
  kb_id: props.config?.kb_id ?? KB_ID,
})

const canSubmit = computed(() => form.brainstorm_keywords.length > 0)

function handleAudienceChange(val: string) {
  form.audience = val as TaskConfig['audience']
  emit('change', { audience: form.audience })
}

function handleKeywordsUpdate(tags: string[]) {
  form.brainstorm_keywords = tags
  emit('change', { brainstorm_keywords: tags })
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', { ...form })
}
</script>

<template>
  <div class="task-config-form">
    <div class="form-section">
      <label class="form-label">目标人群</label>
      <div class="audience-grid">
        <div
          v-for="a in AUDIENCES"
          :key="a.id"
          class="audience-card"
          :class="{ 'selected-card': form.audience === a.id }"
          @click="handleAudienceChange(a.id)"
        >
          <div class="audience-name">{{ a.name }}</div>
          <div class="audience-desc">{{ a.description }}</div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">参考文案 <span class="optional">(选填)</span></label>
      <el-input
        v-model="form.reference_copy"
        type="textarea"
        :rows="3"
        placeholder="粘贴竞品文案或历史优秀文案作为参考..."
        @input="emit('change', { reference_copy: form.reference_copy })"
      />
    </div>

    <div class="form-section">
      <label class="form-label">
        脑暴卖点
        <span class="required-mark">*</span>
      </label>
      <TagInput
        :tags="form.brainstorm_keywords"
        placeholder="输入卖点关键词后按回车添加，如：免费金币、Boss战..."
        :max-tags="15"
        @update:tags="handleKeywordsUpdate"
      />
      <div class="preset-tags">
        <span class="preset-label">热门卖点：</span>
        <span
          v-for="tag in ['免费金币', '新手福利', 'Boss大鱼', '万炮齐发', '排行榜', '限时活动']"
          :key="tag"
          class="capsule-tag preset-click"
          @click="!form.brainstorm_keywords.includes(tag) && handleKeywordsUpdate([...form.brainstorm_keywords, tag])"
        >
          + {{ tag }}
        </span>
      </div>
    </div>

    <div class="form-action">
      <el-button
        type="primary"
        size="large"
        :disabled="!canSubmit"
        class="generate-btn"
        @click="handleSubmit"
      >
        <Wand2 :size="16" class="mr-1" />
        AI 生成创意文案
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.task-config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.optional {
  font-weight: 400;
  color: var(--text-secondary);
  font-size: 12px;
}
.required-mark {
  color: var(--danger);
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.audience-card {
  position: relative;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}
.audience-card:hover {
  border-color: var(--brand-primary);
  background: rgba(124, 92, 252, 0.04);
}
.audience-card.selected-card {
  border-color: var(--brand-primary);
  background: rgba(124, 92, 252, 0.08);
  box-shadow: var(--shadow-focus);
}

.audience-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.audience-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.preset-label {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.capsule-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(124, 92, 252, 0.08);
  color: var(--brand-primary);
  border: 1px solid rgba(124, 92, 252, 0.2);
}

.preset-click {
  cursor: pointer;
  opacity: 0.6;
  background: rgba(124, 92, 252, 0.04);
}
.preset-click:hover {
  opacity: 1;
}

.form-action {
  padding-top: 8px;
}

.generate-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: var(--brand-primary);
  border: none;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}
.generate-btn:hover:not(:disabled) {
  background: var(--brand-primary-dark);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
</style>
