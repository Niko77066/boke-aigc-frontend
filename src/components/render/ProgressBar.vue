<script setup lang="ts">
withDefaults(defineProps<{
  progress: number
  showPercentage?: boolean
  color?: string
}>(), {
  showPercentage: true,
  color: '',
})
</script>

<template>
  <div class="progress-wrapper">
    <div class="wave-progress">
      <div
        class="wave-progress-bar"
        :style="{
          width: Math.min(progress, 100) + '%',
          background: color || undefined,
        }"
      />
    </div>
    <span v-if="showPercentage" class="progress-text">{{ Math.round(progress) }}%</span>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.wave-progress {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  @apply bg-gray-100;
  overflow: hidden;
}

.wave-progress-bar {
  height: 100%;
  border-radius: 4px;
  background: var(--gradient-primary);
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  @apply text-purple-600;
  white-space: nowrap;
  min-width: 40px;
  text-align: right;
}
</style>
