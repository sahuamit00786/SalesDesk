import { Activity } from '../models/index.js'

/** System timeline entry on a lead (used by HTTP controllers and BullMQ workers). */
export async function createLeadSystemActivity({ leadId, userId, body, metadata = {} }) {
  await Activity.create({
    type: 'system',
    body,
    metadata: { actorUserId: userId, ...metadata },
    leadId,
    userId: userId || null,
  })
}
