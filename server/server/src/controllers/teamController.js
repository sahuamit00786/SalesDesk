import bcrypt from 'bcrypt'
import { Op } from 'sequelize'
import {
  Company,
  CompanyRole,
  Invitation,
  Lead,
  MenuMaster,
  sequelize,
  Team,
  TeamMember,
  User,
  UserMenuPermission,
  Workspace,
} from '../models/index.js'
import { userAuthIncludes } from '../queries/userIncludes.js'
import { serializeUser } from '../serializers/userSerializer.js'
import { generateInvitePlainToken, hashInviteToken, inviteExpiresAt, verifyInviteToken } from '../services/inviteTokenService.js'
import { sendTeamInviteEmail } from '../services/mailService.js'
import { signAccessToken, signRefreshToken, refreshTokenPayloadForUser } from '../services/tokenService.js'
import {
  acceptInvitationSchema,
  previewInvitationSchema,
  createInvitationSchema,
  createCompanyRoleSchema,
  createTeamSchema,
  deactivateUserSchema,
  deleteCompanyRoleSchema,
  patchTeamSchema,
  patchCompanyRoleSchema,
  patchUserProfileSchema,
  patchUserRoleSchema,
  putUserMenuPermissionsSchema,
  replaceUserWorkspacesSchema,
  reassignLeadsSchema,
  teamMemberSchema,
} from '../validations/team.js'
import {
  allowedWorkspaceIdsForUser,
  hydrateWorkspaceSummaryForUsers,
  listWorkspaceIdsForUser,
  addWorkspaceMembershipsForUser,
  setWorkspaceMembershipsForUser,
  assertWorkspacesWithinActorScope,
  actorSharesWorkspaceWithUser,
} from '../services/userWorkspaceService.js'
import {
  rankOfUser,
  rankOfRoleKind,
  assertCanManageRoleKind,
  assertCanManageUser,
  creatableRoleKinds,
  ROLE_RANK,
} from '../services/roleHierarchy.js'
import { COMPANY_USER_ROLE_KIND_CREATE_VALUES } from '../constants/companyUserRoleKind.js'
import { UserWorkspace } from '../models/index.js'

function joiPublicMessages(error) {
  return error.details
    .map((d) => (d.context && typeof d.context.message === 'string' ? d.context.message : d.message))
    .join(', ')
}

function inviteAcceptBaseUrl() {
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
  return `${origin}/accept-invite`
}

function uniqueIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))]
}

const INVITE_PROFILE_KEYS = [
  'department',
  'jobTitle',
  'businessPhone',
  'whatsappNumber',
  'profilePhotoUrl',
  'street',
  'city',
  'country',
  'postalCode',
]

/** Persist only non-empty invite profile hints (stored JSON on Invitation). */
function buildInvitationProfilePrefill(body) {
  const out = {}
  if (typeof body.name === 'string' && body.name.trim()) {
    out.name = body.name.trim()
  }
  for (const k of INVITE_PROFILE_KEYS) {
    if (body[k] === undefined) continue
    const raw = body[k]
    if (raw == null || raw === '') continue
    const s = typeof raw === 'string' ? raw.trim() : ''
    if (typeof raw === 'string') {
      if (!s) continue
      out[k] = s
    } else {
      out[k] = raw
    }
  }
  return Object.keys(out).length ? out : null
}

/** Plain columns to merge onto User rows when accepting an invitation. */
function invitationPrefillForUser(pref) {
  const out = {}
  if (!pref || typeof pref !== 'object') return out
  for (const k of INVITE_PROFILE_KEYS) {
    const raw = pref[k]
    if (raw == null) continue
    if (typeof raw === 'string') {
      const s = raw.trim()
      if (!s) continue
      out[k] = s
    }
  }
  return out
}

function normalizeMenuPermissions(items) {
  const seen = new Set()
  const list = []
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.menuId || seen.has(item.menuId)) continue
    seen.add(item.menuId)
    const normalized = {
      menuId: item.menuId,
      canView: Boolean(item.canView),
      canEdit: Boolean(item.canEdit),
      canUpdate: Boolean(item.canUpdate),
      canDelete: Boolean(item.canDelete),
    }
    if (normalized.canView || normalized.canEdit || normalized.canUpdate || normalized.canDelete) {
      list.push(normalized)
    }
  }
  return list
}

// eslint-disable-next-line no-unused-vars -- kept for company-global actions; hierarchy checks replaced it on team routes
function requireCompanyAdmin(req) {
  if (!req.user?.isCompanyAdmin) {
    const err = new Error('Forbidden')
    err.status = 403
    err.code = 'FORBIDDEN'
    err.publicMessage = 'Only company admin can perform this action'
    throw err
  }
}

async function assertRoleNameAvailable({ companyId, name, excludeRoleId = null, transaction }) {
  const normalized = String(name || '').trim()
  if (!normalized) return

  const where = {
    companyId,
    [Op.and]: [sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), normalized.toLowerCase())],
  }
  if (excludeRoleId) {
    where.id = { [Op.ne]: excludeRoleId }
  }

  const existing = await CompanyRole.findOne({
    where,
    attributes: ['id'],
    transaction,
  })
  if (existing) {
    const err = new Error('Role already exists')
    err.status = 409
    err.code = 'CONFLICT'
    err.publicMessage = 'A role with this name already exists in your company'
    throw err
  }
}

/** Role is a type/label (userRoleKind) only — menu permissions are per-user, see getUserMenuPermissions. */
export async function listRoles(req, res, next) {
  try {
    const rows = await CompanyRole.findAll({
      where: { companyId: req.user.companyId },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'isDefault', 'userRoleKind', 'roleNo'],
    })
    const ids = rows.map((r) => r.id)
    const memberCounts = await User.findAll({
      where: { companyId: req.user.companyId, companyRoleId: { [Op.in]: ids } },
      attributes: ['companyRoleId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['companyRoleId'],
      raw: true,
    })
    const memberMap = new Map(memberCounts.map((r) => [r.companyRoleId, Number(r.count)]))
    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        isDefault: Boolean(r.isDefault),
        userRoleKind: r.userRoleKind || 'custom',
        roleNo: r.roleNo != null ? Number(r.roleNo) : null,
        assignedUsers: memberMap.get(r.id) || 0,
        // Whether the CALLER may assign/edit/delete this role (strict hierarchy).
        manageable: rankOfUser(req.user) < rankOfRoleKind(r.userRoleKind || 'custom'),
      })),
      // Role kinds this caller may create — UI filters the "create role" and
      // invite dropdowns with this instead of re-deriving rank logic.
      meta: { creatableKinds: creatableRoleKinds(req.user, COMPANY_USER_ROLE_KIND_CREATE_VALUES) },
    })
  } catch (e) {
    return next(e)
  }
}

