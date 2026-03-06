<script setup lang="ts">
import type { SubtitleStyle } from '@/types'

defineProps<{
  styles: SubtitleStyle[]
  selected?: string
}>()

const emit = defineEmits<{
  select: [styleId: string]
}>()

function previewStyle(style: SubtitleStyle): Record<string, string | undefined> {
  const baseSize = 14; // A base font size for preview
  return {
    fontFamily: style.config.font_family,
    fontSize: `${baseSize}px`,
    color: style.config.font_color,
    backgroundColor: style.config.background_color ?? 'transparent',
    padding: '2px 8px',
    borderRadius: '4px',
    textShadow: style.config.border_color ? `0 0 5px ${style.config.border_color}, 0 0 2px ${style.config.border_color}` : 'none',
    '-webkit-text-stroke': style.config.border_color ? `1px ${style.config.border_color}` : 'none',
  }
}
</script>

<template>
  <div class="subtitle-selector">
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="style in styles"
        :key="style.id"
        class="style-card"
        :class="{ 'selected-card': selected === style.id }"
        @click="emit('select', style.id)"
      >
        <div class="card-content">
          <div class="style-preview">
            <div class="preview-bg">
              <span :style="previewStyle(style)">AI营销视频字幕预览</span>
            </div>
          </div>
          <div class="style-info p-3">
            <div class="style-name text-sm font-semibold text-slate-200">{{ style.name }}</div>
            <div class="style-desc text-xs text-slate-400 mt-1">{{ style.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.style-card {
  @apply relative p-px rounded-xl cursor-pointer transition-all duration-300;
  background: var(--gradient-card);
}
.style-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(145deg, var(--border-color), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  transition: all 0.3s ease;
}
.style-card:hover::before {
  background: var(--gradient-primary);
}
.card-content {
  @apply rounded-[11px] h-full w-full overflow-hidden;
  background: #1e1e32;
}
.selected-card {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}
.selected-card::before {
  background: var(--gradient-primary);
}

.style-preview {
  @apply aspect-video overflow-hidden;
}
.preview-bg {
  @apply w-full h-full flex items-center justify-center text-center p-2;
  background-image: linear-gradient(45deg, #0f0f1a, #1a1a2e), url('https://images.unsplash.com/photo-1611162617213-6d221bde3840?q=80&w=100&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
}
</style>