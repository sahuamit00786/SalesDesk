import { google } from 'googleapis'

class GmailParserService {
  async fetchThreads(auth, maxResults = 20) {
    const gmail = google.gmail({ version: 'v1', auth })
    const list = await gmail.users.threads.list({ userId: 'me', maxResults })
    const threads = list.data.threads || []
    return Promise.all(threads.map((thread) => this.fetchThread(auth, thread.id)))
  }

  async fetchThread(auth, threadId) {
    const gmail = google.gmail({ version: 'v1', auth })
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' })
    return thread.data
  }

  async fetchAttachment(auth, messageId, attachmentId) {
    const gmail = google.gmail({ version: 'v1', auth })
    const att = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    })
    return Buffer.from(String(att.data.data || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  }
}

export const gmailParserService = new GmailParserService()
