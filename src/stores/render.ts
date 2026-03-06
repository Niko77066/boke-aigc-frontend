import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RenderTask, RenderStage, RenderResult, RenderConfig } from '@/types'
import { agentApi, renderApi } from '@/api'
import { POLLING_INTERVAL } from '@/utils/constants'
import { initRenderSimulation } from '@/api/mock/render'

export const useRenderStore = defineStore('render', () => {
  const renderTasks = ref<RenderTask[]>([])
  const currentStage = ref<RenderStage>('initializing')
  const progress = ref(0)
  const results = ref<RenderResult[]>([])
  const polling = ref(false)
  const error = ref<string | null>(null)
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  const overallProgress = computed(() => {
    if (renderTasks.value.length === 0) return 0
    const sum = renderTasks.value.reduce((acc, t) => acc + t.progress, 0)
    return Math.round(sum / renderTasks.value.length)
  })

  const allCompleted = computed(() => renderTasks.value.length > 0 && renderTasks.value.every((t) => t.status === 'completed' || t.status === 'failed'))

  const successfulResults = computed(() => results.value.filter((r) => r.status === 'completed'))

  const failedResults = computed(() => results.value.filter((r) => r.status === 'failed'))

  async function startRender(config: RenderConfig) {
    error.value = null
    progress.value = 0
    currentStage.value = 'initializing'
    results.value = []

    try {
      const response = await agentApi.generateTimeline(
        config.selected_script,
        config.tts_config,
        config.subtitle_config,
        config.kb_id,
      )

      // Initialize render tasks
      renderTasks.value = response.task_ids.map((id, index) => {
        const timeline = response.timelines[index]
        // Initialize mock simulation
        initRenderSimulation(id, false)
        return {
          id,
          timeline_id: timeline?.id ?? '',
          timeline_type: timeline?.type ?? (index === 0 ? 'compact' : 'rich'),
          status: 'pending' as const,
          progress: 0,
          stage: 'initializing' as const,
          created_at: new Date().toISOString(),
        }
      })

      startPolling()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '渲染启动失败'
    }
  }

  function startPolling() {
    if (pollingTimer) return
    polling.value = true
    pollingTimer = setInterval(pollAllTasks, POLLING_INTERVAL)
  }

  async function pollAllTasks() {
    let anyActive = false

    for (const task of renderTasks.value) {
      if (task.status === 'completed' || task.status === 'failed') continue

      try {
        const status = await renderApi.pollRenderStatus(task.id)
        task.status = status.status
        task.progress = status.progress
        task.stage = status.stage
        task.estimated_time = status.estimated_time

        if (status.status === 'completed') {
          task.completed_at = new Date().toISOString()
          results.value.push({
            task_id: task.id,
            timeline_type: task.timeline_type,
            status: 'completed',
            video_url: status.video_url,
            project_file_url: status.project_file_url,
            duration: task.timeline_type === 'compact' ? 25 : 35,
            file_size: task.timeline_type === 'compact' ? 12 * 1024 * 1024 : 18 * 1024 * 1024,
            created_at: new Date().toISOString(),
          })
        } else if (status.status === 'failed') {
          task.error = status.error
          results.value.push({
            task_id: task.id,
            timeline_type: task.timeline_type,
            status: 'failed',
            duration: 0,
            file_size: 0,
            created_at: new Date().toISOString(),
          })
        } else {
          anyActive = true
        }
      } catch {
        anyActive = true
      }
    }

    // Update overall progress and stage
    progress.value = overallProgress.value
    const activeTask = renderTasks.value.find((t) => t.status === 'processing')
    if (activeTask) {
      currentStage.value = activeTask.stage
    }

    if (!anyActive) {
      stopPolling()
    }
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
    polling.value = false
  }

  function resetRender() {
    stopPolling()
    renderTasks.value = []
    currentStage.value = 'initializing'
    progress.value = 0
    results.value = []
    error.value = null
  }

  return {
    renderTasks,
    currentStage,
    progress,
    results,
    polling,
    error,
    overallProgress,
    allCompleted,
    successfulResults,
    failedResults,
    startRender,
    startPolling,
    pollAllTasks,
    stopPolling,
    resetRender,
  }
})
