import type { RenderStatusResponse, RenderStage, RenderResult } from '@/types'
import { mockRenderResults } from './data'
import { delay } from '@/utils/helpers'

interface SimulationState {
  stageIndex: number
  progress: number
  completed: boolean
  failed: boolean
}

const stages: { stage: RenderStage; maxProgress: number }[] = [
  { stage: 'initializing', maxProgress: 10 },
  { stage: 'allocating_resources', maxProgress: 25 },
  { stage: 'processing_assets', maxProgress: 50 },
  { stage: 'generating_audio', maxProgress: 70 },
  { stage: 'compositing', maxProgress: 90 },
  { stage: 'encoding', maxProgress: 95 },
  { stage: 'uploading', maxProgress: 100 },
]

const simulations = new Map<string, SimulationState>()

export function initRenderSimulation(taskId: string, shouldFail = false): void {
  simulations.set(taskId, {
    stageIndex: 0,
    progress: 0,
    completed: false,
    failed: shouldFail,
  })
}

export async function pollRenderStatus(taskId: string): Promise<RenderStatusResponse> {
  await delay(500)

  const sim = simulations.get(taskId)
  if (!sim) {
    // Return a completed result for pre-set mock task ids
    return {
      task_id: taskId,
      status: 'completed',
      progress: 100,
      stage: 'uploading',
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      project_file_url: `https://mock-cdn.boke.com/projects/${taskId}.json`,
    }
  }

  // Advance progress
  if (!sim.completed) {
    sim.progress = Math.min(sim.progress + Math.floor(Math.random() * 8) + 5, 100)

    // Advance stage based on progress
    for (let i = stages.length - 1; i >= 0; i--) {
      if (sim.progress >= (stages[i]?.maxProgress ?? 0)) {
        sim.stageIndex = Math.min(i + 1, stages.length - 1)
        break
      }
    }

    if (sim.progress >= 100) {
      sim.completed = true
    }

    // Simulate failure for second task sometimes
    if (sim.failed && sim.progress >= 60) {
      return {
        task_id: taskId,
        status: 'failed',
        progress: sim.progress,
        stage: stages[sim.stageIndex]?.stage ?? 'initializing',
        error: '渲染资源分配失败，请稍后重试',
      }
    }
  }

  const currentStage = stages[sim.stageIndex]?.stage ?? 'initializing'

  if (sim.completed) {
    return {
      task_id: taskId,
      status: 'completed',
      progress: 100,
      stage: 'uploading',
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      project_file_url: `https://mock-cdn.boke.com/projects/${taskId}.json`,
    }
  }

  return {
    task_id: taskId,
    status: 'processing',
    progress: sim.progress,
    stage: currentStage,
    estimated_time: Math.max(0, Math.floor((100 - sim.progress) * 0.5)),
  }
}

export async function getRenderResults(taskIds: string[]): Promise<RenderResult[]> {
  await delay(500)
  return taskIds.map((id, index) => ({
    ...mockRenderResults[index % mockRenderResults.length]!,
    task_id: id,
  }))
}
