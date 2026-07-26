import { Queue, Worker } from 'bullmq'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { bullmqConnectionFromEnv } from './connection.js'
import { WhatsAppMessage, CompanyWhatsAppSettings } from '../models/index.js'
import { decryptSecret } from '../utils/secretCrypto.js'
import { getMediaUrl, downloadMediaBuffer } from '../services/whatsapp/whatsappGraphClient.js'

const QUEUE_NAME = 'whatsapp-media-download'
let queue = null
let worker = null

function getUploadsRoot() {
  return path.resolve(process.cwd(), 'uploads', 'whatsapp')
}

function safeFileName(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180)
}

async function processMediaDownloadJob(job) {
  const { companyId, messageId, mediaId } = job.data
  const message = await WhatsAppMessage.findOne({ where: { id: messageId, companyId } })
  if (!message) return { ok: false, reason: 'message_not_found' }

  const settings = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })
  if (!settings?.accessTokenEncrypted) {
    await message.update({ errorMessage: 'WhatsApp is not connected — could not fetch media' })
    return { ok: false, reason: 'settings_missing' }
  }
  const accessToken = decryptSecret(settings.accessTokenEncrypted)

  try {
    const { url, mimeType, fileSize } = await getMediaUrl(mediaId, accessToken)
    if (!url) {
      await message.update({ errorMessage: 'Media is no longer available from WhatsApp' })
      return { ok: false, reason: 'no_media_url' }
    }
    const buffer = await downloadMediaBuffer(url, accessToken)

    const dir = path.join(getUploadsRoot(), companyId)
    await mkdir(dir, { recursive: true })
    const extGuess = (mimeType || '').split('/')[1]?.split(';')[0]
    const fileName = `${Date.now()}_${mediaId}${extGuess ? `.${safeFileName(extGuess)}` : ''}`
    await writeFile(path.join(dir, fileName), buffer)

    await message.update({
      mediaUrl: `/uploads/whatsapp/${companyId}/${fileName}`,
      mimeType: mimeType || message.mimeType,
      fileSize: fileSize || buffer.length,
    })
    return { ok: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[whatsapp-media] download failed for message ${messageId}:`, err?.message || err)
    await message.update({ errorMessage: err?.message || 'Media download failed' })
    return { ok: false, reason: err?.message || 'download_failed' }
  }
}

/** Same handler used inline when BullMQ/Redis is unavailable. */
export async function runWhatsAppMediaDownloadInline(jobData) {
  return processMediaDownloadJob({ data: jobData })
}

export function getWhatsAppMediaQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection })
  return queue
}

export async function enqueueMediaDownload(payload) {
  const q = getWhatsAppMediaQueue()
  if (!q) {
    // No Redis configured — process inline rather than dropping the download.
    return runWhatsAppMediaDownloadInline(payload)
  }
  return q.add('download-media', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  })
}

export function startWhatsAppMediaWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  worker = new Worker(QUEUE_NAME, processMediaDownloadJob, { connection, concurrency: 2 })
  worker.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[whatsapp-media-queue] worker error:', err?.message || err)
  })
  return worker
}
