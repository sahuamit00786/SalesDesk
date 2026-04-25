import bcrypt from 'bcrypt'
import { Op } from 'sequelize'
import {
  Company,
  CompanyRole,
  CompanyRoleMenu,
  Invitation,
  Lead,
  MenuMaster,
  sequelize,
  Team,
  TeamMember,
  User,
  Workspace,
} from '../models/index.js'
import { userAuthIncludes } from '../queries/userIncludes.js'
import { serializeUser } from '../serializers/userSerializer.js'
import { generateInvitePlainToken, hashInviteToken, inviteExpiresAt, verifyInviteToken } from '../services/inviteTokenService.js'
import { sendTeamInviteEmail } from '../services/mailService.js'
import { signAccessToken, signRefreshToken } from '../services/tokenService.js'
import {
  acceptInvitationSchema,
  createInvitationSchema,
  createCompanyRoleSchema,
  createTeamSchema,
  deactivateUserSchema,
  deleteCompanyRoleSchema,
  patchTeamSchema,
  patchCompanyRoleSchema,
  patchUserRoleSchema,
  replaceUserWorkspacesSchema,
  reassignLeadsSchema,
  teamMemberSchema,
} from '../validations/team.js'
import {
  allowedWorkspaceIdsForUser,
  hydrateWorkspaceSummaryForUsers,
  listWorkspaceIdsForUser,
  setWorkspaceMembershipsForUser,
} from '../services/userWorkspaceService.js'

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

