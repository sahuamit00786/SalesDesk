import { resolveStoredFile, streamStoredFile, statStoredFile } from '../services/storageService.js'
import path from 'node:path'
import { Op } from 'sequelize'
import { Document, LeadFile, Lead, UserWorkspace, Meeting, Workspace } from '../models/index.js'
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

/**
 * SECURITY FIX (BUG-5) — cross-tenant file access via the elevated-role shortcut.
 *
 * Previously this returned `true` for ANY elevated user (`isElevated` = company
 * admin | workspace_admin | manager) WITHOUT checking that `workspaceId` belongs
 * to that user's company. Because every company has its own admin, a company
 * admin of tenant B could read tenant A's documents, email attachments, webform
 * uploads, lead files and leave files simply by knowing the stored ref —
 * verified: a foreign admin received 200 + full file contents.
 *
 * The tenant boundary must be established BEFORE any role shortcut applies:
 * resolve the workspace, confirm it belongs to the caller's company, and only
 * then let elevation substitute for explicit membership.
 */
async function userCanAccessWorkspace(user, workspaceId) {
  if (!workspaceId || !user?.companyId) return false

  // Tenant gate first — a role shortcut must never cross a company boundary.
  const workspace = await Workspace.findOne({
    where: { id: workspaceId, companyId: user.companyId },
    attributes: ['id'],
  }).catch(() => null)
  if (!workspace) return false

  // Within the caller's own company, elevated roles see all workspaces.
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

/**
 * SECURITY FIX (BUG-1) — authenticated + tenant-scoped call-recording serving.
 *
 * The previous `GET /api/v1/recordings/:filename` handler blocked path traversal
 * but performed NO ownership check: it joined the filename onto the recordings
 * directory and streamed it. Any authenticated user of ANY company could download
 * any other tenant's call recording by name (verified: a foreign-company admin
 * received 200 + full audio). Recording filenames are multer hashes — obscurity,
 * not authorization — and they leak to clients via meeting payloads.
 *
 * Recordings are linked to a tenant through `meetings.audio_file_path`; `meetings`
 * is workspace-scoped (no company_id column), so workspace membership is the
 * correct gate — the same rule `authorizeDocuments` already applies.
 *
 * Fail closed: unknown/foreign recording → 404 (don't confirm existence).
 */
export async function serveRecording(req, res, next) {
  try {
    const { filename } = req.params

    // Defence in depth: keep the traversal guard even though we now also require
    // a DB row to match, so a malicious path can never reach the filesystem.
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\') ||
      path.isAbsolute(filename)
    ) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid filename' } })
    }

    // Find the meeting that owns this recording, then verify the caller may see
    // that meeting's workspace. `Op.like` on the stored path handles both bare
    // filenames and "recordings/<name>" style values.
    const meeting = await Meeting.findOne({
      where: {
        [Op.or]: [
          { audioFilePath: filename },
          { audioFilePath: { [Op.like]: `%${filename}` } },
        ],
      },
      attributes: ['id', 'workspaceId'],
    }).catch(() => null)

    if (!meeting || !(await userCanAccessWorkspace(req.user, meeting.workspaceId))) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Recording not found' } })
    }

    const recordingsDir = path.resolve(process.cwd(), 'recordings')
    const filePath = path.join(recordingsDir, filename)

    // Confirm the resolved path is still inside the recordings directory.
    if (!filePath.startsWith(recordingsDir + path.sep)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid filename' } })
    }

    res.setHeader('Cache-Control', 'private, max-age=0, no-store')
    return res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Recording not found' } })
      }
    })
  } catch (err) {
    next(err)
  }
}
