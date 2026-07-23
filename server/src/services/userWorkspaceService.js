import { Op } from 'sequelize'
import { UserWorkspace, Workspace, CompanyRole } from '../models/index.js'
import { resolveListWorkspaceFilterId } from '../utils/resolveListWorkspaceFilter.js'

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

/**
 * Workspace IDs a list query should scope to. When the request selects a single
 * workspace (via `x-workspace-id` header or `workspaceId` query), narrow to just
 * that one (after validating access); otherwise return all allowed workspaces.
 * Mirrors the scoping used for the leads list so tasks/activities don't leak
 * across workspaces. Throws 403 if the selected workspace isn't accessible.
 */
export async function scopedWorkspaceIdsForRequest(req) {
  const allowed = await allowedWorkspaceIdsForUser(req.user)
  const selected = resolveListWorkspaceFilterId(req)
  if (!selected) return allowed
  if (
    !req.user.isCompanyAdmin &&
    allowed.length &&
    !allowed.includes(String(selected))
  ) {
    const err = new Error('You do not have access to this workspace')
    err.status = 403
    err.code = 'FORBIDDEN'
    err.publicMessage = 'You do not have access to this workspace'
    throw err
  }
  return [String(selected)]
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

/** Sets/clears the role override for one specific (userId, workspaceId) membership. Throws
 * 400 if the user isn't a member of that workspace — the override has nothing to attach to. */
export async function setWorkspaceRoleOverride({ userId, workspaceId, companyRoleId, transaction }) {
  const membership = await UserWorkspace.findOne({ where: { userId, workspaceId }, transaction })
  if (!membership) {
    const err = new Error('Not a workspace member')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'User is not a member of that workspace'
    throw err
  }
  membership.companyRoleId = companyRoleId
  await membership.save({ transaction })
  return membership.companyRoleId
}

/** Batched lookup of each user's role override for one workspace, for list/detail display. */
export async function getWorkspaceRoleOverrides({ userIds, workspaceId }) {
  const uniqueUserIds = dedupeIds(userIds)
  const map = new Map()
  if (!uniqueUserIds.length || !workspaceId) return map

  const rows = await UserWorkspace.findAll({
    where: { userId: { [Op.in]: uniqueUserIds }, workspaceId, companyRoleId: { [Op.ne]: null } },
    attributes: ['userId'],
    include: [{ model: CompanyRole, as: 'companyRoleOverride', attributes: ['id', 'name', 'userRoleKind', 'roleNo'] }],
  })
  for (const row of rows) {
    if (row.companyRoleOverride) map.set(row.userId, row.companyRoleOverride)
  }
  return map
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
