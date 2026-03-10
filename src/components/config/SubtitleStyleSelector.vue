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
            <div class="style-name text-sm font-semibold text-gray-800">{{ style.name }}</div>
            <div class="style-desc text-xs text-gray-500 mt-1">{{ style.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.style-card {
  @apply relative rounded-2xl cursor-pointer transition-all duration-300 bg-white border border-gray-200 shadow-sm;
}
.style-card:hover {
  border-color: #FB923C;
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.12);
}
.card-content {
  @apply rounded-2xl h-full w-full overflow-hidden bg-white;
}
.selected-card {
  border-color: #F97316;
  background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%);
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(249, 115, 22, 0.16);
}

.style-preview {
  @apply aspect-video overflow-hidden;
}
.preview-bg {
  @apply w-full h-full flex items-center justify-center text-center p-2;
  background-image: linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.08)), url('https://images.unsplash.com/photo-1611162617213-6d221bde3840?q=80&w=100&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
}
</style>
