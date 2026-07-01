import { Document, DocumentFolderLink, DocumentLink, Folder } from '../models/index.js'
import { Op } from 'sequelize'
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

export async function deleteDocument(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const row = await Document.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })
    await row.destroy()
    return res.json({ success: true, meta: {} })
  } catch (e) {
    return next(e)
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
    const workspaceId = resolveWorkspaceId(req)
    const row = await Document.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
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

export async function removeDocumentFolder(req, res, next) {
  try {
    const { id, folderId } = req.params
    await DocumentFolderLink.destroy({ where: { documentId: id, folderId } })
    return res.json({ success: true, meta: {} })
  } catch (e) {
    return next(e)
  }
}

// Atomic move: add to toFolderId AND remove from fromFolderId in one request
export async function moveDocumentFolder(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const { id } = req.params
    const { fromFolderId, toFolderId } = req.body || {}
    if (!toFolderId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'toFolderId is required' } })

    const doc = await Document.findOne({ where: { id, workspaceId, companyId: req.user.companyId } })
    if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } })

    // Link to new folder
    await DocumentFolderLink.findOrCreate({
      where: { documentId: id, folderId: toFolderId },
      defaults: { documentId: id, folderId: toFolderId },
    })

    // Unlink from old folder
    if (fromFolderId && fromFolderId !== toFolderId) {
      await DocumentFolderLink.destroy({ where: { documentId: id, folderId: fromFolderId } })
    }

    return res.json({ success: true, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function linkDocumentFolders(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const row = await Document.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
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
  const workspaceId = resolveWorkspaceId(req)
  const doc = await Document.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
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

// Collect a folder id + all descendant folder ids recursively
async function collectFolderIds(rootId, workspaceId, maxDepth = 20) {
  const all = [rootId]
  let queue = [rootId]
  const visited = new Set([rootId])
  let depth = 0
  while (queue.length && depth < maxDepth) {
    const children = await Folder.findAll({
      attributes: ['id'],
      where: { parentFolderId: queue, workspaceId },
    })
    const childIds = children.map((f) => f.id).filter((id) => !visited.has(id))
    childIds.forEach((id) => visited.add(id))
    all.push(...childIds)
    queue = childIds
    depth++
  }
  return all
}

export async function getFolderInfo(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const { id } = req.params
    const folder = await Folder.findOne({ where: { id, workspaceId } })
    if (!folder) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Folder not found' } })

    const allFolderIds = await collectFolderIds(id, workspaceId)
    const subfolderCount = allFolderIds.length - 1

    const links = await DocumentFolderLink.findAll({ attributes: ['documentId'], where: { folderId: allFolderIds } })
    const fileCount = new Set(links.map((l) => l.documentId)).size

    return res.json({ success: true, data: { fileCount, subfolderCount }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteFolderWithContents(req, res, next) {
  try {
    const workspaceId = resolveWorkspaceId(req)
    const { id } = req.params
    const folder = await Folder.findOne({ where: { id, workspaceId } })
    if (!folder) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Folder not found' } })

    const allFolderIds = await collectFolderIds(id, workspaceId)

    // Find all docs linked to these folders
    const folderLinks = await DocumentFolderLink.findAll({ attributes: ['documentId'], where: { folderId: allFolderIds } })
    const docIds = [...new Set(folderLinks.map((l) => l.documentId))]

    let deletedDocs = 0
    if (docIds.length) {
      // Docs with entity links (lead, company, etc.) — keep the doc but only remove folder link
      const entityLinked = await DocumentLink.findAll({ attributes: ['documentId'], where: { documentId: docIds } })
      const entityLinkedSet = new Set(entityLinked.map((l) => l.documentId))

      // Docs linked to folders OUTSIDE the deleted set — keep those docs too
      const otherFolderLinks = await DocumentFolderLink.findAll({
        attributes: ['documentId'],
        where: { documentId: docIds, folderId: { [Op.notIn]: allFolderIds } },
      })
      const otherFolderSet = new Set(otherFolderLinks.map((l) => l.documentId))

      const toDelete = docIds.filter((docId) => !entityLinkedSet.has(docId) && !otherFolderSet.has(docId))
      if (toDelete.length) {
        await Document.destroy({ where: { id: toDelete } })
        deletedDocs = toDelete.length
      }
    }

    // Remove folder links for surviving docs
    await DocumentFolderLink.destroy({ where: { folderId: allFolderIds } })

    // Delete subfolders first (children before parent to avoid FK issues)
    await Folder.destroy({ where: { id: allFolderIds } })

    return res.json({ success: true, data: { deletedDocuments: deletedDocs }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
