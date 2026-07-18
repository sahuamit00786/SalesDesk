import { Op } from 'sequelize'
import { UserWorkspace, Workspace } from '../models/index.js'
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

/**
 * Management-write guard: non-company-admins may only assign/invite users into
 * workspaces they themselves belong to. Throws 403 listing nothing about which
 * workspaces exist outside the actor's scope.
 */
export async function assertWorkspacesWithinActorScope(actorUser, workspaceIds) {
  if (actorUser?.isCompanyAdmin) return
  const ids = dedupeIds(workspaceIds).map(String)
  if (!ids.length) return
  const allowed = (await allowedWorkspaceIdsForUser(actorUser)).map(String)
  const outside = ids.filter((id) => !allowed.includes(id))
  if (outside.length) {
    const err = new Error('Forbidden')
    err.status = 403
    err.code = 'WORKSPACE_SCOPE'
    err.publicMessage = 'You can only assign workspaces you belong to'
    throw err
  }
}

/** True when actor and target share at least one workspace (company admin always passes). */
export async function actorSharesWorkspaceWithUser(actorUser, targetUserId) {
  if (actorUser?.isCompanyAdmin) return true
  const [mine, theirs] = await Promise.all([
    allowedWorkspaceIdsForUser(actorUser),
    listWorkspaceIdsForUser(targetUserId),
  ])
  const mineSet = new Set(mine.map(String))
  return theirs.some((id) => mineSet.has(String(id)))
}

/**
 * Assignment guard: every given user must be a member of EVERY given workspace.
 * Used before assigning leads/tasks so records can never point at users who
 * can't even see the workspace they live in. Throws 400 with the offending
 * users left unnamed (no information leak about other workspaces' staff).
 */
export async function assertUsersMembersOfWorkspaces(userIds, workspaceIds, publicMessage) {
  const uids = dedupeIds(userIds).map(String)
  const wids = dedupeIds(workspaceIds).map(String)
  if (!uids.length || !wids.length) return
  const rows = await UserWorkspace.findAll({
    where: { userId: { [Op.in]: uids }, workspaceId: { [Op.in]: wids } },
    attributes: ['userId', 'workspaceId'],
    raw: true,
  })
  const memberships = new Set(rows.map((r) => `${r.userId}::${r.workspaceId}`))
  for (const uid of uids) {
    for (const wid of wids) {
      if (!memberships.has(`${uid}::${wid}`)) {
        const err = new Error('Invalid assignment')
        err.status = 400
        err.code = 'ASSIGNEE_WORKSPACE'
        err.publicMessage = publicMessage || 'Assignee must be a member of the lead\'s workspace'
        throw err
      }
    }
  }
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
