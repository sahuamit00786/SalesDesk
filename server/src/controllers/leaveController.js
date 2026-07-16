import { Op } from 'sequelize'
import { sequelize } from '../config/db.js'
import {
  CompanyRole,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PublicHoliday,
  User,
} from '../models/index.js'
import {
  companyUserScopeWhere,
  isHrAdmin,
  isHrManagerOrAdmin,
  resolveHrRole,
} from '../services/hrRoleService.js'
import {
  calculateLeaveDays,
  getCompanyWeeklyOffDays,
  getLateThreshold,
  getOrCreateBalance,
  refreshBalanceAvailable,
  setCompanyWeeklyOffDays,
  setLateThreshold,
  validateLeaveRequest,
} from '../services/leaveCalculatorService.js'
import { createNotification } from '../services/notificationService.js'
import { notifyLeaveDecided } from '../services/notification/teamNotificationService.js'
import { Notification } from '../models/index.js'

async function notifyLeaveApprovers({ companyId, workspaceId, applicant, leaveType, fromDate, toDate }) {
  const roles = await CompanyRole.findAll({
    where: { companyId },
    attributes: ['id', 'userRoleKind'],
  })
  const managerRoleIds = roles
    .filter((r) => {
      const k = String(r.userRoleKind || '').toLowerCase()
      return k === 'manager' || k === 'workspace_admin'
    })
    .map((r) => r.id)

  const orConditions = [{ isCompanyAdmin: true }]
  if (managerRoleIds.length) orConditions.push({ companyRoleId: { [Op.in]: managerRoleIds } })

  const approvers = await User.findAll({
    where: {
      companyId,
      isActive: true,
      id: { [Op.ne]: applicant.id },
      [Op.or]: orConditions,
    },
    attributes: ['id'],
  })

  const typeName = leaveType?.name || 'Leave'
  const who = applicant.name || 'An employee'
  for (const u of approvers) {
    await createNotification({
      userId: u.id,
      companyId,
      workspaceId,
      title: 'Leave approval needed',
      message: `${who} requested ${typeName} from ${fromDate} to ${toDate}.`,
      type: 'leave',
      link: '/leave/approval',
    })
  }
}

const leaveInclude = [
  { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'department'] },
  { model: User, as: 'approver', attributes: ['id', 'name', 'email'], required: false },
]

