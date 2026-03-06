import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WizardStep, WizardStepConfig, WorkflowData, WorkflowSnapshot } from '@/types'
import { generateId } from '@/utils/helpers'

const STEP_ORDER: WizardStep[] = ['creative', 'result']

function makeStepConfigs(): WizardStepConfig[] {
  return [
    { step: 'creative', name: '创意生成', title: '创意控制台', description: '配置目标人群与卖点，AI生成创意文案并自动制作视频', completed: false, canAccess: true },
    { step: 'result', name: '成片交付', title: '成片交付', description: '预览与下载最终视频', completed: false, canAccess: false },
  ]
}

export const useWorkflowStore = defineStore('workflow', () => {
  const currentStep = ref<WizardStep>('creative')
  const steps = ref<WizardStepConfig[]>(makeStepConfigs())
  const workflowData = ref<WorkflowData>({})
  const history = ref<WorkflowSnapshot[]>([])

  const currentStepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  const canProceed = computed(() => {
    const idx = currentStepIndex.value
    return idx < STEP_ORDER.length - 1
  })

  const canGoBack = computed(() => currentStepIndex.value > 0)

  function nextStep() {
    const idx = currentStepIndex.value
    if (idx < STEP_ORDER.length - 1) {
      markStepCompleted(currentStep.value)
      const next = STEP_ORDER[idx + 1]!
      currentStep.value = next
      unlockStep(next)
    }
  }

  function prevStep() {
    const idx = currentStepIndex.value
    if (idx > 0) {
      currentStep.value = STEP_ORDER[idx - 1]!
    }
  }

  function goToStep(step: WizardStep) {
    const target = steps.value.find((s) => s.step === step)
    if (target?.canAccess) {
      currentStep.value = step
    }
  }

  function markStepCompleted(step: WizardStep) {
    const found = steps.value.find((s) => s.step === step)
    if (found) found.completed = true
  }

  function unlockStep(step: WizardStep) {
    const found = steps.value.find((s) => s.step === step)
    if (found) found.canAccess = true
  }

  function setCurrentStep(step: WizardStep) {
    currentStep.value = step
  }

  function canAccessStep(stepIndex: number): boolean {
    const step = STEP_ORDER[stepIndex - 1]
    if (!step) return false
    const found = steps.value.find((s) => s.step === step)
    return found?.canAccess ?? false
  }

  function getNearestAccessibleStep(): { name: string } {
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
      const step = steps.value.find((s) => s.step === STEP_ORDER[i])
      if (step?.canAccess) {
        const routeNames: Record<WizardStep, string> = {
          creative: 'CreativeConsole',
          config: 'CreativeConsole',
          render: 'CreativeConsole',
          result: 'ResultDelivery',
        }
        return { name: routeNames[step.step] }
      }
    }
    return { name: 'CreativeConsole' }
  }

  function updateWorkflowData(data: Partial<WorkflowData>) {
    workflowData.value = { ...workflowData.value, ...data }
  }

  function saveSnapshot() {
    history.value.push({
      id: generateId('snapshot'),
      step: currentStep.value,
      data: { ...workflowData.value },
      timestamp: new Date().toISOString(),
    })
  }

  function resetWorkflow() {
    currentStep.value = 'creative'
    steps.value = makeStepConfigs()
    workflowData.value = {}
    history.value = []
  }

  return {
    currentStep,
    steps,
    workflowData,
    history,
    currentStepIndex,
    canProceed,
    canGoBack,
    nextStep,
    prevStep,
    goToStep,
    markStepCompleted,
    unlockStep,
    setCurrentStep,
    canAccessStep,
    getNearestAccessibleStep,
    updateWorkflowData,
    saveSnapshot,
    resetWorkflow,
  }
})
