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
  background: rgba(255, 255, 255, 0.1);
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
  color: var(--brand-primary-light);
  white-space: nowrap;
  min-width: 40px;
  text-align: right;
}
</style>
