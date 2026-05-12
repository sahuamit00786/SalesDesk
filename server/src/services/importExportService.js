import { Op } from 'sequelize'
import { Lead, OpportunityStage, Tag, User } from '../models/index.js'
import { findDuplicates } from './duplicateDetectionService.js'
import { recalculateScore } from './leadScoringService.js'
import { createLeadSystemActivity } from './leadSystemActivity.js'

export async function importLeads(workspaceId, companyId, userId, rows) {
  const results = { imported: 0, skipped: 0, errors: [], createdLeadIds: [] }
  const defStage =
    (await OpportunityStage.findOne({
      where: { workspaceId, companyId, isDefault: true },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })) ||
    (await OpportunityStage.findOne({
      where: { workspaceId, companyId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    }))
  const defaultPipeline = defStage?.name || 'Lead Inbound'
  for (const [idx, row] of (rows || []).entries()) {
    try {
      const dupes = await findDuplicates(workspaceId, { email: row.email, phone: row.phone })
      if (dupes.length) {
        results.skipped += 1
        continue
      }
      const lead = await Lead.create({
        title: row.title || row.contactName || 'Untitled lead',
        contactName: row.contactName || null,
        company: row.company || null,
        email: row.email || null,
        phone: row.phone || null,
        value: row.value || 0,
        status: row.status || 'new',
        source: 'csv_import',
        ownerUserId: userId,
        assignedTo: row.assignedTo || null,
        companyId,
        workspaceId,
        opportunityStage: String(row.opportunityStage || '').trim() || defaultPipeline,
      })
      await recalculateScore(lead.id)
      results.createdLeadIds.push(lead.id)
      await createLeadSystemActivity({
        leadId: lead.id,
        userId,
        body: 'Lead imported from CSV',
        metadata: { action: 'lead_imported_csv', source: 'csv_import' },
      })
      results.imported += 1
    } catch (err) {
      results.errors.push({ row: idx + 1, message: err.message })
    }
  }
  return results
}

export async function exportLeads(workspaceId, filters = {}, ids = null) {
  const where = {
    workspaceId,
    isDeleted: false,
  }
  if (filters.status?.length) where.status = { [Op.in]: filters.status }
  if (filters.source?.length) where.source = { [Op.in]: filters.source }
  if (ids?.length) where.id = { [Op.in]: ids }
  const iso = String(filters.isOpportunity ?? '').toLowerCase()
  if (iso === 'true' || iso === '1') where.isOpportunity = true
  if (iso === 'false' || iso === '0') where.isOpportunity = false

  const leads = await Lead.findAll({
    where,
    include: [
      { model: Tag, as: 'tags', through: { attributes: [] }, required: false },
      { model: User, as: 'assignee', attributes: ['name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
  })

  return leads.map((l) => ({
    Name: l.contactName || l.title || '',
    Company: l.company || '',
    Email: l.email || '',
    Phone: l.phone || '',
    Status: l.status,
    PipelineStatus: l.opportunityStage || '',
    Source: l.source,
    Score: l.score,
    Value: l.value,
    AssignedTo: l.assignee?.name || '',
    Tags: (l.tags || []).map((t) => t.name).join(', '),
    CreatedAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
  }))
}
