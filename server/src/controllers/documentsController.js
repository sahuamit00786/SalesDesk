import { Document, Folder } from '../models/index.js'
import {
  addDocumentFolders,
  addDocumentLinks,
  createDocumentShare,
  createDocumentWithLinks,
  getDocumentApiPayload,
  getFolderTree,
  isValidDocumentType,
  isValidLinks,
  listDocuments,
  listDocumentShares,
  listDocumentVersions,
  listLeadDocumentSummaries,
  parseLinks,
  patchDocumentMetadata,
  restoreVersion,
} from '../services/documentsService.js'

function resolveWorkspaceId(req) {
  return req.headers['x-workspace-id']
}

export async function createDocument(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'File is required' } })

    const name = String(req.body?.name || req.file.originalname || '').trim()
    const fileType = String(req.body?.fileType || 'Other').trim()
    const folderId = req.body?.folderId || null
    let folderIds = []
    if (req.body?.folderIds) {
      try {
        folderIds = JSON.parse(req.body.folderIds)
      } catch {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid folderIds payload' } })
      }
    }
    const links = parseLinks(req.body?.links)
    const description = req.body?.description

    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Document name is required' } })
    if (!isValidDocumentType(fileType)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid document type' } })
    }
    if (req.body?.links && !isValidLinks(links)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid links payload' } })
    }

    const row = await createDocumentWithLinks({
      file: req.file,
      name,
      fileType,
      description,
      workspaceId,
      uploadedBy: req.user.id,
      folderId,
      folderIds,
      links,
      source: req.body?.source || 'manual',
    })

    const payload = await getDocumentApiPayload({ id: row.id, workspaceId })
    return res.status(201).json({ success: true, data: payload || row.get({ plain: true }), meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function listAllDocuments(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const rows = await listDocuments({ workspaceId, filters: req.query || {} })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function listLeadDocumentSummariesHandler(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const rows = await listLeadDocumentSummaries({ workspaceId })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function patchDocument(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const body = req.body || {}
    const result = await patchDocumentMetadata({
      id: req.params.id,
      workspaceId,
      name: body.name,
      description: body.description,
      fileType: body.fileType,
    })
    if (result === null) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    if (result === 'BAD_TYPE') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid fileType' } })
    }
    if (result === 'BAD_NAME') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name cannot be empty' } })
    }
    return res.json({ success: true, data: result, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function folderTree(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const tree = await getFolderTree({ workspaceId })
    return res.json({ success: true, data: tree, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function createFolder(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const name = String(req.body?.name || '').trim()
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Folder name is required' } })

    const row = await Folder.create({
      name,
      parentFolderId: req.body?.parentFolderId || null,
      entityType: req.body?.entityType || null,
      entityId: req.body?.entityId || null,
      workspaceId,
      createdBy: req.user.id,
    })

    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function linkDocument(req, res, next) {
  try {
    const row = await Document.findByPk(req.params.id)
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    const links = parseLinks(req.body?.links)
    if (!links.length || !isValidLinks(links)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'At least one valid link is required' } })
    }
    const allLinks = await addDocumentLinks({ documentId: row.id, links })
    return res.json({ success: true, data: allLinks, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function linkDocumentFolders(req, res, next) {
  try {
    const row = await Document.findByPk(req.params.id)
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    const folderIds = Array.isArray(req.body?.folderIds) ? req.body.folderIds : []
    if (!folderIds.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'At least one folderId is required' } })
    }
    const links = await addDocumentFolders({ documentId: row.id, folderIds })
    return res.json({ success: true, data: links, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function saveEmailAttachmentToDocuments(req, res) {
  return res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Email attachment save-to-documents flow scaffolded. Wire Gmail byte fetch and call createDocumentWithLinks().',
    },
  })
}

export async function getDocumentViewerMeta(req, res) {
  const doc = await Document.findByPk(req.params.id)
  if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })

  const fileType = (doc.fileType || '').toLowerCase()
  const extension = (doc.name.split('.').pop() || '').toLowerCase()
  const inlinePdfLike = fileType === 'pdf' || extension === 'pdf'
  const inlineImageLike = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)
  const mode = inlinePdfLike ? 'pdf' : inlineImageLike ? 'image' : 'download'
  return res.json({ success: true, data: { documentId: doc.id, mode, source: doc.source, filePath: doc.filePath }, meta: {} })
}

export async function restoreDocumentVersion(_req, res) {
  const workspaceId = resolveWorkspaceId(_req)
  if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
  const result = await restoreVersion({
    documentId: _req.params.id,
    versionId: _req.params.versionId,
    workspaceId,
  })
  if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document version not found' } })
  if (result === 'MISMATCH') return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Version does not belong to this document lineage' } })
  return res.json({ success: true, data: result, meta: {} })
}

export async function listVersions(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const rows = await listDocumentVersions({ documentId: req.params.id, workspaceId })
    if (!rows) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function createDocumentShareLink(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const recipientEmail = String(req.body?.recipientEmail || '').trim().toLowerCase()
    if (!recipientEmail) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'recipientEmail is required' } })
    const row = await createDocumentShare({ documentId: req.params.id, workspaceId, recipientEmail })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function listDocumentShareLinks(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    const rows = await listDocumentShares({ documentId: req.params.id, workspaceId })
    if (!rows) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function requestDocumentESign(_req, res) {
  return res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'E-sign provider adapter scaffolded. Plug Digio/Leegality/SignDesk API here.' },
  })
}
