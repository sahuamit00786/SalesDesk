import { Op } from 'sequelize'
import { User, UserWorkspace, Workspace } from '../models/index.js'
import { ensureLibrarySalesDocTemplates } from '../services/defaultSalesDocTemplates.js'
import { createWorkspaceSchema, patchWorkspaceSchema } from '../validations/workspace.js'

async function userCompanyId(userId) {
  const user = await User.findByPk(userId)
  return user?.companyId ?? null
}

async function workspaceForCompany(companyId, workspaceId) {
  return Workspace.findOne({
    where: { id: workspaceId, companyId },
  })
}

async function memberCountForCompany(companyId) {
  return User.count({ where: { companyId } })
}

/** Per-workspace lead counts are not stored yet; returns 0 until leads are scoped by workspace. */
async function leadCountForWorkspace(_workspaceId) {
  return 0
}

async function serializeWorkspaceList(companyId) {
  const memberCount = await memberCountForCompany(companyId)
  const rows = await Workspace.findAll({
    where: { companyId },
    order: [['createdAt', 'ASC']],
  })
  const items = await Promise.all(
    rows.map(async (w) => ({
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      archived: Boolean(w.archivedAt),
      archivedAt: w.archivedAt ? w.archivedAt.toISOString() : null,
      createdAt: w.createdAt ? w.createdAt.toISOString() : null,
      leadCount: await leadCountForWorkspace(w.id),
      memberCount,
    })),
  )
  return items
}

async function scopedWorkspaceWhereForUser(user) {
  if (user.isCompanyAdmin) {
    return { companyId: user.companyId }
  }
  const links = await UserWorkspace.findAll({
    where: { userId: user.id },
    attributes: ['workspaceId'],
  })
  const workspaceIds = links.map((l) => l.workspaceId)
  if (!workspaceIds.length) {
    return { companyId: user.companyId, id: { [Op.eq]: null } }
  }
  return { companyId: user.companyId, id: { [Op.in]: workspaceIds } }
}

export async function listWorkspaces(req, res, next) {
  try {
    const companyId = await userCompanyId(req.user.id)
    if (!companyId) {
      return res.json({ success: true, data: { items: [] }, meta: {} })
    }
    const where = await scopedWorkspaceWhereForUser(req.user)
    const rows = await Workspace.findAll({
      where,
      order: [['createdAt', 'ASC']],
    })
    const memberCount = await memberCountForCompany(companyId)
    const items = await Promise.all(
      rows.map(async (w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        archived: Boolean(w.archivedAt),
        archivedAt: w.archivedAt ? w.archivedAt.toISOString() : null,
        createdAt: w.createdAt ? w.createdAt.toISOString() : null,
        leadCount: await leadCountForWorkspace(w.id),
        memberCount,
      })),
    )
    return res.json({ success: true, data: { items }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createWorkspace(req, res, next) {
  try {
    const { error, value } = createWorkspaceSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = error.details.map((d) => d.message).join(', ')
      err.details = error.details
      throw err
    }

    const companyId = await userCompanyId(req.user.id)
    if (!companyId) {
      const err = new Error('No company linked')
      err.status = 400
      err.code = 'NO_COMPANY'
      err.publicMessage = 'Your account is not linked to a company yet'
      throw err
    }

    const desc = typeof value.description === 'string' && value.description.trim() ? value.description.trim() : null

    const created = await Workspace.create({
      companyId,
      name: value.name,
      description: desc,
    })
    await ensureLibrarySalesDocTemplates({ workspaceId: created.id, companyId })
    if (created && !req.user.isCompanyAdmin) {
      await UserWorkspace.findOrCreate({
        where: { userId: req.user.id, workspaceId: created.id },
        defaults: { userId: req.user.id, workspaceId: created.id },
      })
    }

    const items = await serializeWorkspaceList(companyId)
    return res.status(201).json({
      success: true,
      data: { items },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchWorkspace(req, res, next) {
  try {
    const { error, value } = patchWorkspaceSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = error.details.map((d) => d.message).join(', ')
      err.details = error.details
      throw err
    }

    const companyId = await userCompanyId(req.user.id)
    if (!companyId) {
      const err = new Error('No company linked')
      err.status = 400
      err.code = 'NO_COMPANY'
      err.publicMessage = 'Your account is not linked to a company yet'
      throw err
    }

    const workspace = await workspaceForCompany(companyId, req.params.id)
    if (!workspace) {
      const err = new Error('Workspace not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Workspace not found'
      throw err
    }

    if (value.name !== undefined) {
      workspace.name = value.name
    }

    if (value.description !== undefined) {
      if (value.description === null) {
        workspace.description = null
      } else {
        const t = String(value.description).trim()
        workspace.description = t ? t : null
      }
    }

    if (value.archived === true) {
      const nonArchivedCount = await Workspace.count({
        where: { companyId, archivedAt: { [Op.is]: null } },
      })
      if (nonArchivedCount <= 1 && !workspace.archivedAt) {
        const err = new Error('Cannot archive the only active workspace')
        err.status = 409
        err.code = 'LAST_ACTIVE_WORKSPACE'
        err.publicMessage = 'Keep at least one active workspace. Unarchive another first, or create a new workspace.'
        throw err
      }
      workspace.archivedAt = new Date()
    } else if (value.archived === false) {
      workspace.archivedAt = null
    }

    await workspace.save()

    const items = await serializeWorkspaceList(companyId)
    return res.json({
      success: true,
      data: { items },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function deleteWorkspace(req, res, next) {
  try {
    const companyId = await userCompanyId(req.user.id)
    if (!companyId) {
      const err = new Error('No company linked')
      err.status = 400
      err.code = 'NO_COMPANY'
      err.publicMessage = 'Your account is not linked to a company yet'
      throw err
    }

    const workspace = await workspaceForCompany(companyId, req.params.id)
    if (!workspace) {
      const err = new Error('Workspace not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Workspace not found'
      throw err
    }

    const total = await Workspace.count({ where: { companyId } })
    if (total <= 1) {
      const err = new Error('Cannot delete the last workspace')
      err.status = 409
      err.code = 'LAST_WORKSPACE'
      err.publicMessage = 'Each company must keep at least one workspace.'
      throw err
    }

    await workspace.destroy()

    const items = await serializeWorkspaceList(companyId)
    return res.json({
      success: true,
      data: { items },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}