export async function getLeaveTypes(req, res, next) {
  try {
    const rows = await LeaveType.findAll({
      where: { companyId: req.user.companyId },
      order: [['name', 'ASC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createLeaveType(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const { name, code, daysPerYear, isPaid, carryForward, maxCarryForwardDays } = req.body || {}
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name and code required' } })
    }
    const row = await LeaveType.create({
      companyId: req.user.companyId,
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      daysPerYear: Number(daysPerYear) || 0,
      isPaid: isPaid !== false,
      carryForward: Boolean(carryForward),
      maxCarryForwardDays: Number(maxCarryForwardDays) || 0,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function updateLeaveType(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const row = await LeaveType.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    const patch = {}
    for (const key of ['name', 'code', 'daysPerYear', 'isPaid', 'carryForward', 'maxCarryForwardDays']) {
      if (key in (req.body || {})) patch[key] = req.body[key]
    }
    if (patch.code) patch.code = String(patch.code).trim().toUpperCase()
    await row.update(patch)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteLeaveType(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const row = await LeaveType.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })

    await sequelize.transaction(async (transaction) => {
      await LeaveBalance.destroy({
        where: { leaveTypeId: row.id, companyId: req.user.companyId },
        transaction,
      })
      await LeaveRequest.destroy({
        where: { leaveTypeId: row.id, companyId: req.user.companyId },
        transaction,
      })
      await row.destroy({ transaction })
    })

    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getMyLeaveBalance(req, res, next) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    const rows = await LeaveBalance.findAll({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, year },
      include: [{ model: LeaveType, as: 'leaveType', required: true }],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getUserLeaveBalance(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
    }
    const year = Number(req.query.year) || new Date().getFullYear()
    const rows = await LeaveBalance.findAll({
      where: { userId: req.params.userId, companyId: req.user.companyId, workspaceId: req.workspaceId, year },
      include: [{ model: LeaveType, as: 'leaveType', required: true }],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function adjustLeaveBalance(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const { userId, leaveTypeId, year, allocated, reason } = req.body || {}
    if (!userId || !leaveTypeId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'userId and leaveTypeId required' } })
    }
    const y = Number(year) || new Date().getFullYear()
    const row = await getOrCreateBalance(userId, leaveTypeId, req.user.companyId, y, req.workspaceId)
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave type not found' } })
    const updates = { allocated: Number(allocated) }
    if (reason !== undefined) updates.adjustmentNote = reason ? String(reason).trim() : null
    await row.update(updates)
    await refreshBalanceAvailable(row)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function previewLeaveDays(req, res, next) {
  try {
    const { fromDate, toDate } = req.query
    const breakdown = await calculateLeaveDays(fromDate, toDate, req.user.companyId, { withBreakdown: true })
    return res.json({ success: true, data: breakdown, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getLeaveSettings(req, res, next) {
  try {
    const [weeklyOffDays, lateThreshold] = await Promise.all([
      getCompanyWeeklyOffDays(req.user.companyId),
      getLateThreshold(req.user.companyId),
    ])
    return res.json({
      success: true,
      data: {
        weeklyOffDays,
        lateThresholdHour: lateThreshold.hour,
        lateThresholdMinute: lateThreshold.minute,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function updateLeaveSettings(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const { weeklyOffDays, lateThresholdHour, lateThresholdMinute } = req.body || {}
    const updates = {}

    if (weeklyOffDays !== undefined) {
      if (!Array.isArray(weeklyOffDays)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'weeklyOffDays must be an array of day numbers (0–6)' },
        })
      }
      updates.weeklyOffDays = await setCompanyWeeklyOffDays(req.user.companyId, weeklyOffDays)
    }

    if (lateThresholdHour !== undefined || lateThresholdMinute !== undefined) {
      const current = await getLateThreshold(req.user.companyId)
      const h = Number(lateThresholdHour ?? current.hour)
      const m = Number(lateThresholdMinute ?? current.minute)
      if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'Hour must be 0–23 and minute must be 0–59' },
        })
      }
      const saved = await setLateThreshold(
        req.user.companyId,
        h,
        m,
      )
      updates.lateThresholdHour = saved.hour
      updates.lateThresholdMinute = saved.minute
    }

    return res.json({ success: true, data: updates, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function applyLeave(req, res, next) {
  try {
    const { leaveTypeId, fromDate, toDate, reason, isHalfDay, targetUserId } = req.body || {}
    const halfDay = Boolean(isHalfDay)
    const documentUrl = req.file
      ? `/uploads/leave/${req.file.filename}`
      : req.body?.documentUrl || null

    // Admins / managers may apply on behalf of another user
    const isAdminOrManager =
      req.user.isCompanyAdmin ||
      ['manager', 'workspace_admin'].includes(String(req.user.companyRole?.userRoleKind || '').toLowerCase())

    let applicantId = req.user.id
    let applicant = req.user
    if (targetUserId && targetUserId !== req.user.id) {
      if (!isAdminOrManager) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only managers/admins can apply leave for others' } })
      }
      const target = await User.findOne({ where: { id: targetUserId, companyId: req.user.companyId } })
      if (!target) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target user not found' } })
      }
      applicantId = target.id
      applicant = target
    }

    // For half-day, toDate must equal fromDate
    const effectiveToDate = halfDay ? fromDate : toDate

    const validation = await validateLeaveRequest({
      userId: applicantId,
      leaveTypeId,
      fromDate,
      toDate: effectiveToDate,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      isHalfDay: halfDay,
    })
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: validation.message },
      })
    }

    const days = halfDay ? 0.5 : validation.days

    const row = await LeaveRequest.create({
      userId: applicantId,
      leaveTypeId,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      fromDate: validation.fromStr,
      toDate: validation.toStr,
      days,
      isHalfDay: halfDay,
      reason: reason || null,
      documentUrl,
      status: 'pending',
      appliedAt: new Date(),
    })

    const balance = validation.balance
    await balance.update({ pending: Number(balance.pending) + days })
    await refreshBalanceAvailable(balance)

    const created = await LeaveRequest.findByPk(row.id, { include: leaveInclude })
    const leaveType = created?.leaveType || (await LeaveType.findByPk(leaveTypeId))
    await notifyLeaveApprovers({
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      applicant,
      leaveType,
      fromDate: validation.fromStr,
      toDate: validation.toStr,
    })

    return res.status(201).json({
      success: true,
      data: created,
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getMyLeaves(req, res, next) {
  try {
    const rows = await LeaveRequest.findAll({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      include: leaveInclude,
      order: [['appliedAt', 'DESC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getAllLeaves(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
    }
    const userWhere = await companyUserScopeWhere(req, hrRole)
    const users = await User.findAll({ where: userWhere, attributes: ['id'] })
    const userIds = users.map((u) => u.id)
    const where = { companyId: req.user.companyId, workspaceId: req.workspaceId, userId: { [Op.in]: userIds } }
    if (req.query.status) where.status = String(req.query.status)
    if (req.query.leaveTypeId) where.leaveTypeId = String(req.query.leaveTypeId)
    if (req.query.from) where.fromDate = { [Op.gte]: String(req.query.from).slice(0, 10) }
    if (req.query.to) where.toDate = { [Op.lte]: String(req.query.to).slice(0, 10) }

    const rows = await LeaveRequest.findAll({
      where,
      include: leaveInclude,
      order: [['appliedAt', 'DESC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

async function finalizeLeaveApproval(request, approverId) {
  const balance = await getOrCreateBalance(
    request.userId,
    request.leaveTypeId,
    request.companyId,
    new Date(request.fromDate).getFullYear(),
    request.workspaceId,
  )
  if (!balance) {
    const err = new Error('Leave balance not found — cannot approve leave')
    err.status = 422
    err.code = 'BALANCE_NOT_FOUND'
    throw err
  }
  await sequelize.transaction(async (t) => {
    // Re-read with exclusive row lock so concurrent approvals on the same balance serialise here
    await balance.reload({ transaction: t, lock: t.LOCK.UPDATE })
    // Validate sufficient balance after acquiring the lock (prevents race conditions)
    const effectiveAvailable = Math.max(0, Number(balance.allocated || 0) - Number(balance.used))
    if (effectiveAvailable < Number(request.days)) {
      const err = new Error('Insufficient leave balance')
      err.status = 400
      err.code = 'INSUFFICIENT_BALANCE'
      throw err
    }
    await request.update({ status: 'approved', approvedBy: approverId, rejectionReason: null }, { transaction: t })
    const newUsed = Number(balance.used) + Number(request.days)
    const newPending = Math.max(0, Number(balance.pending) - Number(request.days))
    const newAvailable = Math.max(0, Number(balance.allocated || 0) - newUsed - newPending)
    await balance.update({ used: newUsed, pending: newPending, available: newAvailable }, { transaction: t })
  })
}

export async function approveLeave(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
    }
    const request = await LeaveRequest.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      include: [{ model: User, as: 'user' }],
    })
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Request is not pending' } })
    }
    await finalizeLeaveApproval(request, req.user.id)
    await notifyLeaveDecided({
      companyId: req.user.companyId,
      workspaceId: request.workspaceId,
      recipientUserId: request.userId,
      status: 'approved',
      fromDate: request.fromDate,
      toDate: request.toDate,
    }).catch(() => {})
    return res.json({
      success: true,
      data: await LeaveRequest.findByPk(request.id, { include: leaveInclude }),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function rejectLeave(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
    }
    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Rejection reason is required' },
      })
    }
    const request = await LeaveRequest.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      include: [{ model: User, as: 'user' }],
    })
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Request is not pending' } })
    }
    const balance = await getOrCreateBalance(
      request.userId,
      request.leaveTypeId,
      request.companyId,
      new Date(request.fromDate).getFullYear(),
      request.workspaceId,
    )
    await sequelize.transaction(async (t) => {
      await request.update({ status: 'rejected', rejectionReason, approvedBy: req.user.id }, { transaction: t })
      if (balance) {
        const newPending = Math.max(0, Number(balance.pending) - Number(request.days))
        const newAvailable = Math.max(0, Number(balance.allocated || 0) - Number(balance.used) - newPending)
        await balance.update({ pending: newPending, available: newAvailable }, { transaction: t })
      }
    })
    await notifyLeaveDecided({
      companyId: req.user.companyId,
      workspaceId: request.workspaceId,
      recipientUserId: request.userId,
      status: 'rejected',
      fromDate: request.fromDate,
      toDate: request.toDate,
      reason: rejectionReason,
    }).catch(() => {})
    return res.json({
      success: true,
      data: await LeaveRequest.findByPk(request.id, { include: leaveInclude }),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function cancelLeave(req, res, next) {
  try {
    const request = await LeaveRequest.findOne({
      where: { id: req.params.id, userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
    })
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    const today = new Date().toISOString().slice(0, 10)
    const canCancelPending = request.status === 'pending'
    const canCancelFutureApproved =
      request.status === 'approved' && String(request.fromDate) > today
    if (!canCancelPending && !canCancelFutureApproved) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'This leave cannot be cancelled' },
      })
    }
    const wasPending = request.status === 'pending'
    const wasApproved = request.status === 'approved'
    await request.update({ status: 'cancelled' })
    const balance = await getOrCreateBalance(
      request.userId,
      request.leaveTypeId,
      request.companyId,
      new Date(request.fromDate).getFullYear(),
      request.workspaceId,
    )
    if (balance) {
      if (wasPending) {
        await balance.update({ pending: Math.max(0, Number(balance.pending) - Number(request.days)) })
      }
      if (wasApproved) {
        await balance.update({ used: Math.max(0, Number(balance.used) - Number(request.days)) })
      }
      await refreshBalanceAvailable(balance)
    }
    return res.json({
      success: true,
      data: await LeaveRequest.findByPk(request.id, { include: leaveInclude }),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function bulkApproveLeaves(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
    }
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    if (!ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    }
    const rows = await LeaveRequest.findAll({
      where: { id: { [Op.in]: ids }, companyId: req.user.companyId, workspaceId: req.workspaceId, status: 'pending' },
    })
    for (const row of rows) {
      await finalizeLeaveApproval(row, req.user.id)
      await createNotification({
        userId: row.userId,
        companyId: req.user.companyId,
        workspaceId: row.workspaceId,
        title: 'Leave approved',
        message: `Your leave from ${row.fromDate} to ${row.toDate} was approved.`,
        type: 'leave',
        link: '/leave',
      })
    }
    return res.json({ success: true, data: { approved: rows.length }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getTeamLeaveCalendar(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    const userWhere = await companyUserScopeWhere(req, hrRole)
    const users = await User.findAll({ where: userWhere, attributes: ['id'] })
    const from = String(req.query.from || '').slice(0, 10)
    const to = String(req.query.to || '').slice(0, 10)
    const where = {
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      userId: { [Op.in]: users.map((u) => u.id) },
      status: 'approved',
    }
    if (from && to) {
      where[Op.or] = [
        { fromDate: { [Op.between]: [from, to] } },
        { toDate: { [Op.between]: [from, to] } },
        { [Op.and]: [{ fromDate: { [Op.lte]: from } }, { toDate: { [Op.gte]: to } }] },
      ]
    }
    const rows = await LeaveRequest.findAll({ where, include: leaveInclude })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getPublicHolidays(req, res, next) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    const rows = await PublicHoliday.findAll({
      where: {
        companyId: req.user.companyId,
        date: {
          [Op.between]: [`${year}-01-01`, `${year}-12-31`],
        },
      },
      order: [['date', 'ASC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createHoliday(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const { name, date, description } = req.body || {}
    if (!name?.trim() || !date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name and date required' } })
    }
    const dateStr = String(date).slice(0, 10)
    const existing = await PublicHoliday.findOne({
      where: { companyId: req.user.companyId, date: dateStr },
      attributes: ['id'],
    })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'A holiday already exists on this date.' },
      })
    }
    const row = await PublicHoliday.create({
      companyId: req.user.companyId,
      name: String(name).trim(),
      date: dateStr,
      description: description || null,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function updateHoliday(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const row = await PublicHoliday.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    const patch = {}
    if ('name' in (req.body || {})) patch.name = req.body.name
    if ('date' in (req.body || {})) patch.date = String(req.body.date).slice(0, 10)
    if ('description' in (req.body || {})) patch.description = req.body.description
    await row.update(patch)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteHoliday(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } })
    }
    const row = await PublicHoliday.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getNotifications(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const rows = await Notification.findAll({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      order: [['createdAt', 'DESC']],
      limit,
    })
    const unread = await Notification.count({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, isRead: false },
    })
    return res.json({ success: true, data: rows, meta: { unread } })
  } catch (e) {
    return next(e)
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const row = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.update({ isRead: true })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, isRead: false } },
    )
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * GET /leave/pending-approvals
 * Returns pending leave requests from direct reports (employees whose managerId = req.user.id).
 * HR managers/admins still see all pending leaves via getAllLeaves.
 */
export async function getPendingApprovals(req, res, next) {
  try {
    // Find all users who have this user as their manager
    const reports = await User.findAll({
      where: { managerId: req.user.id, companyId: req.user.companyId, isActive: true },
      attributes: ['id'],
    })

    if (!reports.length) {
      return res.json({ success: true, data: [], meta: { total: 0 } })
    }

    const reportIds = reports.map((u) => u.id)
    const rows = await LeaveRequest.findAll({
      where: {
        companyId: req.user.companyId,
        workspaceId: req.workspaceId,
        userId: { [Op.in]: reportIds },
        status: 'pending',
      },
      include: leaveInclude,
      order: [['appliedAt', 'DESC']],
    })

    return res.json({ success: true, data: rows, meta: { total: rows.length } })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /leave/:id/manager-approve
 * Allows a manager to approve a leave request from one of their direct reports.
 */
export async function managerApproveLeave(req, res, next) {
  try {
    const request = await LeaveRequest.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      include: [{ model: User, as: 'user' }],
    })
    if (!request) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave request not found' } })
    }

    // Ensure the applicant reports to this manager
    const applicant = request.user || (await User.findByPk(request.userId, { attributes: ['id', 'managerId', 'name', 'email'] }))
    if (!applicant || String(applicant.managerId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only approve leave requests from your direct reports' },
      })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Request is not pending' } })
    }

    await finalizeLeaveApproval(request, req.user.id)

    const typeName = (await request.getLeaveType())?.name || 'Leave'
    await createNotification({
      userId: request.userId,
      companyId: req.user.companyId,
      workspaceId: request.workspaceId,
      title: 'Leave approved',
      message: `Your ${typeName} from ${request.fromDate} to ${request.toDate} was approved by your manager.`,
      type: 'leave',
      link: '/leave',
    })

    return res.json({
      success: true,
      data: await LeaveRequest.findByPk(request.id, { include: leaveInclude }),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /leave/:id/manager-reject
 * Allows a manager to reject a leave request from one of their direct reports.
 */
export async function managerRejectLeave(req, res, next) {
  try {
    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Rejection reason is required' },
      })
    }

    const request = await LeaveRequest.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
      include: [{ model: User, as: 'user' }],
    })
    if (!request) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave request not found' } })
    }

    // Ensure the applicant reports to this manager
    const applicant = request.user || (await User.findByPk(request.userId, { attributes: ['id', 'managerId', 'name', 'email'] }))
    if (!applicant || String(applicant.managerId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only reject leave requests from your direct reports' },
      })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Request is not pending' } })
    }

    const balance = await getOrCreateBalance(
      request.userId,
      request.leaveTypeId,
      request.companyId,
      new Date(request.fromDate).getFullYear(),
      request.workspaceId,
    )

    await sequelize.transaction(async (t) => {
      await request.update({ status: 'rejected', rejectionReason, approvedBy: req.user.id }, { transaction: t })
      if (balance) {
        const newPending = Math.max(0, Number(balance.pending) - Number(request.days))
        const newAvailable = Math.max(0, Number(balance.allocated || 0) - Number(balance.used) - newPending)
        await balance.update({ pending: newPending, available: newAvailable }, { transaction: t })
      }
    })

    await createNotification({
      userId: request.userId,
      companyId: req.user.companyId,
      workspaceId: request.workspaceId,
      title: 'Leave rejected',
      message: `Your leave was rejected by your manager: ${rejectionReason}`,
      type: 'leave',
      link: '/leave',
    })

    return res.json({
      success: true,
      data: await LeaveRequest.findByPk(request.id, { include: leaveInclude }),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}
