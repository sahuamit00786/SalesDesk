import { Queue, Worker } from 'bullmq'
import { Meeting } from '../models/Meeting.js'
import { runMeetingBot } from '../bot/meetingBot.js'
import { processMeetingRecording } from '../services/meetingProcessingService.js'
import { bullmqConnectionFromEnv } from './connection.js'

const QUEUE_NAME = 'meeting-bot'
let queue = null
let worker = null

function getQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 } })
  return queue
}

/** Enqueue a meeting bot job. Returns null if Redis unavailable. */
export async function enqueueMeetingBot(meetingId) {
  const q = getQueue()
  if (!q) return null
  return q.add('run-bot', { meetingId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}

export function startMeetingBotWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null

  const concurrency = Number(process.env.BOT_WORKER_CONCURRENCY || 3)

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { meetingId } = job.data
      const meeting = await Meeting.findByPk(meetingId)
      if (!meeting) throw new Error(`Meeting ${meetingId} not found`)

      try {
        const transcript = await runMeetingBot(meeting.get({ plain: true }))
        await processMeetingRecording(meeting, transcript)
      } catch (err) {
        console.error(`❌ BullMQ bot worker failed for ${meetingId}:`, err?.message || err)
        await Meeting.update(
          { botStatus: 'failed', recordingStatus: 'pending' },
          { where: { id: meetingId } },
        )
        throw err
      }
    },
    { connection, concurrency },
  )

  worker.on('error', (err) => {
    console.error('[meeting-bot worker] error:', err?.message || err)
  })

  console.log(`[meeting-bot worker] started (concurrency=${concurrency})`)
  return worker
}
