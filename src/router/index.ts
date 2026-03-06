import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/config',
      name: 'AudioVideoConfig',
      component: () => import('@/views/AudioVideoConfig.vue'),
      meta: { title: '音画配置', step: 2 },
    },
    {
      path: '/render',
      name: 'RenderProgress',
      component: () => import('@/views/RenderProgress.vue'),
      meta: { title: '渲染进度', step: 3 },
    },
    {
      path: '/result',
      name: 'ResultDelivery',
      component: () => import('@/views/ResultDelivery.vue'),
      meta: { title: '成片交付', step: 4 },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title as string} - 波克城市 AIGC 工作台`
  }
  next()
})

export default router