export async function listMenuMaster(_req, res, next) {
  try {
    const rows = await MenuMaster.findAll({
      where: { isActive: true },
      attributes: ['id', 'key', 'label', 'route', 'parentId', 'sortOrder'],
      order: [['sortOrder', 'ASC']],
    })
    return res.json({ success: true, data: { items: rows }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createCompanyRole(req, res, next) {
  try {
    const { error, value } = createCompanyRoleSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const companyId = req.user.companyId
    const roleName = value.name.trim()
    const roleDescription = value.description?.trim() || null
    const userRoleKind = value.userRoleKind

    // Hierarchy: company_admin creates anything; workspace_admin creates
    // manager & below; manager creates below-manager only; others → 403.
    assertCanManageRoleKind(req.user, userRoleKind)

    let role
    await sequelize.transaction(async (transaction) => {
      await assertRoleNameAvailable({ companyId, name: roleName, transaction })
      role = await CompanyRole.create(
        {
          companyId,
          name: roleName,
          description: roleDescription,
          userRoleKind,
          createdBy: req.user.id,
        },
        { transaction },
      )
    })
    return res.status(201).json({
      success: true,
      data: { id: role.id, name: role.name, userRoleKind: role.userRoleKind, roleNo: role.roleNo != null ? Number(role.roleNo) : null },
      meta: {},
    })
  } catch (e) {
    if (e?.name === 'SequelizeUniqueConstraintError') {
      e.status = 409
      e.code = 'CONFLICT'
      e.publicMessage = 'A role with this name already exists in your company'
    }
    return next(e)
  }
}

export async function patchCompanyRole(req, res, next) {
  try {
    const { error, value } = patchCompanyRoleSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const role = await CompanyRole.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!role) {
      const err = new Error('Role not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Role not found'
      throw err
    }
    // Hierarchy: must outrank the role as it exists today AND as it would
    // become — blocks a manager "editing" a sales role into workspace_admin.
    assertCanManageRoleKind(req.user, role.userRoleKind || 'custom')
    if (value.userRoleKind !== undefined) {
      assertCanManageRoleKind(req.user, value.userRoleKind)
    }
    if (value.name !== undefined) {
      const nextName = value.name.trim()
      await assertRoleNameAvailable({ companyId: req.user.companyId, name: nextName, excludeRoleId: role.id })
      role.name = nextName
    }
    if (value.description !== undefined) role.description = value.description?.trim() || null
    if (value.userRoleKind !== undefined) role.userRoleKind = value.userRoleKind
    await role.save()
    return res.json({
      success: true,
      data: { id: role.id, name: role.name, userRoleKind: role.userRoleKind, roleNo: role.roleNo != null ? Number(role.roleNo) : null },
      meta: {},
    })
  } catch (e) {
    if (e?.name === 'SequelizeUniqueConstraintError') {
      e.status = 409
      e.code = 'CONFLICT'
      e.publicMessage = 'A role with this name already exists in your company'
    }
    return next(e)
  }
}

export async function deleteCompanyRole(req, res, next) {
  try {
    const { error, value } = deleteCompanyRoleSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const role = await CompanyRole.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!role) {
      const err = new Error('Role not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Role not found'
      throw err
    }
    if (role.isDefault) {
      const err = new Error('Cannot delete default role')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Default role cannot be deleted'
      throw err
    }
    // Hierarchy: can only delete roles strictly below your own rank. The
    // fallback role (users get moved onto it) must also be below your rank.
    assertCanManageRoleKind(req.user, role.userRoleKind || 'custom')
    const usingCount = await User.count({ where: { companyId: req.user.companyId, companyRoleId: role.id, isCompanyAdmin: false } })
    if (usingCount > 0) {
      if (!value.fallbackCompanyRoleId) {
        const err = new Error('Role in use')
        err.status = 409
        err.code = 'ROLE_IN_USE'
        err.publicMessage = 'Assign a fallback role before deleting this role'
        throw err
      }
      const fallback = await CompanyRole.findOne({
        where: { id: value.fallbackCompanyRoleId, companyId: req.user.companyId },
      })
      if (fallback) {
        assertCanManageRoleKind(req.user, fallback.userRoleKind || 'custom')
      }
      if (!fallback || fallback.id === role.id) {
        const err = new Error('Invalid fallback role')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Choose a valid fallback role'
        throw err
      }
      await User.update(
        { companyRoleId: fallback.id },
        { where: { companyId: req.user.companyId, companyRoleId: role.id, isCompanyAdmin: false } },
      )
    }
    await role.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * GET /team/users/:id/menu-permissions
 * Returns every active menu with this specific user's own CRUD flags (all false if unset).
 */
export async function getUserMenuPermissions(req, res, next) {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      attributes: ['id', 'isCompanyAdmin', 'companyRoleId'],
    })
    if (!user) {
      const err = new Error('User not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    // Reading someone's permission matrix follows the same hierarchy as
    // writing it (self-view of own menus comes from /auth/me, not here).
    if (!req.user.isCompanyAdmin && String(user.id) !== String(req.user.id)) {
      await assertCanManageUser(req.user, user)
      if (!(await actorSharesWorkspaceWithUser(req.user, user.id))) {
        const err = new Error('Forbidden')
        err.status = 403
        err.code = 'WORKSPACE_SCOPE'
        err.publicMessage = 'You can only view users in your workspaces'
        throw err
      }
    }

    const [menus, links] = await Promise.all([
      MenuMaster.findAll({
        where: { isActive: true },
        attributes: ['id', 'key', 'label', 'route', 'parentId', 'sortOrder'],
        order: [['sortOrder', 'ASC']],
      }),
      UserMenuPermission.findAll({
        where: { userId: user.id },
        attributes: ['menuId', 'canView', 'canEdit', 'canUpdate', 'canDelete'],
      }),
    ])
    const byMenuId = new Map(links.map((l) => [l.menuId, l]))

    return res.json({
      success: true,
      data: {
        items: menus.map((m) => {
          const l = byMenuId.get(m.id)
          return {
            menuId: m.id,
            key: m.key,
            label: m.label,
            route: m.route,
            parentId: m.parentId,
            sortOrder: m.sortOrder,
            canView: Boolean(l?.canView),
            canEdit: Boolean(l?.canEdit),
            canUpdate: Boolean(l?.canUpdate),
            canDelete: Boolean(l?.canDelete),
          }
        }),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

/**
 * PUT /team/users/:id/menu-permissions
 * Replace-all semantics for one user's menu-CRUD grants. Hard company-admin check (beyond
 * the route's settings.team:admin gate) because granting permissions to other users is
 * itself a privilege-escalation-sensitive action — a custom role that merely has
 * settings.team:admin should not be able to grant itself/others unlimited access.
 */
export async function putUserMenuPermissions(req, res, next) {
  try {
    const { error, value } = putUserMenuPermissionsSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const user = await User.findOne({
      where: { id: req.params.id, companyId: req.user.companyId },
      attributes: ['id', 'isCompanyAdmin', 'companyRoleId'],
    })
    if (!user) {
      const err = new Error('User not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    // Hierarchy: only company_admin, or an actor who STRICTLY outranks the
    // target AND shares a workspace with them, may edit permissions. Granting
    // permissions is privilege-escalation-sensitive, so non-company-admins are
    // additionally capped below.
    if (!req.user.isCompanyAdmin) {
      await assertCanManageUser(req.user, user)
      if (!(await actorSharesWorkspaceWithUser(req.user, user.id))) {
        const err = new Error('Forbidden')
        err.status = 403
        err.code = 'WORKSPACE_SCOPE'
        err.publicMessage = 'You can only manage users in your workspaces'
        throw err
      }
    }

    const menuPermissions = normalizeMenuPermissions(value.menuPermissions)
    const menuIds = uniqueIds(menuPermissions.map((x) => x.menuId))
    let menuRows = []
    if (menuIds.length) {
      menuRows = await MenuMaster.findAll({
        where: { id: { [Op.in]: menuIds }, isActive: true },
        attributes: ['id', 'key', 'resource'],
      })
      if (menuRows.length !== menuIds.length) {
        const err = new Error('Invalid menus')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Select valid menus'
        throw err
      }
    }

    if (!req.user.isCompanyAdmin) {
      // (a) Grant ceiling: an actor can never grant a flag they don't hold
      //     themselves (no privilege escalation by proxy). req.permissionSet
      //     is loaded fresh by loadPermissions middleware.
      // (b) The 'settings.team' menu itself is company-admin-only to grant —
      //     this is exactly the "can manage users IF the company admin gave
      //     them the menu" rule: only the company admin hands out that key.
      const menuById = new Map(menuRows.map((m) => [m.id, m]))
      const actorSet = req.permissionSet || new Set()
      const actorHas = (resource, action) => actorSet.has(`${resource}:${action}`) || actorSet.has('*:admin')
      for (const p of menuPermissions) {
        const menu = menuById.get(p.menuId)
        const resource = menu?.resource || menu?.key || ''
        if ((menu?.key === 'settings.team' || resource === 'settings.team')) {
          const err = new Error('Forbidden')
          err.status = 403
          err.code = 'ROLE_HIERARCHY'
          err.publicMessage = 'Only the company admin can grant Team & roles access'
          throw err
        }
        const wantsBeyondActor =
          (p.canView && !actorHas(resource, 'view') && !actorHas(resource, 'create') && !actorHas(resource, 'update') && !actorHas(resource, 'delete')) ||
          (p.canEdit && !actorHas(resource, 'create')) ||
          (p.canUpdate && !actorHas(resource, 'update')) ||
          (p.canDelete && !actorHas(resource, 'delete'))
        if (wantsBeyondActor) {
          const err = new Error('Forbidden')
          err.status = 403
          err.code = 'ROLE_HIERARCHY'
          err.publicMessage = 'You cannot grant permissions you do not hold yourself'
          throw err
        }
      }
    }

    await sequelize.transaction(async (t) => {
      await UserMenuPermission.destroy({ where: { userId: user.id }, transaction: t })
      if (menuPermissions.length) {
        await UserMenuPermission.bulkCreate(
          menuPermissions.map((p) => ({
            userId: user.id,
            menuId: p.menuId,
            canView: p.canView,
            canEdit: p.canEdit,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
          })),
          { transaction: t },
        )
      }
    })

    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listInvitations(req, res, next) {
  try {
    const companyId = req.user.companyId
    let rows = await Invitation.findAll({
      where: { companyId, acceptedAt: null, expiresAt: { [Op.gt]: new Date() } },
      order: [['createdAt', 'DESC']],
      include: [
        { model: CompanyRole, as: 'companyRole', attributes: ['id', 'name', 'userRoleKind', 'roleNo'] },
        { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
      ],
    })
    // Non-company-admins only see invitations that touch their own workspaces
    // (or that they sent themselves).
    if (!req.user.isCompanyAdmin) {
      const allowed = new Set((await allowedWorkspaceIdsForUser(req.user)).map(String))
      rows = rows.filter((i) => {
        if (String(i.invitedBy || '') === String(req.user.id)) return true
        const ids = uniqueIds(i.invitedWorkspaceIds).map(String)
        return ids.some((id) => allowed.has(id))
      })
    }
    return res.json({
      success: true,
      data: {
        items: rows.map((i) => ({
          id: i.id,
          email: i.email,
          companyRole: i.companyRole
            ? {
                id: i.companyRole.id,
                name: i.companyRole.name,
                userRoleKind: i.companyRole.userRoleKind || 'custom',
                roleNo: i.companyRole.roleNo != null ? Number(i.companyRole.roleNo) : null,
              }
            : null,
          workspaceIds: uniqueIds(i.invitedWorkspaceIds),
          profilePrefill: i.profilePrefill && typeof i.profilePrefill === 'object' ? i.profilePrefill : null,
          expiresAt: i.expiresAt?.toISOString() ?? null,
          invitedBy: i.inviter ? { id: i.inviter.id, name: i.inviter.name, email: i.inviter.email } : null,
          createdAt: i.createdAt?.toISOString() ?? null,
        })),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function createInvitation(req, res, next) {
  try {
    const { error, value } = createInvitationSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const companyId = req.user.companyId
    const normEmail = value.email.trim().toLowerCase()

    // Hierarchy: the invited role must be STRICTLY below the inviter's rank —
    // without this, anyone holding settings.team:create could invite a new
    // workspace_admin (privilege escalation). Checked before EITHER branch.
    const invitedRole = await CompanyRole.findOne({
      where: { id: value.companyRoleId, companyId },
      attributes: ['id', 'name', 'userRoleKind'],
    })
    if (!invitedRole) {
      const err = new Error('Invalid role')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Select a valid role for this company'
      throw err
    }
    assertCanManageRoleKind(req.user, invitedRole.userRoleKind || 'custom')
    // Workspace scope: non-company-admins may only invite into their own workspaces.
    await assertWorkspacesWithinActorScope(req.user, value.workspaceIds)

    const dupUser = await User.unscoped().findOne({ where: { email: normEmail, companyId } })
    if (dupUser?.emailVerified) {
      // Same guard on the silent role-change path: the EXISTING user's current
      // rank must also be below the actor's before their role can be swapped.
      if (value.companyRoleId && value.companyRoleId !== dupUser.companyRoleId) {
        await assertCanManageUser(req.user, dupUser)
      }
      const workspaceIds = uniqueIds(value.workspaceIds)
      const validWorkspaces = await Workspace.findAll({
        where: { companyId, id: { [Op.in]: workspaceIds } },
        attributes: ['id', 'name'],
      })
      if (validWorkspaces.length !== workspaceIds.length) {
        const err = new Error('Invalid workspace assignment')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Select valid workspaces from your company'
        throw err
      }
      if (value.companyRoleId && value.companyRoleId !== dupUser.companyRoleId) {
        dupUser.companyRoleId = value.companyRoleId
        await dupUser.save()
      }
      const mergedIds = await addWorkspaceMembershipsForUser({
        userId: dupUser.id,
        companyId,
        workspaceIds,
      })
      return res.status(200).json({
        success: true,
        data: {
          userId: dupUser.id,
          email: dupUser.email,
          workspaceIds: mergedIds,
          addedToWorkspaces: workspaceIds,
          existingMember: true,
          message: 'User already exists — added to selected workspace(s).',
        },
        meta: {},
      })
    }

    const company = await Company.findByPk(companyId)
    if (!company) {
      const err = new Error('Company not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Company not found'
      throw err
    }

    const workspaceIds = uniqueIds(value.workspaceIds)
    // Role already loaded + hierarchy-checked above (invitedRole).
    const selectedCompanyRole = invitedRole
    const validWorkspaces = await Workspace.findAll({
      where: { companyId, id: { [Op.in]: workspaceIds } },
      attributes: ['id', 'name'],
    })
    if (validWorkspaces.length !== workspaceIds.length) {
      const err = new Error('Invalid workspace assignment')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Select valid workspaces from your company'
      throw err
    }
    const workspaceNameMap = new Map(validWorkspaces.map((w) => [w.id, w.name]))

    const plain = generateInvitePlainToken()
    const tokenHash = await hashInviteToken(plain)
    const profilePrefill = buildInvitationProfilePrefill(value)

    await Invitation.destroy({
      where: { companyId, email: normEmail, acceptedAt: null },
    })

    const inv = await Invitation.create({
      companyId,
      email: normEmail,
      companyRoleId: selectedCompanyRole.id,
      invitedWorkspaceIds: workspaceIds,
      profilePrefill,
      tokenHash,
      expiresAt: inviteExpiresAt(48),
      invitedBy: req.user.id,
    })

    const inviteUrl = `${inviteAcceptBaseUrl()}?invitationId=${encodeURIComponent(inv.id)}&token=${encodeURIComponent(plain)}`
    let mail = { sent: false }
    try {
      mail = await sendTeamInviteEmail({
        to: normEmail,
        name: profilePrefill?.name || value.name?.trim() || normEmail.split('@')[0],
        companyName: company.name,
        inviteUrl,
        roleName: selectedCompanyRole.name,
        workspaceNames: workspaceIds.map((id) => workspaceNameMap.get(id)).filter(Boolean),
      })
    } catch (mailErr) {
      await inv.destroy()
      return next(mailErr)
    }

    return res.status(201).json({
      success: true,
      data: {
        id: inv.id,
        email: inv.email,
        companyRoleId: inv.companyRoleId,
        workspaceIds,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        emailDispatched: mail.sent,
        inviteUrl: process.env.NODE_ENV !== 'production' && !mail.sent ? inviteUrl : undefined,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function cancelInvitation(req, res, next) {
  try {
    const companyId = req.user.companyId
    const inv = await Invitation.findOne({
      where: { id: req.params.id, companyId, acceptedAt: null },
    })
    if (!inv) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Invitation not found'
      throw err
    }
    await inv.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function previewInvitation(req, res, next) {
  try {
    const { error, value } = previewInvitationSchema.validate(req.query, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const inv = await Invitation.findOne({
      where: { id: value.invitationId, acceptedAt: null },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: CompanyRole, as: 'companyRole', attributes: ['id', 'name'] },
      ],
    })
    if (!inv || new Date(inv.expiresAt) < new Date()) {
      const err = new Error('Invalid invitation')
      err.status = 400
      err.code = 'INVITE_INVALID'
      err.publicMessage = 'This invitation is invalid or has expired'
      throw err
    }

    const ok = await verifyInviteToken(value.token, inv.tokenHash)
    if (!ok) {
      const err = new Error('Invalid invitation')
      err.status = 400
      err.code = 'INVITE_INVALID'
      err.publicMessage = 'This invitation is invalid or has expired'
      throw err
    }

    const workspaceIds = uniqueIds(inv.invitedWorkspaceIds)
    const workspaces = workspaceIds.length
      ? await Workspace.findAll({
          where: { companyId: inv.companyId, id: { [Op.in]: workspaceIds } },
          attributes: ['id', 'name'],
        })
      : []

    const prefill = inv.profilePrefill && typeof inv.profilePrefill === 'object' ? inv.profilePrefill : {}
    const inviteeName =
      typeof prefill.name === 'string' && prefill.name.trim()
        ? prefill.name.trim()
        : inv.email.split('@')[0] || ''

    return res.json({
      success: true,
      data: {
        email: inv.email,
        name: inviteeName,
        nameFromInvite: Boolean(prefill.name),
        companyName: inv.company?.name ?? null,
        roleName: inv.companyRole?.name ?? null,
        workspaceNames: workspaces.map((w) => w.name).filter(Boolean),
        expiresAt: inv.expiresAt?.toISOString() ?? null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const { error, value } = acceptInvitationSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const inv = await Invitation.findOne({
      where: { id: value.invitationId, acceptedAt: null },
    })
    if (!inv || new Date(inv.expiresAt) < new Date()) {
      const err = new Error('Invalid invitation')
      err.status = 400
      err.code = 'INVITE_INVALID'
      err.publicMessage = 'This invitation is invalid or has expired'
      throw err
    }

    const ok = await verifyInviteToken(value.token, inv.tokenHash)
    if (!ok) {
      const err = new Error('Invalid invitation')
      err.status = 400
      err.code = 'INVITE_INVALID'
      err.publicMessage = 'This invitation is invalid or has expired'
      throw err
    }

    // Re-validate the inviter's CURRENT rank at accept time: an invitation
    // created by a workspace_admin who has since been demoted (or deactivated)
    // must not mint a user into a role the inviter can no longer grant.
    if (inv.invitedBy) {
      const inviter = await User.findOne({
        where: { id: inv.invitedBy, companyId: inv.companyId },
        attributes: ['id', 'isActive', 'isCompanyAdmin', 'companyRoleId'],
        include: [{ model: CompanyRole, as: 'companyRole', attributes: ['userRoleKind'] }],
      })
      const invRole = inv.companyRoleId
        ? await CompanyRole.findOne({ where: { id: inv.companyRoleId, companyId: inv.companyId }, attributes: ['userRoleKind'] })
        : null
      const invitedKind = invRole?.userRoleKind || 'custom'
      const inviterStillAuthorized =
        inviter &&
        inviter.isActive !== false &&
        (inviter.isCompanyAdmin ||
          rankOfUser({ isCompanyAdmin: false, userRoleKind: inviter.companyRole?.userRoleKind || 'custom' }) <
            rankOfRoleKind(invitedKind))
      if (!inviterStillAuthorized) {
        const err = new Error('Invalid invitation')
        err.status = 400
        err.code = 'INVITE_INVALID'
        err.publicMessage = 'This invitation is no longer valid — please ask your admin to send a new one'
        throw err
      }
    }

    const passwordHash = await bcrypt.hash(value.password, 10)
    const normEmail = inv.email.trim().toLowerCase()

    let user = await User.unscoped().findOne({ where: { email: normEmail } })
    const prefillAttrs = invitationPrefillForUser(inv.profilePrefill)

    await sequelize.transaction(async (t) => {
      if (user) {
        if (user.companyId && user.companyId !== inv.companyId) {
          const err = new Error('Email in use')
          err.status = 409
          err.code = 'CONFLICT'
          err.publicMessage = 'This email belongs to another organization'
          throw err
        }
        user.name = value.name
        user.password = passwordHash
        user.companyId = inv.companyId
        user.companyRoleId = inv.companyRoleId
        user.isCompanyAdmin = false
        user.isActive = true
        user.deactivatedAt = null
        user.emailVerified = true
        user.emailVerificationOtpHash = null
        user.emailVerificationOtpExpiresAt = null
        Object.assign(user, prefillAttrs)
        await user.save({ transaction: t })
      } else {
        user = await User.unscoped().create(
          {
            name: value.name,
            email: normEmail,
            password: passwordHash,
            companyId: inv.companyId,
            companyRoleId: inv.companyRoleId,
            isCompanyAdmin: false,
            isActive: true,
            emailVerified: true,
            ...prefillAttrs,
          },
          { transaction: t },
        )
      }

      inv.acceptedAt = new Date()
      await inv.save({ transaction: t })

      const invitedWorkspaceIds = uniqueIds(inv.invitedWorkspaceIds)
      const hadMemberships = (await listWorkspaceIdsForUser(user.id)).length > 0
      if (invitedWorkspaceIds.length) {
        const assignWorkspaces = hadMemberships
          ? addWorkspaceMembershipsForUser
          : setWorkspaceMembershipsForUser
        await assignWorkspaces({
          userId: user.id,
          companyId: inv.companyId,
          workspaceIds: invitedWorkspaceIds,
          transaction: t,
        })
      } else {
        const allCompanyWorkspaces = await Workspace.findAll({
          where: { companyId: inv.companyId },
          attributes: ['id'],
          transaction: t,
        })
        await setWorkspaceMembershipsForUser({
          userId: user.id,
          companyId: inv.companyId,
          workspaceIds: allCompanyWorkspaces.map((w) => w.id),
          transaction: t,
        })
      }
    })

    await user.reload({ include: userAuthIncludes })
    user.lastLoginAt = new Date()
    await user.save()

    const tokens = {
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.isCompanyAdmin ? 'company_admin' : 'member',
        companyRoleId: user.companyRoleId ?? null,
        isCompanyAdmin: Boolean(user.isCompanyAdmin),
        companyId: user.companyId ?? null,
      }),
      refreshToken: signRefreshToken(refreshTokenPayloadForUser(user)),
    }

    return res.json({
      success: true,
      data: {
        user: serializeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: 'Welcome — you are signed in.',
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function listCompanyUsers(req, res, next) {
  try {
    const companyId = req.user.companyId
    const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
    // Non-company-admins only see users who share at least one of THEIR
    // workspaces — a workspace_admin of Workspace A must not see Workspace B's
    // staff. Company admin sees everyone. Two-step (ids first) keeps the main
    // query free of GROUP BY pitfalls under MySQL ONLY_FULL_GROUP_BY.
    const userWhere = { companyId }
    if (!req.user.isCompanyAdmin) {
      if (!allowedWorkspaceIds.length) {
        return res.json({ success: true, data: { items: [] }, meta: {} })
      }
      const memberRows = await UserWorkspace.findAll({
        where: { workspaceId: { [Op.in]: allowedWorkspaceIds } },
        attributes: ['userId'],
        raw: true,
      })
      const visibleUserIds = [...new Set(memberRows.map((r) => r.userId))]
      if (!visibleUserIds.length) {
        return res.json({ success: true, data: { items: [] }, meta: {} })
      }
      userWhere.id = { [Op.in]: visibleUserIds }
    }
    const rows = await User.findAll({
      where: userWhere,
      include: [{ model: CompanyRole, as: 'companyRole', attributes: ['id', 'name', 'userRoleKind', 'roleNo'] }],
      order: [['createdAt', 'ASC']],
      attributes: [
        'id',
        'name',
        'email',
        'isActive',
        'deactivatedAt',
        'createdAt',
        'companyRoleId',
        'isCompanyAdmin',
        'department',
        'jobTitle',
        'businessPhone',
        'whatsappNumber',
        'profilePhotoUrl',
        'street',
        'city',
        'country',
        'postalCode',
        'lastLoginAt',
      ],
    })
    const workspaceSummaryByUser = await hydrateWorkspaceSummaryForUsers(rows.map((u) => u.id))
    return res.json({
      success: true,
      data: {
        items: rows
          .filter((u) => !u.isCompanyAdmin)
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            isActive: u.isActive,
            deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
            department: u.department ?? null,
            jobTitle: u.jobTitle ?? null,
            businessPhone: u.businessPhone ?? null,
            whatsappNumber: u.whatsappNumber ?? null,
            profilePhotoUrl: u.profilePhotoUrl ?? null,
            street: u.street ?? null,
            city: u.city ?? null,
            country: u.country ?? null,
            postalCode: u.postalCode ?? null,
            lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
            companyRole: u.companyRole
              ? {
                  id: u.companyRole.id,
                  name: u.companyRole.name,
                  userRoleKind: u.companyRole.userRoleKind || 'custom',
                  roleNo: u.companyRole.roleNo != null ? Number(u.companyRole.roleNo) : null,
                }
              : null,
            // Whether the CALLER may edit this row (role, permissions,
            // workspaces, deactivate). UI greys out actions when false; the
            // server re-checks on every write regardless.
            manageable: rankOfUser(req.user) < (u.isCompanyAdmin
              ? ROLE_RANK.COMPANY_ADMIN
              : rankOfRoleKind(u.companyRole?.userRoleKind || 'custom')),
            isCompanyAdmin: false,
            workspaces:
              req.user.isCompanyAdmin
                ? workspaceSummaryByUser.get(u.id) || []
                : (workspaceSummaryByUser.get(u.id) || []).filter((w) => allowedWorkspaceIds.includes(w.id)),
            createdAt: u.createdAt?.toISOString() ?? null,
          })),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getCompanyUser(req, res, next) {
  try {
    const companyId = req.user.companyId
    const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
    const user = await User.findOne({
      where: { id: req.params.id, companyId },
      include: [{ model: CompanyRole, as: 'companyRole', attributes: ['id', 'name', 'userRoleKind', 'roleNo'] }],
      attributes: [
        'id',
        'name',
        'email',
        'isActive',
        'deactivatedAt',
        'createdAt',
        'companyRoleId',
        'isCompanyAdmin',
        'department',
        'jobTitle',
        'businessPhone',
        'whatsappNumber',
        'profilePhotoUrl',
        'street',
        'city',
        'country',
        'postalCode',
        'lastLoginAt',
        'avatar',
      ],
    })
    if (!user) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }
    const workspaceSummaryByUser = await hydrateWorkspaceSummaryForUsers([user.id])
    const workspaces = req.user.isCompanyAdmin
      ? workspaceSummaryByUser.get(user.id) || []
      : (workspaceSummaryByUser.get(user.id) || []).filter((w) => allowedWorkspaceIds.includes(w.id))
    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
        department: user.department ?? null,
        jobTitle: user.jobTitle ?? null,
        businessPhone: user.businessPhone ?? null,
        whatsappNumber: user.whatsappNumber ?? null,
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        avatar: user.avatar ?? null,
        street: user.street ?? null,
        city: user.city ?? null,
        country: user.country ?? null,
        postalCode: user.postalCode ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        companyRole: user.companyRole
          ? {
              id: user.companyRole.id,
              name: user.companyRole.name,
              userRoleKind: user.companyRole.userRoleKind || 'custom',
              roleNo: user.companyRole.roleNo != null ? Number(user.companyRole.roleNo) : null,
            }
          : null,
        isCompanyAdmin: Boolean(user.isCompanyAdmin),
        workspaces,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchUserRole(req, res, next) {
  try {
    const { error, value } = patchUserRoleSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const targetId = req.params.id
    const companyId = req.user.companyId
    const target = await User.findOne({ where: { id: targetId, companyId } })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    if (target.id === req.user.id && value.companyRoleId !== req.user.companyRoleId) {
      const err = new Error('Cannot change own role here')
      err.status = 400
      err.code = 'SELF_ROLE'
      err.publicMessage = 'Ask another admin to change your role'
      throw err
    }

    if (target.isCompanyAdmin) {
      const err = new Error('Cannot change role for company admin')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Company admin role is fixed'
      throw err
    }
    const role = await CompanyRole.findOne({ where: { id: value.companyRoleId, companyId } })
    if (!role) {
      const err = new Error('Invalid role')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Role not found in this company'
      throw err
    }
    // Hierarchy: actor must outrank the target's CURRENT role (can't demote a
    // peer/superior) AND the NEW role (can't promote anyone to your own level
    // or above). Non-company-admins must also share a workspace with the target.
    await assertCanManageUser(req.user, target)
    assertCanManageRoleKind(req.user, role.userRoleKind || 'custom')
    if (!(await actorSharesWorkspaceWithUser(req.user, target.id))) {
      const err = new Error('Forbidden')
      err.status = 403
      err.code = 'WORKSPACE_SCOPE'
      err.publicMessage = 'You can only manage users in your workspaces'
      throw err
    }
    target.companyRoleId = value.companyRoleId
    await target.save()
    return res.json({ success: true, data: { id: target.id, companyRoleId: target.companyRoleId }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchUserProfile(req, res, next) {
  try {
    const { error, value } = patchUserProfileSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const targetId = req.params.id
    const companyId = req.user.companyId
    const target = await User.findOne({ where: { id: targetId, companyId } })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    if (req.user.id !== targetId && !req.user.isCompanyAdmin) {
      const err = new Error('Forbidden')
      err.status = 403
      err.code = 'FORBIDDEN'
      err.publicMessage = 'You can only edit your own profile'
      throw err
    }

    if (value.name !== undefined) target.name = value.name?.trim() || target.name
    if (value.department !== undefined) target.department = value.department?.trim() || null
    if (value.jobTitle !== undefined) target.jobTitle = value.jobTitle?.trim() || null
    if (value.businessPhone !== undefined) target.businessPhone = value.businessPhone?.trim() || null
    if (value.whatsappNumber !== undefined) target.whatsappNumber = value.whatsappNumber?.trim() || null
    if (value.profilePhotoUrl !== undefined) target.profilePhotoUrl = value.profilePhotoUrl?.trim() || null
    if (value.street !== undefined) target.street = value.street?.trim() || null
    if (value.city !== undefined) target.city = value.city?.trim() || null
    if (value.country !== undefined) target.country = value.country?.trim() || null
    if (value.postalCode !== undefined) target.postalCode = value.postalCode?.trim() || null

    await target.save()
    return res.json({
      success: true,
      data: {
        id: target.id,
        name: target.name,
        department: target.department ?? null,
        jobTitle: target.jobTitle ?? null,
        businessPhone: target.businessPhone ?? null,
        whatsappNumber: target.whatsappNumber ?? null,
        profilePhotoUrl: target.profilePhotoUrl ?? null,
        street: target.street ?? null,
        city: target.city ?? null,
        country: target.country ?? null,
        postalCode: target.postalCode ?? null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getUserWorkspaces(req, res, next) {
  try {
    const companyId = req.user.companyId
    const target = await User.findOne({
      where: { id: req.params.id, companyId },
      attributes: ['id'],
    })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    const workspaceIds = await listWorkspaceIdsForUser(target.id)
    const rows = await Workspace.findAll({
      where: { companyId, id: { [Op.in]: workspaceIds } },
      attributes: ['id', 'name', 'description', 'archivedAt'],
      order: [['createdAt', 'ASC']],
    })

    return res.json({
      success: true,
      data: {
        userId: target.id,
        items: rows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description ?? null,
          archived: Boolean(w.archivedAt),
        })),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function replaceUserWorkspaces(req, res, next) {
  try {
    const { error, value } = replaceUserWorkspacesSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const companyId = req.user.companyId
    const target = await User.findOne({
      where: { id: req.params.id, companyId },
      attributes: ['id', 'isCompanyAdmin', 'companyRoleId'],
    })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    // Hierarchy + scope: non-company-admins may only re-scope strictly-lower
    // users they share a workspace with, and only INTO their own workspaces.
    if (!req.user.isCompanyAdmin) {
      await assertCanManageUser(req.user, target)
      if (!(await actorSharesWorkspaceWithUser(req.user, target.id))) {
        const err = new Error('Forbidden')
        err.status = 403
        err.code = 'WORKSPACE_SCOPE'
        err.publicMessage = 'You can only manage users in your workspaces'
        throw err
      }
      await assertWorkspacesWithinActorScope(req.user, value.workspaceIds)
    }

    const workspaceIds = await setWorkspaceMembershipsForUser({
      userId: target.id,
      companyId,
      workspaceIds: value.workspaceIds,
    })
    return res.json({
      success: true,
      data: { userId: target.id, workspaceIds },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function deactivateUser(req, res, next) {
  try {
    const { error, value } = deactivateUserSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const targetId = req.params.id
    const companyId = req.user.companyId
    if (targetId === req.user.id) {
      const err = new Error('Cannot deactivate self')
      err.status = 400
      err.code = 'SELF_DEACTIVATE'
      err.publicMessage = 'You cannot deactivate your own account'
      throw err
    }

    const target = await User.findOne({ where: { id: targetId, companyId } })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }

    // Hierarchy: only strictly-lower-ranked users in the actor's workspaces
    // can be deactivated by non-company-admins.
    await assertCanManageUser(req.user, target)
    if (!(await actorSharesWorkspaceWithUser(req.user, target.id))) {
      const err = new Error('Forbidden')
      err.status = 403
      err.code = 'WORKSPACE_SCOPE'
      err.publicMessage = 'You can only manage users in your workspaces'
      throw err
    }

    const reassignTo = value.reassignOwnerUserId
    if (reassignTo) {
      const other = await User.findOne({ where: { id: reassignTo, companyId, isActive: true } })
      if (!other) {
        const err = new Error('Invalid reassignment target')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'reassignOwnerUserId must be an active user in the same company'
        throw err
      }
      // The recipient must also be inside the actor's workspace scope —
      // otherwise leads could be pushed to users the actor can't even see.
      if (!(await actorSharesWorkspaceWithUser(req.user, other.id))) {
        const err = new Error('Forbidden')
        err.status = 403
        err.code = 'WORKSPACE_SCOPE'
        err.publicMessage = 'Reassignment target must be in your workspaces'
        throw err
      }
      await Lead.update({ ownerUserId: reassignTo }, { where: { companyId, ownerUserId: targetId } })
    }

    target.isActive = false
    target.deactivatedAt = new Date()
    await target.save()

    return res.json({ success: true, data: { id: target.id, isActive: false }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function reactivateUser(req, res, next) {
  try {
    const targetId = req.params.id
    const companyId = req.user.companyId
    const target = await User.findOne({ where: { id: targetId, companyId } })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }
    if (target.isCompanyAdmin) {
      const err = new Error('Cannot change company admin activation here')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Company admin accounts are managed separately'
      throw err
    }
    if (target.isActive !== false) {
      const err = new Error('Already active')
      err.status = 400
      err.code = 'ALREADY_ACTIVE'
      err.publicMessage = 'This member is already active'
      throw err
    }
    await assertCanManageUser(req.user, target)
    if (!(await actorSharesWorkspaceWithUser(req.user, target.id))) {
      const err = new Error('Forbidden')
      err.status = 403
      err.code = 'WORKSPACE_SCOPE'
      err.publicMessage = 'You can only manage users in your workspaces'
      throw err
    }
    target.isActive = true
    target.deactivatedAt = null
    await target.save()
    return res.json({ success: true, data: { id: target.id, isActive: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function reassignUserLeads(req, res, next) {
  try {
    const { error, value } = reassignLeadsSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const fromId = req.params.id
    const companyId = req.user.companyId
    const fromUser = await User.findOne({ where: { id: fromId, companyId } })
    if (!fromUser) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
    }
    const toUser = await User.findOne({ where: { id: value.toUserId, companyId, isActive: true } })
    if (!toUser) {
      const err = new Error('Target not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Target user not found in this company'
      throw err
    }

    // Hierarchy: actor must outrank the user being stripped of leads, and
    // both source and recipient must be inside the actor's workspaces.
    await assertCanManageUser(req.user, fromUser)
    const [sharesFrom, sharesTo] = await Promise.all([
      actorSharesWorkspaceWithUser(req.user, fromId),
      actorSharesWorkspaceWithUser(req.user, toUser.id),
    ])
    if (!sharesFrom || !sharesTo) {
      const err = new Error('Forbidden')
      err.status = 403
      err.code = 'WORKSPACE_SCOPE'
      err.publicMessage = 'Both users must be in your workspaces'
      throw err
    }

    const [count] = await Lead.update({ ownerUserId: value.toUserId }, { where: { companyId, ownerUserId: fromId } })
    return res.json({ success: true, data: { reassigned: count }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listTeams(req, res, next) {
  try {
    const companyId = req.user.companyId
    const rows = await Team.findAll({
      where: { companyId, workspaceId: req.workspaceId },
      order: [['name', 'ASC']],
      include: [
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        },
      ],
    })
    return res.json({
      success: true,
      data: {
        items: rows.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? null,
          members: (t.members || []).map((m) => ({
            userId: m.userId,
            user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : null,
          })),
        })),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function createTeam(req, res, next) {
  try {
    const { error, value } = createTeamSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const team = await Team.create({
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      name: value.name.trim(),
      description: value.description?.trim() || null,
    })
    return res.status(201).json({
      success: true,
      data: { id: team.id, name: team.name, description: team.description },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchTeam(req, res, next) {
  try {
    const { error, value } = patchTeamSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId } })
    if (!team) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Team not found'
      throw err
    }
    if (value.name !== undefined) team.name = value.name.trim()
    if (value.description !== undefined) team.description = value.description?.trim() || null
    await team.save()
    return res.json({ success: true, data: { id: team.id, name: team.name, description: team.description }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteTeam(req, res, next) {
  try {
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId } })
    if (!team) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Team not found'
      throw err
    }
    await team.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function addTeamMember(req, res, next) {
  try {
    const { error, value } = teamMemberSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId } })
    if (!team) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Team not found'
      throw err
    }
    const member = await User.findOne({ where: { id: value.userId, companyId: req.user.companyId, isActive: true } })
    if (!member) {
      const err = new Error('User not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Active user not found in this company'
      throw err
    }
    await TeamMember.findOrCreate({
      where: { teamId: team.id, userId: value.userId },
      defaults: { teamId: team.id, userId: value.userId },
    })
    return res.status(201).json({ success: true, data: { teamId: team.id, userId: value.userId }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function removeTeamMember(req, res, next) {
  try {
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId } })
    if (!team) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Team not found'
      throw err
    }
    const userId = req.params.userId
    await TeamMember.destroy({ where: { teamId: team.id, userId } })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function googleSsoPlaceholder(_req, res) {
  return res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Google / SAML SSO is available for enterprise workspaces. Contact sales to enable it.',
    },
  })
}

/**
 * GET /team/assignable-users
 * Lightweight, workspace-scoped user list for assignee FILTERS and dropdowns.
 * Deliberately NOT behind the settings.team menu — a manager without the Team
 * page still needs names to populate the "filter by user" control, and every
 * page's dropdown should stop leaking the whole company's user list.
 *
 *   company_admin           → all active users of the current workspace
 *                             (or whole company when no x-workspace-id sent)
 *   workspace_admin/manager → active users of the current workspace
 *                             (must be one of THEIR workspaces)
 *   others (rank 3)         → just themselves — they never see a user filter,
 *                             and their lists are self-scoped anyway
 */
export async function listAssignableUsers(req, res, next) {
  try {
    const companyId = req.user.companyId
    const myRank = rankOfUser(req.user)

    if (myRank >= ROLE_RANK.OTHERS) {
      const self = await User.findOne({
        where: { id: req.user.id, companyId },
        attributes: ['id', 'name', 'email', 'avatar'],
      })
      return res.json({
        success: true,
        data: { items: self ? [{ id: self.id, name: self.name, email: self.email, avatar: self.avatar ?? null }] : [] },
        meta: { scope: 'self' },
      })
    }

    const requestedWorkspaceId = req.headers['x-workspace-id'] ? String(req.headers['x-workspace-id']) : null
    let workspaceIds
    if (requestedWorkspaceId) {
      if (!req.user.isCompanyAdmin) {
        const allowed = (await allowedWorkspaceIdsForUser(req.user)).map(String)
        if (!allowed.includes(requestedWorkspaceId)) {
          const err = new Error('Forbidden')
          err.status = 403
          err.code = 'FORBIDDEN'
          err.publicMessage = 'You do not have access to this workspace'
          throw err
        }
      }
      workspaceIds = [requestedWorkspaceId]
    } else if (req.user.isCompanyAdmin) {
      workspaceIds = null // whole company
    } else {
      workspaceIds = (await allowedWorkspaceIdsForUser(req.user)).map(String)
      if (!workspaceIds.length) {
        return res.json({ success: true, data: { items: [] }, meta: { scope: 'workspace' } })
      }
    }

    const userWhere = { companyId, isActive: true }
    if (workspaceIds) {
      const memberRows = await UserWorkspace.findAll({
        where: { workspaceId: { [Op.in]: workspaceIds } },
        attributes: ['userId'],
        raw: true,
      })
      const ids = [...new Set(memberRows.map((r) => r.userId))]
      if (!ids.length) {
        return res.json({ success: true, data: { items: [] }, meta: { scope: 'workspace' } })
      }
      userWhere.id = { [Op.in]: ids }
    }

    const rows = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'avatar'],
      order: [['name', 'ASC']],
    })
    return res.json({
      success: true,
      data: { items: rows.map((u) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar ?? null })) },
      meta: { scope: workspaceIds ? 'workspace' : 'company' },
    })
  } catch (e) {
    return next(e)
  }
}
