<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { Video } from 'lucide-vue-next'

withDefaults(defineProps<{
  src: string
  title?: string
  poster?: string
  controls?: boolean
}>(), {
  title: '',
  poster: '',
  controls: true,
})

const emit = defineEmits<{
  play: []
  pause: []
  ended: []
}>()

const videoRef = ref<HTMLVideoElement>()
const videoError = ref(false)

function onError() {
  videoError.value = true
}

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoRef.value.pause()
  }
})
</script>

<template>
  <div class="video-player-wrapper">
    <div class="video-player-content">
      <div v-if="title" class="player-title">{{ title }}</div>
      <div class="player-container">
        <video
          v-if="!videoError"
          ref="videoRef"
          :src="src"
          :poster="poster"
          :controls="controls"
          preload="metadata"
          class="video-element"
          @play="emit('play')"
          @pause="emit('pause')"
          @ended="emit('ended')"
          @error="onError"
        />
        <div v-else class="video-error">
          <Video :size="40" />
          <p>视频加载失败</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.video-player-wrapper {
  @apply relative rounded-2xl bg-white border border-gray-200 shadow-md;
}

.video-player-content {
  @apply rounded-xl overflow-hidden bg-white;
}

.player-title {
  @apply px-4 py-2 text-sm font-semibold text-gray-800 bg-gray-50 border-b border-gray-200;
}

.player-container {
  @apply aspect-video bg-black;
}

.video-element {
  @apply w-full h-full block;
}

.video-error {
  @apply w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400;
}
</style>
