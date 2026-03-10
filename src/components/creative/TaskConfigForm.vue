<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { TaskConfig } from '@/types'
import { AUDIENCES, KB_ID } from '@/utils/constants'
import { VOICE_OPTIONS, SUBTITLE_OPTIONS } from '@/api/pipeline'
import TagInput from '@/components/common/TagInput.vue'
import { Wand2, Mic, Type, Clapperboard } from 'lucide-vue-next'

const props = defineProps<{
  config?: Partial<TaskConfig>
  loading?: boolean
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
  voice: props.config?.voice ?? '气场御姐',
  subtitle: props.config?.subtitle ?? '轻快醒目',
})

const canSubmit = computed(() => form.brainstorm_keywords.length > 0 && !props.loading)

function handleAudienceChange(val: string) {
  form.audience = val as TaskConfig['audience']
  emit('change', { audience: form.audience })
}

function handleKeywordsUpdate(tags: string[]) {
  form.brainstorm_keywords = tags
  emit('change', { brainstorm_keywords: tags })
}

function handleVoiceChange(val: string) {
  form.voice = val
  emit('change', { voice: val })
}

function handleSubtitleChange(val: string) {
  form.subtitle = val
  emit('change', { subtitle: val })
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

    <!-- Voice selector -->
    <div class="form-section">
      <label class="form-label">
        <Mic :size="13" class="inline-icon" />
        配音风格
      </label>
      <div class="option-grid">
        <div
          v-for="v in VOICE_OPTIONS"
          :key="v.value"
          class="option-card"
          :class="{ 'selected-card': form.voice === v.value }"
          @click="handleVoiceChange(v.value)"
        >
          <span class="option-kicker">VOICE</span>
          <span class="option-label">{{ v.label }}</span>
        </div>
      </div>
    </div>

    <!-- Subtitle selector -->
    <div class="form-section">
      <label class="form-label">
        <Type :size="13" class="inline-icon" />
        字幕样式
      </label>
      <div class="option-grid option-grid-3">
        <div
          v-for="s in SUBTITLE_OPTIONS"
          :key="s.value"
          class="option-card"
          :class="{ 'selected-card': form.subtitle === s.value }"
          @click="handleSubtitleChange(s.value)"
        >
          <span class="option-kicker">TEXT</span>
          <span class="option-label">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <div class="form-action">
      <div class="action-hint">
        <Clapperboard :size="14" />
        <span>输出 4 套方案后，可直接在右侧按钮卡片中一键做视频</span>
      </div>
      <el-button
        type="primary"
        size="large"
        :disabled="!canSubmit"
        :loading="loading"
        class="generate-btn"
        @click="handleSubmit"
      >
        <Wand2 v-if="!loading" :size="16" class="mr-1" />
        {{ loading ? '文案工作流执行中...' : '生成 4 套营销文案' }}
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
  display: flex;
  align-items: center;
  gap: 4px;
}
.inline-icon {
  color: var(--brand-primary);
  flex-shrink: 0;
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

/* ── Option cards (voice / subtitle) ──────────── */
.option-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.option-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.option-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}
.option-card:hover {
  border-color: var(--brand-primary);
  background: rgba(124, 92, 252, 0.04);
}
.option-card.selected-card {
  border-color: var(--brand-primary);
  background: rgba(124, 92, 252, 0.08);
  box-shadow: var(--shadow-focus);
}

.option-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94A3B8;
}

.option-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.action-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #FFF7ED;
  color: #9A3412;
  font-size: 12px;
  font-weight: 500;
}

.generate-btn {
  width: 100%;
  height: 52px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #F97316 0%, #FB7185 100%);
  border: none;
  box-shadow: 0 10px 20px rgba(249, 115, 22, 0.22);
  transition: all 0.2s ease;
}
.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #EA580C 0%, #F43F5E 100%);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .workflow-mode-row,
  .audience-grid,
  .option-grid,
  .option-grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
