import { Workspace } from '../models/index.js'

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
    if (existing.name !== desiredName) {
      await existing.update({ name: desiredName }, { transaction })
    }
    return existing
  }

  return Workspace.create(
    {
      companyId: company.id,
      name: desiredName,
    },
    { transaction },
  )
}
