import { Workspace, UserWorkspace } from '../models/index.js'
import { ensureLibrarySalesDocTemplates } from './defaultSalesDocTemplates.js'
import {
  DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR,
  DEFAULT_WORKSPACE_THEME_COLOR,
} from '../constants/workspaceDefaults.js'

const SUFFIX = ' workspace'
const MAX_LEN = 240

/**
 * Default workspace label: "{Company name} workspace" (truncated if needed).
 * @param {string | null | undefined} companyName
 */
export function buildDefaultWorkspaceName(companyName) {
  const base = String(companyName ?? '').trim()
  const full = base ? `${base}${SUFFIX}` : 'Workspace'
  if (full.length <= MAX_LEN) return full
  const budget = Math.max(0, MAX_LEN - SUFFIX.length)
  return `${base.slice(0, budget)}${SUFFIX}`.slice(0, MAX_LEN)
}

/**
 * Ensures the company has a primary workspace row and its name matches the company name pattern.
 * @param {import('sequelize').Model & { id: string, name: string }} company
 * @param {{ transaction?: import('sequelize').Transaction }} [opts]
 */
export async function ensureCompanyWorkspace(company, opts = {}) {
  const { transaction } = opts
  const desiredName = buildDefaultWorkspaceName(company.name)

  const existing = await Workspace.findOne({
    where: { companyId: company.id },
    order: [['createdAt', 'ASC']],
    transaction,
  })

  if (existing) {
    const patch = {}
    if (existing.name !== desiredName) patch.name = desiredName
    if (!existing.themeColor) patch.themeColor = DEFAULT_WORKSPACE_THEME_COLOR
    if (!existing.sidebarTextColor) patch.sidebarTextColor = DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR
    // Onboarding hasn't finished: workspace currency still follows the company pick,
    // since the workspace was auto-created before the user chose one.
    if (!company.onboardingCompletedAt && company.baseCurrency && existing.defaultCurrency !== company.baseCurrency) {
      patch.defaultCurrency = company.baseCurrency
    }
    if (Object.keys(patch).length) await existing.update(patch, { transaction })
    return existing
  }

  const created = await Workspace.create(
    {
      companyId: company.id,
      name: desiredName,
      defaultCurrency: company.baseCurrency ?? 'USD',
      themeColor: DEFAULT_WORKSPACE_THEME_COLOR,
      sidebarTextColor: DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR,
    },
    { transaction },
  )
  await ensureLibrarySalesDocTemplates(
    { workspaceId: created.id, companyId: company.id },
    { transaction },
  )
  return created
}

/**
 * Best-effort workspace to attach to a notification/reminder that has no natural workspace
 * of its own (company-wide digests, "general" reminders, orphan-call activity). Mirrors the
 * fallback the notifications.workspace_id NOT-NULL backfill migration used: the user's
 * earliest workspace membership, else the company's earliest workspace. Returns null only if
 * the company genuinely has no workspace yet (shouldn't happen post-onboarding).
 */
export async function resolveDefaultWorkspaceIdForUser(userId, companyId) {
  if (userId) {
    const membership = await UserWorkspace.findOne({
      where: { userId },
      order: [['createdAt', 'ASC']],
      attributes: ['workspaceId'],
    })
    if (membership?.workspaceId) return membership.workspaceId
  }
  if (companyId) {
    const workspace = await Workspace.findOne({
      where: { companyId },
      order: [['createdAt', 'ASC']],
      attributes: ['id'],
    })
    if (workspace?.id) return workspace.id
  }
  return null
}
