import { Op } from 'sequelize'
import { UserWorkspace, Workspace } from '../models/index.js'

function dedupeIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))]
}

export async function listWorkspaceIdsForUser(userId) {
  const rows = await UserWorkspace.findAll({
    where: { userId },
    attributes: ['workspaceId'],
  })
  return dedupeIds(rows.map((r) => r.workspaceId))
}

export async function allowedWorkspaceIdsForUser(user) {
  if (!user?.companyId) return []
  if (user.isCompanyAdmin) {
    const all = await Workspace.findAll({
      where: { companyId: user.companyId },
      attributes: ['id'],
    })
    return dedupeIds(all.map((w) => w.id))
  }
  return listWorkspaceIdsForUser(user.id)
}

/** Add workspaces without removing existing memberships (same user row in DB). */
export async function addWorkspaceMembershipsForUser({ userId, companyId, workspaceIds, transaction }) {
  const uniqueIds = dedupeIds(workspaceIds)
  if (!uniqueIds.length) return listWorkspaceIdsForUser(userId)

  const valid = await Workspace.findAll({
    where: {
      id: { [Op.in]: uniqueIds },
      companyId,
    },
    attributes: ['id'],
    transaction,
  })
  const validIds = dedupeIds(valid.map((w) => w.id))
  if (validIds.length !== uniqueIds.length) {
    const err = new Error('Invalid workspace assignment')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'All workspaceIds must belong to your company'
    throw err
  }

  const existing = await UserWorkspace.findAll({
    where: { userId },
    attributes: ['workspaceId'],
    transaction,
  })
  await UserWorkspace.bulkCreate(
    validIds.map((workspaceId) => ({ userId, workspaceId })),
    { ignoreDuplicates: true, transaction },
  )
  return dedupeIds([...existing.map((r) => r.workspaceId), ...validIds])
}

export async function setWorkspaceMembershipsForUser({ userId, companyId, workspaceIds, transaction }) {
  const uniqueIds = dedupeIds(workspaceIds)
  if (!uniqueIds.length) {
    await UserWorkspace.destroy({ where: { userId }, transaction })
    return []
  }

  const valid = await Workspace.findAll({
    where: {
      id: { [Op.in]: uniqueIds },
      companyId,
    },
    attributes: ['id'],
    transaction,
  })
  const validIds = dedupeIds(valid.map((w) => w.id))
  if (validIds.length !== uniqueIds.length) {
    const err = new Error('Invalid workspace assignment')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'All workspaceIds must belong to your company'
    throw err
  }

  await UserWorkspace.destroy({ where: { userId }, transaction })
  await UserWorkspace.bulkCreate(
    validIds.map((workspaceId) => ({ userId, workspaceId })),
    { transaction },
  )
  return validIds
}

/** Resolves the workspace to attribute a background/cron-created row to for a given user:
 * their oldest workspace membership, falling back to the company's oldest workspace. */
export async function getPrimaryWorkspaceIdForUser(userId, companyId) {
  const membership = await UserWorkspace.findOne({
    where: { userId },
    order: [['createdAt', 'ASC']],
    attributes: ['workspaceId'],
  })
  if (membership) return membership.workspaceId

  const fallback = await Workspace.findOne({
    where: { companyId },
    order: [['createdAt', 'ASC']],
    attributes: ['id'],
  })
  return fallback ? fallback.id : null
}

export async function hydrateWorkspaceSummaryForUsers(userIds) {
  const uniqueUserIds = dedupeIds(userIds)
  if (!uniqueUserIds.length) return new Map()

  const rows = await UserWorkspace.findAll({
    where: { userId: { [Op.in]: uniqueUserIds } },
    attributes: ['userId'],
    include: [{ model: Workspace, as: 'workspace', attributes: ['id', 'name', 'archivedAt'] }],
    order: [[{ model: Workspace, as: 'workspace' }, 'createdAt', 'ASC']],
  })

  const map = new Map()
  for (const row of rows) {
    const list = map.get(row.userId) || []
    if (row.workspace) {
      list.push({
        id: row.workspace.id,
        name: row.workspace.name,
        archived: Boolean(row.workspace.archivedAt),
      })
    }
    map.set(row.userId, list)
  }
  return map
}
