<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useUserStore } from '@/stores/user'
import { useUIStore } from '@/stores/ui'
import {
  Check,
  ArrowRight,
  Coins,
  Pencil,
  Headphones,
  Loader2,
  Play,
  Menu,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const workflowStore = useWorkflowStore()
const userStore = useUserStore()
const uiStore = useUIStore()

const currentStepMeta = computed(() => route.meta.step as number | undefined)

const steps = [
  { step: 1, name: '创意生成', route: '/creative', icon: Pencil },
  { step: 2, name: '音画配置', route: '/config', icon: Headphones },
  { step: 3, name: '渲染进行中', route: '/render', icon: Loader2 },
  { step: 4, name: '成片交付', route: '/result', icon: Play },
]

function isStepActive(step: number) {
  return currentStepMeta.value === step
}

function isStepCompleted(step: number) {
  const s = workflowStore.steps[step - 1]
  return s?.completed ?? false
}

function goToStep(stepRoute: string) {
  router.push(stepRoute)
}
</script>

<template>
  <header
    class="app-header flex items-center justify-between px-6 border-b"
  >
    <div class="header-left flex items-center">
      <button class="hamburger-btn md:hidden mr-4" @click="uiStore.toggleSidebar">
        <Menu :size="24" class="text-gray-600" />
      </button>
      <div class="logo flex items-center gap-3 cursor-pointer transition-all hover:opacity-80" @click="router.push('/')">
        <img src="/boke-logo.png" alt="波克城市" class="h-8 w-auto" />
        <span class="logo-text text-lg font-bold text-gray-900">
          波克 AIGC
        </span>
      </div>
    </div>

    <nav class="header-steps hidden md:flex items-center">
      <div
        v-for="(s, idx) in steps"
        :key="s.step"
        class="step-item flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all"
        :class="{
          'active-step': isStepActive(s.step),
          'completed-step': isStepCompleted(s.step),
        }"
        @click="goToStep(s.route)"
      >
        <div
          class="step-indicator w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
        >
          <Check v-if="isStepCompleted(s.step)" :size="14" />
          <span v-else>{{ s.step }}</span>
        </div>
        <span class="step-label text-sm font-medium">{{ s.name }}</span>
        <ArrowRight v-if="idx < steps.length - 1" class="step-arrow text-gray-300 mx-2" :size="12" />
      </div>
    </nav>

    <div class="header-right flex items-center gap-4">
      <div class="quota-info hidden sm:flex items-center gap-2 px-4 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-600">
        <Coins :size="14" />
        <span>剩余额度: 128 次</span>
      </div>
      <el-dropdown>
        <div class="user-info flex items-center gap-2 cursor-pointer p-1 rounded-full transition-all hover:bg-gray-100">
          <el-avatar :size="32" class="user-avatar bg-purple-500 text-sm font-bold">
            {{ userStore.displayName.charAt(0) }}
          </el-avatar>
          <span class="user-name hidden md:inline text-sm text-gray-700 font-medium">{{ userStore.displayName }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>个人设置</el-dropdown-item>
            <el-dropdown-item divided @click="userStore.logout()">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
@reference "tailwindcss";
.app-header {
  grid-area: header;
  height: 64px;
  background: var(--bg-surface);
  border-color: var(--border-color);
}

.step-item {
  color: var(--text-secondary);
}

.step-item:hover {
  background: rgba(124, 92, 252, 0.06);
  color: var(--text-primary);
}

.step-indicator {
  border-color: var(--border-color);
}

.completed-step .step-indicator {
  border-color: var(--success);
  background-color: var(--success);
  color: white;
}

.active-step {
  color: var(--text-bright);
}

.active-step .step-indicator {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: white;
}

.active-step .step-label {
  color: var(--brand-primary);
  font-weight: 600;
}

.user-avatar {
  border: 2px solid var(--brand-primary);
}
</style>
