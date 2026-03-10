<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import {
  FolderOpen,
  Pencil,
  Play,
  Database,
  Workflow,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

const assetItems = [
  { path: '/assets', label: '素材管理', icon: FolderOpen },
]

const pipelineItems = [
  { path: '/creative', label: '创意生成', icon: Pencil },
  { path: '/result', label: '成片交付', icon: Play },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function navigate(path: string) {
  router.push(path)
  if (uiStore.isSidebarOpen) uiStore.toggleSidebar()
}
</script>

<template>
  <div class="sidebar-container" :class="{ 'is-open': uiStore.isSidebarOpen }">
    <div class="sidebar-backdrop" @click="uiStore.toggleSidebar"></div>
    <aside class="app-sidebar flex flex-col border-r">
      <!-- 素材资产库 -->
      <div class="sidebar-section">
        <div class="section-header">
          <Database :size="14" class="section-icon" />
          <span>素材资产库</span>
        </div>
        <nav class="section-menu">
          <div
            v-for="item in assetItems"
            :key="item.path"
            class="menu-item"
            :class="{ 'active-menu-item': isActive(item.path) }"
            @click="navigate(item.path)"
          >
            <div class="menu-icon">
              <component :is="item.icon" :size="16" />
            </div>
            <span class="menu-label">{{ item.label }}</span>
          </div>
        </nav>
      </div>

      <!-- 分隔线 -->
      <div class="section-divider"></div>

      <!-- 自动化产线 -->
      <div class="sidebar-section flex-1">
        <div class="section-header">
          <Workflow :size="14" class="section-icon" />
          <span>自动化产线</span>
        </div>
        <nav class="section-menu">
          <div
            v-for="(item, idx) in pipelineItems"
            :key="item.path"
            class="menu-item"
            :class="{ 'active-menu-item': isActive(item.path) }"
            @click="navigate(item.path)"
          >
            <div class="step-indicator">
              <span class="step-number">{{ idx + 1 }}</span>
            </div>
            <span class="menu-label">{{ item.label }}</span>
            <component :is="item.icon" :size="14" class="menu-trail-icon" />
          </div>
        </nav>
      </div>

      <!-- 底部 -->
      <div class="sidebar-footer">
        <div class="version-info">AIGC Pipeline v1.0</div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.app-sidebar {
  grid-area: sidebar;
  background: var(--bg-surface);
  border-color: var(--border-color);
  min-height: 100%;
}

/* Section */
.sidebar-section {
  @apply px-3 py-3;
}

.section-header {
  @apply flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

.section-icon {
  color: var(--brand-primary);
  opacity: 0.6;
}

.section-divider {
  @apply mx-4 my-1;
  height: 1px;
  background: var(--border-color);
}

.section-menu {
  @apply flex flex-col gap-0.5;
}

/* Menu Items */
.menu-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer relative overflow-hidden;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.menu-icon {
  @apply flex items-center justify-center w-7 h-7 rounded-md;
  background: var(--bg-muted);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.menu-item:hover .menu-icon {
  background: rgba(124, 92, 252, 0.1);
  color: var(--brand-primary);
}

.menu-label {
  @apply text-sm font-medium;
}

.menu-trail-icon {
  @apply ml-auto;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.menu-item:hover .menu-trail-icon {
  opacity: 0.5;
}

/* Step indicator for pipeline items */
.step-indicator {
  @apply flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold;
  background: var(--bg-muted);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.menu-item:hover .step-indicator {
  background: rgba(124, 92, 252, 0.1);
  color: var(--brand-primary);
}

/* Active state */
.active-menu-item {
  background: rgba(124, 92, 252, 0.08);
  color: var(--text-primary);
  font-weight: 600;
}

.active-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: var(--brand-primary);
  border-radius: 0 3px 3px 0;
}

.active-menu-item .menu-icon,
.active-menu-item .step-indicator {
  background: var(--brand-primary);
  color: white;
}

.active-menu-item .menu-label {
  color: var(--brand-primary);
}

.active-menu-item .menu-trail-icon {
  opacity: 0.6;
  color: var(--brand-primary);
}

/* Footer */
.sidebar-footer {
  @apply p-4 mt-auto;
  border-top: 1px solid var(--border-color);
}

.version-info {
  @apply text-center text-xs font-medium;
  color: var(--text-muted);
}

/* Mobile responsive */
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
    box-shadow: var(--shadow-xl);
  }
  .sidebar-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
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
