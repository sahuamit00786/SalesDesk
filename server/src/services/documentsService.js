import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Op, QueryTypes } from 'sequelize'
import { Document, DocumentFolderLink, DocumentLink, DocumentShare, Folder, Lead, Company, User, sequelize } from '../models/index.js'

const DOCUMENT_TYPE_SET = new Set(['Contract', 'NDA', 'Proposal', 'Invoice', 'Presentation', 'Image', 'Other'])
const LINK_ENTITY_SET = new Set(['lead', 'contact', 'company', 'deal'])

function getUploadsRoot() {
  return path.resolve(process.cwd(), 'uploads', 'documents')
}

function safeFileName(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180)
}

export function parseLinks(input) {
  if (!input) return []
  let parsed = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((item) => item && LINK_ENTITY_SET.has(item.entityType) && item.entityId)
    .map((item) => ({ entityType: item.entityType, entityId: item.entityId }))
}

export async function saveFileToStorage({ fileBuffer, originalName, workspaceId }) {
  const root = getUploadsRoot()
  const dir = path.join(root, workspaceId)
  await mkdir(dir, { recursive: true })
  const safeOriginal = safeFileName(originalName)
  const fileName = `${Date.now()}_${randomUUID()}_${safeOriginal}`
  const absolutePath = path.join(dir, fileName)
  await writeFile(absolutePath, fileBuffer)
  return `/uploads/documents/${workspaceId}/${fileName}`
}

function normalizeDescription(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  return s.slice(0, 8000)
}

export async function createDocumentWithLinks({
  file,
  name,
  fileType,
  description = null,
  workspaceId,
  uploadedBy,
  folderId,
  links,
  source = 'manual',
  folderIds = [],
}) {
  const filePath = await saveFileToStorage({
    fileBuffer: file.buffer,
    originalName: file.originalname,
    workspaceId,
  })

  const latestVersion = await Document.findOne({
    where: { workspaceId, folderId: folderId || null, name, isCurrent: true },
    order: [['version', 'DESC']],
  })
  const nextVersion = latestVersion ? latestVersion.version + 1 : 1
  if (latestVersion) {
    latestVersion.isCurrent = false
    await latestVersion.save()
  }

  const row = await Document.create({
    name,
    description: normalizeDescription(description),
    fileType,
    fileSize: file.size || 0,
    filePath,
    uploadedBy,
    workspaceId,
    folderId: folderId || null,
    source,
    version: nextVersion,
    isCurrent: true,
  })

  if (Array.isArray(links) && links.length) {
    await DocumentLink.bulkCreate(
      links.map((link) => ({ ...link, documentId: row.id })),
      { ignoreDuplicates: true },
    )
  }

  const normalizedFolderIds = [...new Set((folderIds || []).filter(Boolean))]
  if (normalizedFolderIds.length) {
    await DocumentFolderLink.bulkCreate(
      normalizedFolderIds.map((folderId) => ({ documentId: row.id, folderId })),
      { ignoreDuplicates: true },
    )
  } else if (folderId) {
    await DocumentFolderLink.findOrCreate({
      where: { documentId: row.id, folderId },
      defaults: { documentId: row.id, folderId },
    })
  }

  return row
}

function intersectIds(a, b) {
  const setB = new Set(b)
  return a.filter((id) => setB.has(id))
}

/** Map document Sequelize rows to API payloads (link entity names). */
async function enrichDocumentRows(documents) {
  if (!documents.length) return []
  const entityPairs = []
  for (const doc of documents) {
    for (const link of doc.links || []) {
      entityPairs.push(`${link.entityType}:${link.entityId}`)
    }
  }
  const uniquePairs = [...new Set(entityPairs)]
  const leadIds = uniquePairs.filter((k) => k.startsWith('lead:')).map((k) => k.slice(5))
  const companyIds = uniquePairs.filter((k) => k.startsWith('company:')).map((k) => k.slice(8))

  const [leads, companies] = await Promise.all([
    leadIds.length ? Lead.findAll({ where: { id: leadIds }, attributes: ['id', 'contactName', 'company'] }) : [],
    companyIds.length ? Company.findAll({ where: { id: companyIds }, attributes: ['id', 'name'] }) : [],
  ])
  const leadMap = new Map(leads.map((lead) => [lead.id, lead.contactName || lead.company || 'Lead']))
  const companyMap = new Map(companies.map((company) => [company.id, company.name]))

  return documents.map((doc) => {
    const payload = doc.toJSON()
    payload.links = (payload.links || []).map((link) => {
      let entityName = link.entityId
      if (link.entityType === 'lead') entityName = leadMap.get(link.entityId) || entityName
      if (link.entityType === 'company') entityName = companyMap.get(link.entityId) || entityName
      return { ...link, entityName }
    })
    return payload
  })
}

