import { Lead, Meeting } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from './userWorkspaceService.js'

export async function assertMeetingAccess(meetingId, user, workspaceId) {
  const wid = String(workspaceId || '').trim()
  if (!wid) {
    const err = new Error('Workspace ID is required')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'workspaceId is required'
    throw err
  }

  if (!user?.companyId) {
    const err = new Error('Company context is required')
    err.status = 403
    err.code = 'FORBIDDEN'
    err.publicMessage = 'Company context is required'
    throw err
  }

  const meeting = await Meeting.findOne({ where: { id: meetingId, workspaceId: wid } })
  if (!meeting) {
    const err = new Error('Meeting not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Meeting not found'
    throw err
  }

  const lead = await Lead.findOne({
    where: { id: meeting.leadId, companyId: user.companyId, isDeleted: false },
    attributes: ['id'],
  })
  if (!lead) {
    const err = new Error('Meeting not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Meeting not found'
    throw err
  }

  if (!user.isCompanyAdmin) {
    const allowed = await allowedWorkspaceIdsForUser(user)
    if (allowed.length && !allowed.includes(wid)) {
      const err = new Error('No access to workspace')
      err.status = 403
      err.code = 'FORBIDDEN'
      err.publicMessage = 'No access to this workspace'
      throw err
    }
  }

  return meeting
}
