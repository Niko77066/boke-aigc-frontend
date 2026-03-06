<script setup lang="ts">
import type { WizardStepConfig, WizardStep } from '@/types'

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
        <el-icon v-if="step.completed" :size="12"><Check /></el-icon>
        <span v-else>{{ idx + 1 }}</span>
      </div>
      <span class="step-name">{{ step.name }}</span>
      <div v-if="idx < steps.length - 1" class="step-connector" />
    </div>
  </div>
</template>

<style scoped>
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
  color: var(--text-secondary);
}
.wizard-step:hover {
  background: rgba(124, 58, 237, 0.06);
}
.wizard-step.active {
  color: var(--brand-primary-light);
}
.wizard-step.completed {
  color: var(--success);
}
.wizard-step.pending {
  opacity: 0.5;
  cursor: default;
}

.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  transition: all 0.2s;
}
.wizard-step.active .step-dot {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: #fff;
}
.wizard-step.completed .step-dot {
  border-color: var(--success);
  background: var(--success);
  color: #fff;
}

.step-name {
  font-size: 12px;
  white-space: nowrap;
}

.step-connector {
  width: 24px;
  height: 1px;
  background: var(--border-color);
  margin-left: 4px;
}
.wizard-step.completed .step-connector {
  background: var(--success);
}
</style>