export async function listDocuments({ workspaceId, filters }) {
  const where = { workspaceId }
  if (filters?.fileType) where.fileType = filters.fileType
  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {}
    if (filters.fromDate) where.createdAt[Op.gte] = new Date(filters.fromDate)
    if (filters.toDate) where.createdAt[Op.lte] = new Date(filters.toDate)
  }

  let idFilter = null
  if (filters?.folderId) {
    const folderLinks = await DocumentFolderLink.findAll({
      attributes: ['documentId'],
      where: { folderId: filters.folderId },
    })
    const folderDocIds = [...new Set(folderLinks.map((row) => row.documentId))]
    if (!folderDocIds.length) return []
    idFilter = folderDocIds
  }
  if (filters?.leadId) {
    const leadLinkedRows = await DocumentLink.findAll({
      attributes: ['documentId'],
      where: { entityType: 'lead', entityId: filters.leadId },
    })
    const leadDocIds = [...new Set(leadLinkedRows.map((row) => row.documentId))]
    if (!leadDocIds.length) return []
    idFilter = idFilter ? intersectIds(idFilter, leadDocIds) : leadDocIds
    if (!idFilter.length) return []
  }
  if (String(filters?.unlinked || '').toLowerCase() === 'true') {
    const leadLinkedRows = await DocumentLink.findAll({
      attributes: ['documentId'],
      where: { entityType: 'lead' },
      include: [{
        model: Document,
        as: 'document',
        attributes: [],
        where: { workspaceId },
        required: true,
      }],
    })
    const linkedIds = new Set(leadLinkedRows.map((row) => row.documentId))
    const allInWorkspace = await Document.findAll({ attributes: ['id'], where: { workspaceId } })
    const unlinkedIds = allInWorkspace.map((d) => d.id).filter((id) => !linkedIds.has(id))
    if (!unlinkedIds.length) return []
    idFilter = idFilter ? intersectIds(idFilter, unlinkedIds) : unlinkedIds
    if (!idFilter.length) return []
  }
  if (filters?.companyId) {
    const companyLinkedRows = await DocumentLink.findAll({
      attributes: ['documentId'],
      where: { entityType: 'company', entityId: filters.companyId },
    })
    const companyDocIds = [...new Set(companyLinkedRows.map((row) => row.documentId))]
    if (!companyDocIds.length) return []
    idFilter = idFilter ? intersectIds(idFilter, companyDocIds) : companyDocIds
    if (!idFilter.length) return []
  }
  if (idFilter) {
    where.id = { [Op.in]: idFilter }
  }

  const documents = await Document.findAll({
    where,
    include: [
      { model: DocumentLink, as: 'links' },
      { model: DocumentFolderLink, as: 'folderLinks', include: [{ model: Folder, as: 'folder' }] },
      { model: User, as: 'uploader', attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  })

  return enrichDocumentRows(documents)
}

export async function getDocumentApiPayload({ id, workspaceId }) {
  const doc = await Document.findOne({
    where: { id, workspaceId },
    include: [
      { model: DocumentLink, as: 'links' },
      { model: DocumentFolderLink, as: 'folderLinks', include: [{ model: Folder, as: 'folder' }] },
      { model: User, as: 'uploader', attributes: ['id', 'name', 'email'] },
    ],
  })
  if (!doc) return null
  const rows = await enrichDocumentRows([doc])
  return rows[0] || null
}

/** Returns leads that have at least one document linked (workspace-scoped). */
export async function listLeadDocumentSummaries({ workspaceId }) {
  const rows = await sequelize.query(
    `
    SELECT
      l.id AS id,
      COALESCE(NULLIF(TRIM(MAX(l.contact_name)), ''), NULLIF(TRIM(MAX(l.company)), ''), 'Untitled lead') AS name,
      MAX(NULLIF(TRIM(l.email), '')) AS email,
      COUNT(DISTINCT dl.document_id) AS documentCount,
      COALESCE(SUM(d.file_size), 0) AS totalFileBytes,
      MAX(d.created_at) AS lastDocumentAt
    FROM document_links dl
    INNER JOIN documents d ON d.id = dl.document_id AND d.workspace_id = :workspaceId
    INNER JOIN leads l ON l.id = dl.entity_id AND dl.entity_type = 'lead'
    WHERE l.workspace_id = :workspaceId AND l.is_deleted = 0
    GROUP BY l.id
    HAVING COUNT(DISTINCT dl.document_id) > 0
    ORDER BY lastDocumentAt DESC
    `,
    { replacements: { workspaceId }, type: QueryTypes.SELECT },
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: String(r.email ?? r.Email ?? '').trim(),
    documentCount: Number(r.documentCount) || 0,
    totalFileBytes: Number(r.totalFileBytes ?? r.totalfilebytes) || 0,
    lastDocumentAt: r.lastDocumentAt,
  }))
}

