import { Op } from 'sequelize'
import {
  AttendanceLog,
  AttendanceSession,
  LeaveRequest,
  User,
} from '../models/index.js'
import {
  companyUserScopeWhere,
  isHrManagerOrAdmin,
  resolveHrRole,
} from '../services/hrRoleService.js'
import { getLateThreshold } from '../services/leaveCalculatorService.js'

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime12(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function computeDurationHours(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return 0
  return Math.round(ms / 60000) / 60
}

function sumSessionHours(sessions) {
  return sessions
    .filter((s) => s.checkOutTime)
    .reduce((acc, s) => acc + Number(s.durationHours || 0), 0)
}

function formatDurationHours(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

function eachDateInRange(fromDate, toDate, cb) {
  const cur = new Date(`${String(fromDate).slice(0, 10)}T12:00:00Z`)
  const end = new Date(`${String(toDate).slice(0, 10)}T12:00:00Z`)
  while (cur <= end) {
    cb(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
}

async function approvedLeavesInRange(companyId, workspaceId, userIds, rangeStart, rangeEnd) {
  if (!userIds.length) return []
  return LeaveRequest.findAll({
    where: {
      companyId,
      workspaceId,
      userId: { [Op.in]: userIds },
      status: 'approved',
      fromDate: { [Op.lte]: rangeEnd },
      toDate: { [Op.gte]: rangeStart },
    },
    attributes: ['userId', 'fromDate', 'toDate', 'isHalfDay'],
  })
}

function countOnLeaveByDate(leaves, rangeStart, rangeEnd) {
  const full = {}, half = {}
  for (const leave of leaves) {
    const bucket = leave.isHalfDay ? half : full
    eachDateInRange(leave.fromDate, leave.toDate, (d) => {
      if (d < rangeStart || d > rangeEnd) return
      if (!bucket[d]) bucket[d] = new Set()
      bucket[d].add(String(leave.userId))
    })
  }
  return {
    full: Object.fromEntries(Object.entries(full).map(([d, s]) => [d, s.size])),
    half: Object.fromEntries(Object.entries(half).map(([d, s]) => [d, s.size])),
  }
}

function monthRange(year, month) {
  const y = Number(year)
  const m = Number(month)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

async function deriveStatus(checkInTime, companyId) {
  const { hour, minute } = await getLateThreshold(companyId)
  const d = new Date(checkInTime)
  const lateCutoff = new Date(d)
  lateCutoff.setHours(hour, minute, 0, 0)
  return d > lateCutoff ? 'late' : 'present'
}

export async function getTodayStatus(req, res, next) {
  try {
    const date = todayDateOnly()
    const [log, sessions] = await Promise.all([
      AttendanceLog.findOne({
        where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
      }),
      AttendanceSession.findAll({
        where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
        order: [['checkInTime', 'ASC']],
      }),
    ])
    const openSession = sessions.find((s) => !s.checkOutTime) || null
    return res.json({
      success: true,
      data: {
        date,
        log: log ? log.get({ plain: true }) : null,
        sessions: sessions.map((s) => s.get({ plain: true })),
        hasOpenSession: Boolean(openSession),
        openSession: openSession ? openSession.get({ plain: true }) : null,
        totalHours: log?.totalHours != null ? Number(log.totalHours) : null,
        status: log?.status || null,
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
    const force = req.body?.force === true

    const openSession = await AttendanceSession.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date, checkOutTime: null },
    })
    if (openSession) {
      return res.status(400).json({
        success: false,
        error: { code: 'SESSION_OPEN', message: 'Please check out before checking in again.' },
      })
    }

    if (!force) {
      const onLeave = await LeaveRequest.findOne({
        where: {
          userId: req.user.id,
          workspaceId: req.workspaceId,
          status: 'approved',
          fromDate: { [Op.lte]: date },
          toDate: { [Op.gte]: date },
        },
        attributes: ['id'],
      })
      if (onLeave) {
        return res.status(409).json({
          success: false,
          error: { code: 'ON_LEAVE', message: 'You have approved leave today. Pass force=true to check in anyway.' },
        })
      }
    }

    const now = new Date()
    const status = await deriveStatus(now, req.user.companyId)
    const [log] = await AttendanceLog.findOrCreate({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
      defaults: { checkInTime: now, status },
    })

    const session = await AttendanceSession.create({
      userId: req.user.id,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      logId: log.id,
      date,
      checkInTime: now,
    })

    const allSessions = await AttendanceSession.findAll({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
      order: [['checkInTime', 'ASC']],
    })

    return res.json({
      success: true,
      data: {
        log: log.get({ plain: true }),
        session: session.get({ plain: true }),
        sessions: allSessions.map((s) => s.get({ plain: true })),
        hasOpenSession: true,
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

    const openSession = await AttendanceSession.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date, checkOutTime: null },
    })
    if (!openSession) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_OPEN_SESSION', message: 'No active session. Please check in first.' },
      })
    }

    const now = new Date()
    const durationHours = computeDurationHours(openSession.checkInTime, now)
    await openSession.update({ checkOutTime: now, durationHours })

    const allSessions = await AttendanceSession.findAll({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
    })
    const totalHours = sumSessionHours(allSessions)

    const log = await AttendanceLog.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, workspaceId: req.workspaceId, date },
    })
    if (log) {
      await log.update({ checkOutTime: now, totalHours })
    }

    return res.json({
      success: true,
      data: {
        log: log ? log.get({ plain: true }) : null,
        session: openSession.get({ plain: true }),
        sessions: allSessions.map((s) => s.get({ plain: true })),
        hasOpenSession: false,
        totalHours,
        summaryText: `You worked ${formatDurationHours(totalHours)} today`,
        checkOutLabel: formatTime12(now),
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
        workspaceId: req.workspaceId,
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
            workspaceId: req.workspaceId,
            userId: { [Op.in]: userIds },
            date: { [Op.between]: [start, end] },
          },
        })
      : []

    const calendar = {}
    for (const log of logs) {
      const d = String(log.date).slice(0, 10)
      if (!calendar[d]) calendar[d] = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, on_leave_half: 0 }
      if (log.status === 'present') calendar[d].present += 1
      else if (log.status === 'late') calendar[d].late += 1
      else if (log.status === 'absent') calendar[d].absent += 1
      else if (log.status === 'half_day') calendar[d].half_day += 1
    }

    const approvedLeaves = await approvedLeavesInRange(req.user.companyId, req.workspaceId, userIds, start, end)
    const { full: onLeaveFull, half: onLeaveHalf } = countOnLeaveByDate(approvedLeaves, start, end)
    for (const [d, count] of Object.entries(onLeaveFull)) {
      if (!calendar[d]) calendar[d] = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, on_leave_half: 0 }
      calendar[d].on_leave = count
    }
    for (const [d, count] of Object.entries(onLeaveHalf)) {
      if (!calendar[d]) calendar[d] = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, on_leave_half: 0 }
      calendar[d].on_leave_half = count
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
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } })
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
        workspaceId: req.workspaceId,
        date,
        userId: { [Op.in]: users.map((u) => u.id) },
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'department'] }],
    })
    const byUser = new Map(logs.map((l) => [String(l.userId), l]))
    const approvedLeaves = await approvedLeavesInRange(
      req.user.companyId,
      req.workspaceId,
      users.map((u) => u.id),
      date,
      date,
    )
    const onLeaveIds = new Set(
      approvedLeaves
        .filter(
          (l) =>
            String(l.fromDate).slice(0, 10) <= date && String(l.toDate).slice(0, 10) >= date,
        )
        .map((l) => String(l.userId)),
    )
    const rows = users.map((u) => {
      const log = byUser.get(String(u.id))
      let status = log?.status || 'absent'
      if (!log && onLeaveIds.has(String(u.id))) status = 'on_leave'
      return {
        logId: log?.id || null,
        user: u,
        status,
        checkInTime: log?.checkInTime || null,
        checkOutTime: log?.checkOutTime || null,
        totalHours: log?.totalHours != null ? Number(log.totalHours) : null,
        note: log?.note || null,
        editedByUserId: log?.editedByUserId || null,
        editedAt: log?.editedAt || null,
      }
    })
    return res.json({ success: true, data: { date, rows }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function editAttendanceLog(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'HR only' } })
    }
    const log = await AttendanceLog.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId: req.workspaceId },
    })
    if (!log) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Log not found' } })
    }
    const { status, checkInTime, checkOutTime, totalHours, note } = req.body || {}
    const updates = { editedByUserId: req.user.id, editedAt: new Date() }
    if (status) updates.status = status
    if (checkInTime !== undefined) updates.checkInTime = checkInTime || null
    if (checkOutTime !== undefined) updates.checkOutTime = checkOutTime || null
    if (totalHours !== undefined) updates.totalHours = totalHours !== null ? Number(totalHours) : null
    if (note !== undefined) updates.note = note
    await log.update(updates)
    return res.json({ success: true, data: log.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createAttendanceLog(req, res, next) {
  try {
    const hrRole = await resolveHrRole(req.user)
    if (!isHrManagerOrAdmin(hrRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'HR only' } })
    }
    const { userId, date, status, checkInTime, checkOutTime, totalHours, note } = req.body || {}
    if (!userId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'userId, date, and status are required' },
      })
    }
    if (String(date).slice(0, 10) > todayDateOnly()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Cannot create attendance log for future dates' },
      })
    }
    const targetUser = await User.findOne({ where: { id: userId, companyId: req.user.companyId } })
    if (!targetUser) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    const existing = await AttendanceLog.findOne({ where: { userId, workspaceId: req.workspaceId, date } })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Attendance log already exists for this user and date' },
      })
    }
    const log = await AttendanceLog.create({
      userId,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      date,
      status,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      totalHours: totalHours != null ? Number(totalHours) : null,
      note: note || null,
      editedByUserId: req.user.id,
      editedAt: new Date(),
    })
    return res.status(201).json({ success: true, data: log.get({ plain: true }), meta: {} })
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
        workspaceId: req.workspaceId,
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
