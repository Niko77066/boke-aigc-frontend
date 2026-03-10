import { createRouter, createWebHistory } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useCreativeStore } from '@/stores/creative'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/creative',
    },
    {
      path: '/assets',
      name: 'AssetManagement',
      component: () => import('@/views/AssetManagement.vue'),
      meta: { title: '资产管理' },
    },
    {
      path: '/creative',
      name: 'CreativeConsole',
      component: () => import('@/views/CreativeConsole.vue'),
      meta: { title: '创意控制台', step: 1 },
    },
    {
      path: '/result',
      name: 'ResultDelivery',
      component: () => import('@/views/ResultDelivery.vue'),
      meta: { title: '成片交付', step: 2 },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title as string} - 波克城市 AIGC 工作台`
  }

  const step = to.meta.step as number | undefined
  if (!step) {
    // No step restriction (e.g. /assets, /)
    next()
    return
  }

  const workflowStore = useWorkflowStore()
  const creativeStore = useCreativeStore()
  if (workflowStore.canAccessStep(step)) {
    workflowStore.setCurrentStep(step === 2 ? 'result' : 'creative')
    next()
  } else if (step === 2 && creativeStore.hasRecoverableResult) {
    workflowStore.unlockStep('result')
    workflowStore.setCurrentStep('result')
    next()
  } else {
    const nearest = workflowStore.getNearestAccessibleStep()
    ElMessage.warning('请先完成当前步骤后再进入下一步')
    next(nearest)
  }
})

export default router
