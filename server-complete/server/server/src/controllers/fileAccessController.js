import { resolveStoredFile, streamStoredFile, statStoredFile } from '../services/storageService.js'
import { Document, LeadFile, Lead, UserWorkspace } from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { isElevated } from '../services/recordVisibility.js'

/**
 * Phase 6 — authenticated file serving. THE fix for the highest-severity item in
 * the review: `app.use('/uploads', express.static(...))` served every tenant's
 * documents, email attachments, and leave files to anyone with (or guessing) a
 * URL. UUID filenames are obscurity, not authorization.
 *
 * This route requires auth, resolves the stored reference safely (no traversal —
 * storageService validates the shape and confines to UPLOADS_ROOT), and verifies
 * the requester may see THAT file's tenant scope before streaming a byte.
 *
 * Route (see PATCHES): GET /api/v1/files?ref=<storedRef>
 *   ref = the value stored in Document.filePath / LeadFile.fileUrl, e.g.
 *         "/uploads/documents/<workspaceId>/<name>".
 *
 * Fail closed: mismatch → 403 (don't leak existence); genuinely missing → 404.
 */

async function userCanAccessWorkspace(user, workspaceId) {
  if (!workspaceId) return false
  if (isElevated(user)) return true
  const membership = await UserWorkspace.findOne({
    where: { userId: user.id, workspaceId },
  }).catch(() => null)
  return Boolean(membership)
}

async function authorizeDocuments(user, resolved) {
  // Document is workspace-scoped in this schema. Confirm a Document row exists in
  // that workspace whose stored path matches, and the user can access the ws.
  const ref = `/uploads/${resolved.scope}/${resolved.workspaceId}/${resolved.fileName}`
  const doc = await Document.findOne({
    where: { workspaceId: resolved.workspaceId, filePath: ref },
  }).catch(() => null)
  if (!doc) return false
  return userCanAccessWorkspace(user, resolved.workspaceId)
}

async function authorizeLeadFile(user, resolved) {
  const ref = `/uploads/${resolved.scope}/${resolved.workspaceId}/${resolved.fileName}`
  const leadFile = await LeadFile.findOne({ where: { fileUrl: ref } }).catch(() => null)
  if (!leadFile) {
    // Not a tracked lead file (e.g. a raw email asset) → gate on workspace access.
    return userCanAccessWorkspace(user, resolved.workspaceId)
  }
  const access = await leadAccessWhere(user)
  const lead = await Lead.findOne({
    where: { ...access, id: leadFile.leadId, isDeleted: false },
  }).catch(() => null)
  return Boolean(lead)
}

async function authorizeLeave(user, resolved) {
  // Leave attachments: owner or elevated/HR. Gate on workspace access + elevated.
  // Tighten with a LeaveRequest lookup by stored path if your schema records it.
  return userCanAccessWorkspace(user, resolved.workspaceId)
}

export async function serveFile(req, res, next) {
  try {
    const ref = String(req.query.ref || '').trim()
    const resolved = resolveStoredFile(ref)
    if (!resolved) {
      return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File not found' } })
    }

    let allowed = false
    if (resolved.scope === 'documents') allowed = await authorizeDocuments(req.user, resolved)
    else if (resolved.scope === 'email' || resolved.scope === 'webforms' || resolved.scope === 'leads') allowed = await authorizeLeadFile(req.user, resolved)
    else if (resolved.scope === 'leave') allowed = await authorizeLeave(req.user, resolved)

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this file' },
      })
    }

    const stat = statStoredFile(resolved.absPath)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Content-Disposition', `inline; filename="${resolved.fileName.replace(/"/g, '')}"`)
    res.setHeader('Cache-Control', 'private, max-age=0, no-store')
    return streamStoredFile(resolved.absPath)
      .on('error', () => {
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File not found' } })
        }
      })
      .pipe(res)
  } catch (err) {
    next(err)
  }
}