function normalizeRoleMenuPermissions(items) {
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

export async function listRoles(req, res, next) {
  try {
    const rows = await CompanyRole.findAll({
      where: { companyId: req.user.companyId },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'isDefault'],
      include: [
        {
          model: CompanyRoleMenu,
          as: 'menuLinks',
          attributes: ['menuId', 'canView', 'canEdit', 'canUpdate', 'canDelete'],
          required: false,
        },
      ],
    })
    const ids = rows.map((r) => r.id)
    const [memberCounts, menuCounts] = await Promise.all([
      User.findAll({
        where: { companyId: req.user.companyId, companyRoleId: { [Op.in]: ids } },
        attributes: ['companyRoleId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['companyRoleId'],
        raw: true,
      }),
      CompanyRoleMenu.findAll({
        where: { companyRoleId: { [Op.in]: ids } },
        attributes: ['companyRoleId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['companyRoleId'],
        raw: true,
      }),
    ])
    const memberMap = new Map(memberCounts.map((r) => [r.companyRoleId, Number(r.count)]))
    const menuMap = new Map(menuCounts.map((r) => [r.companyRoleId, Number(r.count)]))
    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        isDefault: Boolean(r.isDefault),
        assignedUsers: memberMap.get(r.id) || 0,
        menuCount: menuMap.get(r.id) || 0,
        menuPermissions: (r.menuLinks || []).map((m) => ({
          menuId: m.menuId,
          canView: Boolean(m.canView),
          canEdit: Boolean(m.canEdit),
          canUpdate: Boolean(m.canUpdate),
          canDelete: Boolean(m.canDelete),
        })),
      })),
      meta: {},
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
    requireCompanyAdmin(req)
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
    const menuPermissions = normalizeRoleMenuPermissions(value.menuPermissions)
    if (!menuPermissions.length) {
      const err = new Error('Invalid menus')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Select at least one menu action'
      throw err
    }
    const menuIds = uniqueIds(menuPermissions.map((x) => x.menuId))
    const validMenus = await MenuMaster.findAll({ where: { id: { [Op.in]: menuIds }, isActive: true }, attributes: ['id'] })
    if (validMenus.length !== menuIds.length) {
      const err = new Error('Invalid menus')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Select valid menus'
      throw err
    }

    let role
    await sequelize.transaction(async (transaction) => {
      await assertRoleNameAvailable({ companyId, name: roleName, transaction })
      role = await CompanyRole.create(
        {
          companyId,
          name: roleName,
          description: roleDescription,
          createdBy: req.user.id,
        },
        { transaction },
      )
      await CompanyRoleMenu.bulkCreate(
        menuPermissions.map((p) => ({
          companyRoleId: role.id,
          menuId: p.menuId,
          canView: p.canView,
          canEdit: p.canEdit,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        })),
        { transaction },
      )
    })
    return res.status(201).json({ success: true, data: { id: role.id, name: role.name }, meta: {} })
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
    requireCompanyAdmin(req)
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
    if (value.name !== undefined) {
      const nextName = value.name.trim()
      await assertRoleNameAvailable({ companyId: req.user.companyId, name: nextName, excludeRoleId: role.id })
      role.name = nextName
    }
    if (value.description !== undefined) role.description = value.description?.trim() || null
    await role.save()
    if (value.menuPermissions) {
      const menuPermissions = normalizeRoleMenuPermissions(value.menuPermissions)
      if (!menuPermissions.length) {
        const err = new Error('Invalid menus')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Select at least one menu action'
        throw err
      }
      const menuIds = uniqueIds(menuPermissions.map((x) => x.menuId))
      const validMenus = await MenuMaster.findAll({
        where: { id: { [Op.in]: menuIds }, isActive: true },
        attributes: ['id'],
      })
      if (validMenus.length !== menuIds.length) {
        const err = new Error('Invalid menus')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Select valid menus'
        throw err
      }
      await CompanyRoleMenu.destroy({ where: { companyRoleId: role.id } })
      await CompanyRoleMenu.bulkCreate(
        menuPermissions.map((p) => ({
          companyRoleId: role.id,
          menuId: p.menuId,
          canView: p.canView,
          canEdit: p.canEdit,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        })),
      )
    }
    return res.json({ success: true, data: { id: role.id, name: role.name }, meta: {} })
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
    requireCompanyAdmin(req)
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
    await CompanyRoleMenu.destroy({ where: { companyRoleId: role.id } })
    await role.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getPermissionMatrix(_req, res, next) {
  try {
    const rows = await CompanyRoleMenu.findAll({
      attributes: ['companyRoleId'],
      include: [{ model: MenuMaster, as: 'menu', attributes: ['key', 'label', 'route'] }],
      order: [['companyRoleId', 'ASC']],
    })
    const byRole = {}
    for (const r of rows) {
      const k = r.companyRoleId
      if (!byRole[k]) byRole[k] = []
      byRole[k].push({ key: r.menu?.key, label: r.menu?.label, route: r.menu?.route ?? null })
    }
    return res.json({ success: true, data: { matrix: byRole }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listInvitations(req, res, next) {
  try {
    const companyId = req.user.companyId
    const rows = await Invitation.findAll({
      where: { companyId, acceptedAt: null, expiresAt: { [Op.gt]: new Date() } },
      order: [['createdAt', 'DESC']],
      include: [
        { model: CompanyRole, as: 'companyRole', attributes: ['id', 'name'] },
        { model: User, as: 'inviter', attributes: ['id', 'name', 'email'] },
      ],
    })
    return res.json({
      success: true,
      data: {
        items: rows.map((i) => ({
          id: i.id,
          email: i.email,
          companyRole: i.companyRole ? { id: i.companyRole.id, name: i.companyRole.name } : null,
          workspaceIds: uniqueIds(i.invitedWorkspaceIds),
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

    const dupUser = await User.unscoped().findOne({ where: { email: normEmail, companyId } })
    if (dupUser?.emailVerified) {
      const err = new Error('Already a member')
      err.status = 409
      err.code = 'CONFLICT'
      err.publicMessage = 'This user is already in your workspace'
      throw err
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
    const selectedCompanyRole = await CompanyRole.findOne({
      where: { id: value.companyRoleId, companyId },
      attributes: ['id', 'name'],
    })
    if (!selectedCompanyRole) {
      const err = new Error('Invalid role')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Select a valid role for this company'
      throw err
    }
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

    await Invitation.destroy({
      where: { companyId, email: normEmail, acceptedAt: null },
    })

    const inv = await Invitation.create({
      companyId,
      email: normEmail,
      companyRoleId: selectedCompanyRole.id,
      invitedWorkspaceIds: workspaceIds,
      tokenHash,
      expiresAt: inviteExpiresAt(48),
      invitedBy: req.user.id,
    })

    const inviteUrl = `${inviteAcceptBaseUrl()}?invitationId=${encodeURIComponent(inv.id)}&token=${encodeURIComponent(plain)}`
    let mail = { sent: false }
    try {
      mail = await sendTeamInviteEmail({
        to: normEmail,
        name: normEmail.split('@')[0],
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

    const passwordHash = await bcrypt.hash(value.password, 10)
    const normEmail = inv.email.trim().toLowerCase()

    let user = await User.unscoped().findOne({ where: { email: normEmail } })

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
          },
          { transaction: t },
        )
      }

      inv.acceptedAt = new Date()
      await inv.save({ transaction: t })

      const invitedWorkspaceIds = uniqueIds(inv.invitedWorkspaceIds)
      if (invitedWorkspaceIds.length) {
        await setWorkspaceMembershipsForUser({
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

    const tokens = {
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.isCompanyAdmin ? 'company_admin' : 'member',
        companyRoleId: user.companyRoleId ?? null,
        isCompanyAdmin: Boolean(user.isCompanyAdmin),
        companyId: user.companyId ?? null,
      }),
      refreshToken: signRefreshToken({ sub: user.id }),
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
    const rows = await User.findAll({
      where: { companyId },
      include: [{ model: CompanyRole, as: 'companyRole', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'name', 'email', 'isActive', 'deactivatedAt', 'createdAt', 'companyRoleId', 'isCompanyAdmin'],
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
            companyRole: u.companyRole ? { id: u.companyRole.id, name: u.companyRole.name } : null,
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
    target.companyRoleId = value.companyRoleId
    await target.save()
    return res.json({ success: true, data: { id: target.id, companyRoleId: target.companyRoleId }, meta: {} })
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
      attributes: ['id'],
    })
    if (!target) {
      const err = new Error('Not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'User not found'
      throw err
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
    const toUser = await User.findOne({ where: { id: value.toUserId, companyId, isActive: true } })
    if (!toUser) {
      const err = new Error('Target not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Target user not found in this company'
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
      where: { companyId },
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
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
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
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
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
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
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
    const team = await Team.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
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
