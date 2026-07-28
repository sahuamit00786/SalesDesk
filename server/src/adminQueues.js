import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { bullmqConnectionFromEnv } from './queues/connection.js'
import { getNotificationEmailQueue } from './queues/notificationEmailQueue.js'
import { getEmailTemplateQueue } from './queues/emailTemplateQueue.js'
import { getEmailSequenceQueue } from './queues/emailSequenceQueue.js'
import { getWorkflowTriggerQueue } from './queues/workflowTriggerQueue.js'
import { getWhatsAppMediaQueue } from './queues/whatsappMediaQueue.js'

const BOARD_PATH = '/admin/queues'

/**
 * Dev-only BullMQ dashboard. Not mounted in production and not mounted at
 * all when Redis isn't configured, since every queue getter returns null
 * in that case (same fallback rule the queues themselves already follow).
 */
export function mountQueueBoard(app) {
  if (process.env.NODE_ENV === 'production') return false
  if (!bullmqConnectionFromEnv()) return false

  const queues = [
    getNotificationEmailQueue(),
    getEmailTemplateQueue(),
    getEmailSequenceQueue(),
    getWorkflowTriggerQueue(),
    getWhatsAppMediaQueue(),
  ].filter(Boolean)

  if (!queues.length) return false

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(BOARD_PATH)

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  })

  app.use(BOARD_PATH, serverAdapter.getRouter())
  return true
}
