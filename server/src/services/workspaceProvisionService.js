import { sequelize } from '../config/db.js'
import {
  DealStatus,
  LeadSource,
  OpportunityStage,
  PipelineStatus,
  Workspace,
} from '../models/index.js'
import {
  DEFAULT_DEAL_STATUSES,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_OPPORTUNITY_STAGES,
  DEFAULT_OPPORTUNITY_STATUSES,
  DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR,
  DEFAULT_WORKSPACE_THEME_COLOR,
} from '../constants/workspaceDefaults.js'

async function normalizeOpportunityStageOrder(workspaceId, companyId, transaction) {
  const rows = await OpportunityStage.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  for (let i = 0; i < rows.length; i += 1) {
    await rows[i].update({ sortOrder: i, isDefault: i === 0 }, { transaction })
  }
}

async function normalizeOpportunityStageDealStatusFlag(workspaceId, companyId, transaction, preferredId = null) {
  const rows = await OpportunityStage.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  if (!rows.length) return

  let winnerId = preferredId ? String(preferredId) : null
  if (!winnerId) {
    const existing = rows.find((row) => row.isDealStatus)
    winnerId = existing ? String(existing.id) : null
  }
  if (!winnerId) winnerId = String(rows[0].id)

  for (const row of rows) {
    const shouldBeDealStage = winnerId ? String(row.id) === winnerId : false
    if (Boolean(row.isDealStatus) !== shouldBeDealStage) {
      await row.update({ isDealStatus: shouldBeDealStage }, { transaction })
    }
  }
}

async function normalizeDealStatusOrder(workspaceId, companyId, transaction) {
  const rows = await DealStatus.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  for (let i = 0; i < rows.length; i += 1) {
    await rows[i].update({ sortOrder: i, isInitial: i === 0 }, { transaction })
  }
}

/**
 * Applies default theme + CRM statuses for a workspace (idempotent — skips existing rows).
 * @param {import('sequelize').Model} workspace
 * @param {{ id: string, baseCurrency?: string | null }} company
 * @param {{ transaction?: import('sequelize').Transaction }} [opts]
 */
export async function provisionWorkspace(workspace, company, opts = {}) {
  const run = async (transaction) => {
    const workspaceId = workspace.id
    const companyId = company.id
    const steps = []

    const themePatch = {}
    if (!workspace.themeColor) themePatch.themeColor = DEFAULT_WORKSPACE_THEME_COLOR
    if (!workspace.sidebarTextColor) themePatch.sidebarTextColor = DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR
    if (!workspace.defaultCurrency && company.baseCurrency) {
      themePatch.defaultCurrency = String(company.baseCurrency).toUpperCase()
    }
    if (Object.keys(themePatch).length) {
      await workspace.update(themePatch, { transaction })
      steps.push({ id: 'theme', label: 'Applying workspace theme' })
    } else {
      steps.push({ id: 'theme', label: 'Workspace theme ready', skipped: true })
    }

    const sourceCount = await LeadSource.count({ where: { workspaceId, companyId }, transaction })
    if (sourceCount === 0) {
      await LeadSource.bulkCreate(
        DEFAULT_LEAD_SOURCES.map((name) => ({ name, workspaceId, companyId, isActive: true })),
        { transaction },
      )
      steps.push({ id: 'sources', label: 'Lead sources configured', count: DEFAULT_LEAD_SOURCES.length })
    } else {
      steps.push({ id: 'sources', label: 'Lead sources ready', skipped: true })
    }

    const oppStageCount = await OpportunityStage.count({ where: { workspaceId, companyId }, transaction })
    if (oppStageCount === 0) {
      await OpportunityStage.bulkCreate(
        DEFAULT_OPPORTUNITY_STAGES.map((s) => ({ ...s, workspaceId, companyId })),
        { transaction },
      )
      steps.push({ id: 'pipeline', label: 'Pipeline stages created', count: DEFAULT_OPPORTUNITY_STAGES.length })
    } else {
      steps.push({ id: 'pipeline', label: 'Pipeline stages ready', skipped: true })
    }
    await normalizeOpportunityStageOrder(workspaceId, companyId, transaction)
    await normalizeOpportunityStageDealStatusFlag(workspaceId, companyId, transaction)

    const dealStatusCount = await DealStatus.count({ where: { workspaceId, companyId }, transaction })
    if (dealStatusCount === 0) {
      await DealStatus.bulkCreate(
        DEFAULT_DEAL_STATUSES.map((s) => ({ ...s, workspaceId, companyId })),
        { transaction },
      )
      steps.push({ id: 'deals', label: 'Deal statuses created', count: DEFAULT_DEAL_STATUSES.length })
    } else {
      steps.push({ id: 'deals', label: 'Deal statuses ready', skipped: true })
    }
    await normalizeDealStatusOrder(workspaceId, companyId, transaction)

    const pipelineStatusCount = await PipelineStatus.count({ where: { workspaceId, companyId }, transaction })
    if (pipelineStatusCount === 0) {
      await PipelineStatus.bulkCreate(
        DEFAULT_OPPORTUNITY_STATUSES.map((s) => ({ ...s, workspaceId, companyId })),
        { transaction },
      )
      steps.push({ id: 'opportunities', label: 'Pipeline statuses created', count: DEFAULT_OPPORTUNITY_STATUSES.length })
    } else {
      steps.push({ id: 'opportunities', label: 'Pipeline statuses ready', skipped: true })
    }

    steps.push({ id: 'finalize', label: 'Finalizing workspace' })

    await workspace.reload({ transaction })
    return {
      workspaceId,
      themeColor: workspace.themeColor,
      sidebarTextColor: workspace.sidebarTextColor,
      steps,
    }
  }

  if (opts.transaction) return run(opts.transaction)
  return sequelize.transaction(run)
}

export async function provisionPrimaryWorkspaceForCompany(company, opts = {}) {
  const workspace = await Workspace.findOne({
    where: { companyId: company.id },
    order: [['createdAt', 'ASC']],
    transaction: opts.transaction,
  })
  if (!workspace) {
    const err = new Error('No workspace found for company')
    err.status = 404
    err.code = 'NO_WORKSPACE'
    err.publicMessage = 'Workspace not found'
    throw err
  }
  return provisionWorkspace(workspace, company, opts)
}