/** Patch name, description, and/or fileType. Returns enriched payload or null if not found; 'BAD_TYPE' if invalid fileType. */
export async function patchDocumentMetadata({ id, workspaceId, name, description, fileType }) {
  const doc = await Document.findOne({ where: { id, workspaceId } })
  if (!doc) return null
  const updates = {}
  if (name !== undefined) {
    const t = String(name).trim()
    if (!t) return 'BAD_NAME'
    updates.name = t.slice(0, 255)
  }
  if (description !== undefined) {
    updates.description = normalizeDescription(description)
  }
  if (fileType !== undefined) {
    if (!isValidDocumentType(String(fileType).trim())) return 'BAD_TYPE'
    updates.fileType = String(fileType).trim()
  }
  if (!Object.keys(updates).length) {
    return getDocumentApiPayload({ id, workspaceId })
  }
  await doc.update(updates)
  return getDocumentApiPayload({ id, workspaceId })
}

export async function getFolderTree({ workspaceId }) {
  const [manualFolders, leads, companies] = await Promise.all([
    Folder.findAll({ where: { workspaceId }, order: [['createdAt', 'ASC']] }),
    Lead.findAll({ where: { workspaceId, isDeleted: false }, attributes: ['id', 'contactName'] }),
    Company.findAll({ attributes: ['id', 'name'] }),
  ])

  return {
    roots: [
      {
        id: 'auto-leads-root',
        name: 'Leads',
        type: 'auto',
        children: leads.map((lead) => ({ id: `auto-lead-${lead.id}`, name: lead.contactName || 'Untitled Lead', entityType: 'lead', entityId: lead.id })),
      },
      {
        id: 'auto-companies-root',
        name: 'Companies',
        type: 'auto',
        children: companies.map((company) => ({ id: `auto-company-${company.id}`, name: company.name, entityType: 'company', entityId: company.id })),
      },
      { id: 'auto-contacts-root', name: 'Contacts', type: 'auto', children: [] },
      { id: 'auto-unlinked-root', name: 'Unlinked', type: 'auto', children: [] },
    ],
    manualFolders: manualFolders.map((folder) => folder.toJSON()),
  }
}

export async function addDocumentLinks({ documentId, links }) {
  await DocumentLink.bulkCreate(
    links.map((link) => ({ ...link, documentId })),
    { ignoreDuplicates: true },
  )
  return DocumentLink.findAll({ where: { documentId } })
}

export async function addDocumentFolders({ documentId, folderIds }) {
  const uniqueFolderIds = [...new Set((folderIds || []).filter(Boolean))]
  if (!uniqueFolderIds.length) return []
  await DocumentFolderLink.bulkCreate(
    uniqueFolderIds.map((folderId) => ({ documentId, folderId })),
    { ignoreDuplicates: true },
  )
  return DocumentFolderLink.findAll({
    where: { documentId },
    include: [{ model: Folder, as: 'folder' }],
  })
}

export async function listDocumentVersions({ documentId, workspaceId }) {
  const baseDoc = await Document.findOne({ where: { id: documentId, workspaceId } })
  if (!baseDoc) return null
  const rows = await Document.findAll({
    where: {
      workspaceId,
      name: baseDoc.name,
      folderId: baseDoc.folderId || null,
    },
    include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
    order: [['version', 'DESC'], ['createdAt', 'DESC']],
  })
  return rows
}

export async function restoreVersion({ documentId, versionId, workspaceId }) {
  const [baseDoc, target] = await Promise.all([
    Document.findOne({ where: { id: documentId, workspaceId } }),
    Document.findOne({ where: { id: versionId, workspaceId } }),
  ])
  if (!baseDoc || !target) return null
  if (baseDoc.name !== target.name || (baseDoc.folderId || null) !== (target.folderId || null)) return 'MISMATCH'

  await sequelize.transaction(async (tx) => {
    await Document.update(
      { isCurrent: false },
      {
        where: {
          workspaceId,
          name: baseDoc.name,
          folderId: baseDoc.folderId || null,
        },
        transaction: tx,
      },
    )
    target.isCurrent = true
    await target.save({ transaction: tx })
  })

  return target
}

export async function createDocumentShare({ documentId, workspaceId, recipientEmail }) {
  const doc = await Document.findOne({ where: { id: documentId, workspaceId } })
  if (!doc) return null
  const token = randomUUID().replaceAll('-', '')
  const row = await DocumentShare.create({
    documentId: doc.id,
    recipientEmail,
    token,
  })
  return row
}

export async function listDocumentShares({ documentId, workspaceId }) {
  const doc = await Document.findOne({ where: { id: documentId, workspaceId } })
  if (!doc) return null
  return DocumentShare.findAll({ where: { documentId }, order: [['sentAt', 'DESC']] })
}

export function isValidDocumentType(fileType) {
  return DOCUMENT_TYPE_SET.has(fileType)
}

export function isValidLinks(links) {
  return Array.isArray(links) && links.every((link) => LINK_ENTITY_SET.has(link.entityType) && link.entityId)
}

