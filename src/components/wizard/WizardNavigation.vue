<script setup lang="ts">
import type { WizardStepConfig, WizardStep } from '@/types'
import { Check } from 'lucide-vue-next'

defineProps<{
  steps: WizardStepConfig[]
  currentStep: WizardStep
}>()

const emit = defineEmits<{
  stepClick: [step: WizardStep]
}>()

function getStepStatus(step: WizardStepConfig, current: WizardStep): 'active' | 'completed' | 'pending' {
  if (step.step === current) return 'active'
  if (step.completed) return 'completed'
  return 'pending'
}
</script>

<template>
  <div class="wizard-nav">
    <div
      v-for="(step, idx) in steps"
      :key="step.step"
      class="wizard-step"
      :class="getStepStatus(step, currentStep)"
      @click="step.canAccess && emit('stepClick', step.step)"
    >
      <div class="step-dot">
        <Check v-if="step.completed" :size="12" />
        <span v-else>{{ idx + 1 }}</span>
      </div>
      <span class="step-name">{{ step.name }}</span>
      <div v-if="idx < steps.length - 1" class="step-connector" />
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.wizard-nav {
  display: flex;
  align-items: center;
  gap: 0;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
  @apply text-gray-500;
}
.wizard-step:hover {
  @apply bg-purple-50;
}
.wizard-step.active {
  @apply text-purple-600;
}
.wizard-step.completed {
  @apply text-emerald-600;
}
.wizard-step.pending {
  opacity: 0.5;
  cursor: default;
}

.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  transition: all 0.2s;
  @apply border-2 border-gray-300;
}
.wizard-step.active .step-dot {
  @apply border-purple-500 bg-purple-500 text-white;
}
.wizard-step.completed .step-dot {
  @apply border-emerald-500 bg-emerald-500 text-white;
}

.step-name {
  font-size: 12px;
  white-space: nowrap;
}

.step-connector {
  width: 24px;
  height: 1px;
  margin-left: 4px;
  @apply bg-gray-200;
}
.wizard-step.completed .step-connector {
  @apply bg-emerald-500;
}
</style>
