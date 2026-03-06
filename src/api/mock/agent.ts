import type { GenerateCopyRequest, GenerateCopyResponse, GenerateTimelineResponse, Script } from '@/types'
import { mockScripts, mockTimelines } from './data'
import { delay, generateId } from '@/utils/helpers'

export async function generateCopy(request: GenerateCopyRequest): Promise<GenerateCopyResponse> {
  // Simulate multi-phase AI generation
  await delay(1500) // Analyzing
  await delay(2000) // Generating
  await delay(1000) // Polishing

  const scripts: Script[] = mockScripts.map((s) => ({
    ...s,
    id: generateId('script'),
    created_at: new Date().toISOString(),
  }))

  // Customize based on audience
  if (request.audience === 'premium') {
    scripts[0]!.tts_text = '尊享捕鱼体验！波克捕鱼VIP专属福利开启，钻石炮台免费体验，专属鱼场超高爆率！成为海洋之王，畅享至尊捕鱼快感！'
  } else if (request.audience === 'budget') {
    scripts[0]!.tts_text = '零氪也能玩转捕鱼！每日签到白嫖千万金币，免费炮台照样打Boss！波克捕鱼，不花一分钱也能成为捕鱼达人！'
  }

  return {
    request_id: generateId('req'),
    scripts,
  }
}

export async function generateTimeline(): Promise<GenerateTimelineResponse> {
  await delay(2000)

  const timelines = mockTimelines()
  const taskIds = [generateId('render_task'), generateId('render_task')]

  return {
    request_id: generateId('req'),
    timelines,
    task_ids: taskIds,
  }
}
