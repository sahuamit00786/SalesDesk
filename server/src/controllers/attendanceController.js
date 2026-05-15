import { Op } from 'sequelize'
import { AttendanceLog, LeaveRequest, User } from '../models/index.js'
import {
  companyUserScopeWhere,
  isHrManagerOrAdmin,
  resolveHrRole,
} from '../services/hrRoleService.js'

const LATE_AFTER_HOUR = 10
const LATE_AFTER_MINUTE = 0

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime12(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function computeTotalHours(checkIn, checkOut) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (ms <= 0) return 0
  return Math.round((ms / 3600000) * 100) / 100
}

function eachDateInRange(fromDate, toDate, cb) {
  const cur = new Date(`${String(fromDate).slice(0, 10)}T12:00:00Z`)
  const end = new Date(`${String(toDate).slice(0, 10)}T12:00:00Z`)
  while (cur <= end) {
    cb(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
}

async function approvedLeavesInRange(companyId, userIds, rangeStart, rangeEnd) {
  if (!userIds.length) return []
  return LeaveRequest.findAll({
    where: {
      companyId,
      userId: { [Op.in]: userIds },
      status: 'approved',
      fromDate: { [Op.lte]: rangeEnd },
      toDate: { [Op.gte]: rangeStart },
    },
    attributes: ['userId', 'fromDate', 'toDate'],
  })
}

function countOnLeaveByDate(leaves, rangeStart, rangeEnd) {
  const byDate = {}
  for (const leave of leaves) {
    eachDateInRange(leave.fromDate, leave.toDate, (d) => {
      if (d < rangeStart || d > rangeEnd) return
      if (!byDate[d]) byDate[d] = new Set()
      byDate[d].add(String(leave.userId))
    })
  }
  return Object.fromEntries(Object.entries(byDate).map(([d, set]) => [d, set.size]))
}

function formatDurationHours(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return { text: `${h}h ${m}m`, hours, h, m }
}

function monthRange(year, month) {
  const y = Number(year)
  const m = Number(month)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function deriveStatusFromCheckIn(checkInTime) {
  const d = new Date(checkInTime)
  const lateCutoff = new Date(d)
  lateCutoff.setHours(LATE_AFTER_HOUR, LATE_AFTER_MINUTE, 0, 0)
  return d > lateCutoff ? 'late' : 'present'
}

export async function getTodayStatus(req, res, next) {
  try {
    const date = todayDateOnly()
    const row = await AttendanceLog.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, date },
    })
    return res.json({
      success: true,
      data: {
        date,
        checkedIn: Boolean(row?.checkInTime),
        checkedOut: Boolean(row?.checkOutTime),
        checkInTime: row?.checkInTime || null,
        checkOutTime: row?.checkOutTime || null,
        totalHours: row?.totalHours != null ? Number(row.totalHours) : null,
        status: row?.status || null,
        checkInLabel: row?.checkInTime ? formatTime12(row.checkInTime) : null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function checkIn(req, res, next) {
  try {
    const date = todayDateOnly()
    const existing = await AttendanceLog.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, date },
    })
    if (existing?.checkInTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: 'You have already checked in today.',
        },
      })
    }
    const now = new Date()
    const status = deriveStatusFromCheckIn(now)
    let row
    if (existing) {
      await existing.update({ checkInTime: now, status })
      row = existing
    } else {
      row = await AttendanceLog.create({
        userId: req.user.id,
        companyId: req.user.companyId,
        date,
        checkInTime: now,
        status,
      })
    }
    return res.json({
      success: true,
      data: {
        ...row.get({ plain: true }),
        checkInLabel: formatTime12(now),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function checkOut(req, res, next) {
  try {
    const date = todayDateOnly()
    const row = await AttendanceLog.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, date },
    })
    if (!row?.checkInTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CHECKED_IN', message: 'You must check in before checking out.' },
      })
    }
    if (row.checkOutTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_OUT', message: 'You have already checked out today.' },
      })
    }
    const now = new Date()
    const totalHours = computeTotalHours(row.checkInTime, now)
    await row.update({ checkOutTime: now, totalHours })
    const summary = formatDurationHours(Number(totalHours))
    return res.json({
      success: true,
      data: {
        ...row.get({ plain: true }),
        summaryText: `You worked ${summary.text} today`,
        totalHours: Number(totalHours),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getMyAttendance(req, res, next) {
  try {
    const now = new Date()
    const year = Number(req.query.year) || now.getFullYear()
    const month = Number(req.query.month) || now.getMonth() + 1
    const { start, end } = monthRange(year, month)
    const logs = await AttendanceLog.findAll({
      where: {
        userId: req.user.id,
        companyId: req.user.companyId,
        date: { [Op.between]: [start, end] },
      },
      order: [['date', 'ASC']],
    })
    const stats = { present: 0, absent: 0, late: 0, half_day: 0, totalHours: 0 }
    for (const log of logs) {
      if (stats[log.status] != null) stats[log.status] += 1
      stats.totalHours += Number(log.totalHours || 0)
    }
    return res.json({ success: true, data: { logs, stats, year, month }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getTeamAttendance(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not allowed to view team attendance' },
      })
    }
    const now = new Date()
    const year = Number(req.query.year) || now.getFullYear()
    const month = Number(req.query.month) || now.getMonth() + 1
    const { start, end } = monthRange(year, month)
    const userWhere = await companyUserScopeWhere(req, hrRole)
    if (req.query.department) userWhere.department = String(req.query.department).trim()
    if (req.query.userId) userWhere.id = String(req.query.userId)

    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'department', 'jobTitle'],
      order: [['name', 'ASC']],
    })
    const userIds = users.map((u) => u.id)
    const logs = userIds.length
      ? await AttendanceLog.findAll({
          where: {
            companyId: req.user.companyId,
            userId: { [Op.in]: userIds },
            date: { [Op.between]: [start, end] },
          },
        })
      : []

    const calendar = {}
    for (const log of logs) {
      const d = String(log.date).slice(0, 10)
      if (!calendar[d]) calendar[d] = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 }
      if (log.status === 'present') calendar[d].present += 1
      else if (log.status === 'late') calendar[d].late += 1
      else if (log.status === 'absent') calendar[d].absent += 1
      else if (log.status === 'half_day') calendar[d].half_day += 1
    }

    const approvedLeaves = await approvedLeavesInRange(
      req.user.companyId,
      userIds,
      start,
      end,
    )
    const onLeaveCounts = countOnLeaveByDate(approvedLeaves, start, end)
    for (const [d, count] of Object.entries(onLeaveCounts)) {
      if (!calendar[d]) calendar[d] = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 }
      calendar[d].on_leave = count
    }

    const summary = users.map((u) => {
      const userLogs = logs.filter((l) => String(l.userId) === String(u.id))
      const row = {
        userId: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        daysPresent: 0,
        daysAbsent: 0,
        daysLate: 0,
        daysHalfDay: 0,
        totalHours: 0,
      }
      for (const l of userLogs) {
        if (l.status === 'present') row.daysPresent += 1
        if (l.status === 'absent') row.daysAbsent += 1
        if (l.status === 'late') row.daysLate += 1
        if (l.status === 'half_day') row.daysHalfDay += 1
        row.totalHours += Number(l.totalHours || 0)
      }
      return row
    })

    return res.json({
      success: true,
      data: { users, logs, calendar, summary, year, month },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getDayDetail(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not allowed' },
      })
    }
    const date = String(req.params.date || '').slice(0, 10)
    const userWhere = await companyUserScopeWhere(req, hrRole)
    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'department'],
    })
    const logs = await AttendanceLog.findAll({
      where: {
        companyId: req.user.companyId,
        date,
        userId: { [Op.in]: users.map((u) => u.id) },
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'department'] }],
    })
    const byUser = new Map(logs.map((l) => [String(l.userId), l]))
    const approvedLeaves = await approvedLeavesInRange(
      req.user.companyId,
      users.map((u) => u.id),
      date,
      date,
    )
    const onLeaveIds = new Set(
      approvedLeaves
        .filter((l) => String(l.fromDate).slice(0, 10) <= date && String(l.toDate).slice(0, 10) >= date)
        .map((l) => String(l.userId)),
    )
    const rows = users.map((u) => {
      const log = byUser.get(String(u.id))
      let status = log?.status || 'absent'
      if (!log && onLeaveIds.has(String(u.id))) status = 'on_leave'
      return {
        user: u,
        status,
        checkInTime: log?.checkInTime || null,
        checkOutTime: log?.checkOutTime || null,
        totalHours: log?.totalHours != null ? Number(log.totalHours) : null,
      }
    })
    return res.json({ success: true, data: { date, rows }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function exportAttendanceCsv(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not allowed to export' },
      })
    }
    const now = new Date()
    const year = Number(req.query.year) || now.getFullYear()
    const month = Number(req.query.month) || now.getMonth() + 1
    const { start, end } = monthRange(year, month)
    const userWhere = await companyUserScopeWhere(req, hrRole)
    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email'],
    })
    const logs = await AttendanceLog.findAll({
      where: {
        companyId: req.user.companyId,
        userId: { [Op.in]: users.map((u) => u.id) },
        date: { [Op.between]: [start, end] },
      },
      order: [['date', 'ASC']],
    })
    const nameById = Object.fromEntries(users.map((u) => [String(u.id), u.name]))
    const lines = ['Employee Name,Date,Check In,Check Out,Hours Worked,Status']
    for (const log of logs) {
      const ci = log.checkInTime ? formatTime12(log.checkInTime) : ''
      const co = log.checkOutTime ? formatTime12(log.checkOutTime) : ''
      lines.push(
        [
          `"${(nameById[String(log.userId)] || '').replace(/"/g, '""')}"`,
          log.date,
          ci,
          co,
          log.totalHours != null ? Number(log.totalHours) : '',
          log.status,
        ].join(','),
      )
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${month}.csv"`)
    return res.send(lines.join('\n'))
  } catch (e) {
    return next(e)
  }
}
