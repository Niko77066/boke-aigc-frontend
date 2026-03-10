import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { WizardStep, WizardStepConfig, WorkflowData, WorkflowSnapshot } from '@/types'
import { generateId } from '@/utils/helpers'

const STEP_ORDER: WizardStep[] = ['creative', 'result']
const WORKFLOW_STORAGE_KEY = 'boke-aigc:workflow'

interface PersistedWorkflowState {
  currentStep: WizardStep
  steps: WizardStepConfig[]
  workflowData: WorkflowData
}

function makeStepConfigs(): WizardStepConfig[] {
  return [
    { step: 'creative', name: '创意生成', title: '创意控制台', description: '配置目标人群与卖点，AI生成创意文案并自动制作视频', completed: false, canAccess: true },
    { step: 'result', name: '成片交付', title: '成片交付', description: '预览与下载最终视频', completed: false, canAccess: false },
  ]
}

function loadPersistedWorkflowState(): PersistedWorkflowState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedWorkflowState
  } catch {
    return null
  }
}

export const useWorkflowStore = defineStore('workflow', () => {
  const persisted = loadPersistedWorkflowState()
  const currentStep = ref<WizardStep>(persisted?.currentStep ?? 'creative')
  const steps = ref<WizardStepConfig[]>(persisted?.steps ?? makeStepConfigs())
  const workflowData = ref<WorkflowData>(persisted?.workflowData ?? {})
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

  watch(
    () => ({
      currentStep: currentStep.value,
      steps: steps.value,
      workflowData: workflowData.value,
    }),
    (state) => {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(state))
    },
    { deep: true },
  )

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
