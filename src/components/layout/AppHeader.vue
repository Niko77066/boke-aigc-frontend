<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useUserStore } from '@/stores/user'
import { useUIStore } from '@/stores/ui'
import {
  VideoCameraFilled,
  Check,
  ArrowRight,
  Coin,
  EditPen,
  Headset,
  Loading,
  VideoPlay,
  Menu,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const workflowStore = useWorkflowStore()
const userStore = useUserStore()
const uiStore = useUIStore()

const currentStepMeta = computed(() => route.meta.step as number | undefined)

const steps = [
  { step: 1, name: '创意生成', route: '/creative', icon: EditPen },
  { step: 2, name: '音画配置', route: '/config', icon: Headset },
  { step: 3, name: '渲染进行中', route: '/render', icon: Loading },
  { step: 4, name: '成片交付', route: '/result', icon: VideoPlay },
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
    class="app-header glass-morphism flex items-center justify-between px-6 border-b"
  >
    <div class="header-left flex items-center">
      <button class="hamburger-btn md:hidden mr-4" @click="uiStore.toggleSidebar">
        <el-icon :size="24"><Menu /></el-icon>
      </button>
      <div class="logo flex items-center gap-3 cursor-pointer transition-all hover:opacity-80 hover:scale-105" @click="router.push('/')">
        <div
          class="logo-icon w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style="background: var(--gradient-primary)"
        >
          <el-icon :size="24"><VideoCameraFilled /></el-icon>
        </div>
        <span class="logo-text text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-slate-200">
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
          <el-icon v-if="isStepCompleted(s.step)" :size="14"><Check /></el-icon>
          <span v-else>{{ s.step }}</span>
        </div>
        <span class="step-label text-sm font-medium">{{ s.name }}</span>
        <el-icon v-if="idx < steps.length - 1" class="step-arrow text-slate-500 mx-2" :size="12">
          <ArrowRight />
        </el-icon>
      </div>
    </nav>

    <div class="header-right flex items-center gap-4">
      <div class="quota-info hidden sm:flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300">
        <el-icon :size="14"><Coin /></el-icon>
        <span>剩余额度: 128 次</span>
      </div>
      <el-dropdown>
        <div class="user-info flex items-center gap-2 cursor-pointer p-1 rounded-full transition-all hover:bg-white/5 hover:scale-105">
          <el-avatar :size="32" class="user-avatar bg-purple-500 text-sm font-bold">
            {{ userStore.displayName.charAt(0) }}
          </el-avatar>
          <span class="user-name hidden md:inline text-sm text-slate-300 font-medium">{{ userStore.displayName }}</span>
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
.app-header {
  grid-area: header;
  height: 64px;
  background: rgba(16, 16, 26, 0.6); /* Darker glass */
  border-color: var(--border-color);
}

.logo-text {
  background-image: linear-gradient(135deg, var(--brand-primary-light), #e2e8f0);
}

.step-item {
  color: var(--text-secondary);
}

.step-item:hover {
  background: rgba(168, 85, 247, 0.1);
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
  box-shadow: var(--glow-primary);
  animation: pulse 2s infinite;
}

.active-step .step-label {
  color: var(--brand-primary-light);
  text-shadow: var(--text-shadow-primary);
}

.user-avatar {
  border: 2px solid var(--brand-primary);
}
</style>