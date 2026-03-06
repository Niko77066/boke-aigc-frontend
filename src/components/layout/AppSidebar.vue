<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import {
  Operation,
  FolderOpened,
  EditPen,
  Headset,
  Loading,
  VideoPlay,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()
const activeTab = ref<'workflow' | 'assets'>('workflow')

const menuItems = computed(() => {
  if (activeTab.value === 'workflow') {
    return [
      { path: '/creative', label: '创意控制台', icon: EditPen },
      { path: '/config', label: '音画配置', icon: Headset },
      { path: '/render', label: '渲染进度', icon: Loading },
      { path: '/result', label: '成片交付', icon: VideoPlay },
    ]
  }
  return [{ path: '/assets', label: '资产管理', icon: FolderOpened }]
})

function isActive(path: string) {
  return route.path.startsWith(path)
}

function navigate(path:string) {
  router.push(path)
  uiStore.toggleSidebar()
}
</script>

<template>
  <div class="sidebar-container" :class="{ 'is-open': uiStore.isSidebarOpen }">
    <div class="sidebar-backdrop" @click="uiStore.toggleSidebar"></div>
    <aside class="app-sidebar glass-morphism flex flex-col border-r">
      <div class="sidebar-tabs p-3">
        <div class="flex bg-black/20 rounded-lg p-1">
          <button
            class="tab-btn"
            :class="{ 'active-tab': activeTab === 'workflow' }"
            @click="activeTab = 'workflow'"
          >
            <el-icon :size="14"><Operation /></el-icon>
            <span>自动化产线</span>
          </button>
          <button
            class="tab-btn"
            :class="{ 'active-tab': activeTab === 'assets' }"
            @click="activeTab = 'assets'"
          >
            <el-icon :size="14"><FolderOpened /></el-icon>
            <span>素材资产库</span>
          </button>
        </div>
      </div>

      <nav class="sidebar-menu flex-1 px-3 py-2 flex flex-col gap-1">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="menu-item"
          :class="{ 'active-menu-item': isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <div class="menu-icon flex items-center justify-center w-7 h-7 rounded-md">
            <el-icon :size="16">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <span class="menu-label text-sm font-medium">{{ item.label }}</span>
        </div>
      </nav>

      <div class="sidebar-footer p-4 mt-auto">
        <div class="version-info text-center text-xs text-slate-500">v1.0.0 Phase 1</div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.app-sidebar {
  grid-area: sidebar;
  background: rgba(20, 20, 37, 0.5); /* Darker glass for sidebar */
  border-color: var(--border-color);
}

.tab-btn {
  @apply flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-slate-400 text-xs font-semibold;
  transition: all 0.2s ease-in-out;
}
.tab-btn:hover {
  @apply bg-white/5 text-slate-200;
  transform: translateY(-1px);
}
.active-tab {
  @apply bg-purple-500/20 text-purple-300 shadow-inner;
}

.menu-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-400 relative overflow-hidden;
  transition: all 0.2s ease-in-out;
}
.menu-item:hover {
  @apply bg-purple-500/10 text-slate-200;
  transform: translateX(2px);
}
.menu-item .menu-icon {
  @apply bg-purple-500/10;
}
.menu-item:hover .menu-icon {
  @apply bg-purple-500/20;
}

.active-menu-item {
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.1));
  color: var(--text-bright);
  font-weight: 600;
}

.active-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--brand-primary);
  border-radius: 0 4px 4px 0;
  box-shadow: var(--glow-primary);
}

.active-menu-item .menu-icon {
  background: var(--brand-primary);
  color: white;
}

.active-menu-item .menu-label {
  color: var(--brand-primary-light);
  text-shadow: var(--text-shadow-primary);
}

@media (max-width: 767px) {
  .sidebar-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    pointer-events: none;
  }
  .app-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    width: 250px;
    height: 100%;
  }
  .sidebar-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }
  .sidebar-container.is-open {
    pointer-events: auto;
  }
  .sidebar-container.is-open .app-sidebar {
    transform: translateX(0);
  }
  .sidebar-container.is-open .sidebar-backdrop {
    opacity: 1;
  }
}
</style>