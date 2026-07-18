import { Activity, DocumentLink } from '../models/index.js'

/**
 * Logs a system activity on every lead a document is linked to (upload/move/delete
 * from the lead's Files browser). Mirrors the pattern in leadSalesDocActivity.js —
 * best-effort, errors are swallowed so the document action itself still succeeds.
 */
export async function recordDocumentActivityOnLead({ documentId, userId, action, body, metadata = {} }) {
  try {
    const links = await DocumentLink.findAll({ where: { documentId, entityType: 'lead' }, attributes: ['entityId'] })
    const leadIds = [...new Set(links.map((l) => l.entityId))]
    if (!leadIds.length) return
    await Promise.all(leadIds.map((leadId) =>
      Activity.create({
        type: 'system',
        body,
        metadata: { action, activityTypeKey: 'document', actorUserId: userId, documentId, ...metadata },
        leadId,
        userId: userId || null,
      }),
    ))
  } catch (err) {
    console.error('[recordDocumentActivityOnLead]', err)
  }
}
