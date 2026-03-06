<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const uiStore = useUIStore()
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <AppSidebar :class="{ 'is-open': uiStore.isSidebarOpen }" />
    <main class="app-main">
      <div class="main-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "header"
    "main";
  height: 100vh;
  overflow: hidden;
}

@media (min-width: 768px) {
  .app-layout {
    grid-template-columns: 260px 1fr;
    grid-template-rows: 64px 1fr;
    grid-template-areas:
      "header header"
      "sidebar main";
  }
}

.app-main {
  grid-area: main;
  overflow-y: auto;
  background-color: var(--bg-base);
}

.main-content {
  min-height: 100%;
  padding: 0;
}
</style>
