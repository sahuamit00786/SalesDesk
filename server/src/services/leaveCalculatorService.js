import { Op } from 'sequelize'
import { Company, LeaveBalance, LeaveRequest, LeaveType, PublicHoliday } from '../models/index.js'

const DEFAULT_WEEKLY_OFF_DAYS = [0, 6]

function parseDateOnly(value) {
  const s = String(value || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

function normalizeWeeklyOffDays(raw) {
  if (!Array.isArray(raw)) return [...DEFAULT_WEEKLY_OFF_DAYS]
  const nums = [...new Set(raw.map((n) => Number(n)).filter((n) => n >= 0 && n <= 6))]
  return nums.sort((a, b) => a - b)
}

export async function getCompanyWeeklyOffDays(companyId) {
  const company = await Company.findByPk(companyId, { attributes: ['leaveWeeklyOffDays'] })
  return normalizeWeeklyOffDays(company?.leaveWeeklyOffDays)
}

export async function setCompanyWeeklyOffDays(companyId, weeklyOffDays) {
  const normalized = normalizeWeeklyOffDays(weeklyOffDays)
  const company = await Company.findByPk(companyId)
  if (!company) return null
  await company.update({ leaveWeeklyOffDays: normalized })
  return normalized
}

export async function getLateThreshold(companyId) {
  const company = await Company.findByPk(companyId, {
    attributes: ['lateThresholdHour', 'lateThresholdMinute'],
  })
  return {
    hour: company?.lateThresholdHour ?? 10,
    minute: company?.lateThresholdMinute ?? 0,
  }
}

export async function setLateThreshold(companyId, hour, minute) {
  const h = Math.max(0, Math.min(23, Number(hour) || 10))
  const m = Math.max(0, Math.min(59, Number(minute) || 0))
  const company = await Company.findByPk(companyId)
  if (!company) return null
  await company.update({ lateThresholdHour: h, lateThresholdMinute: m })
  return { hour: h, minute: m }
}

function isWeeklyOff(date, weeklyOffDays) {
  return weeklyOffDays.includes(date.getDay())
}

function eachDateInRange(fromStr, toStr) {
  const out = []
  const start = new Date(`${fromStr}T12:00:00`)
  const end = new Date(`${toStr}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out
  const cur = new Date(start)
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export async function getHolidaySet(companyId, fromStr, toStr) {
  const rows = await PublicHoliday.findAll({
    where: {
      companyId,
      date: { [Op.between]: [fromStr, toStr] },
    },
    attributes: ['date'],
  })
  return new Set(rows.map((r) => String(r.date).slice(0, 10)))
}

/**
 * Count working days excluding company weekly offs and public holidays.
 * @returns {number|{ days: number, totalDays: number, weeklyOffDays: number, publicHolidays: number }}
 */
export async function calculateLeaveDays(fromDate, toDate, companyId, options = {}) {
  const { withBreakdown = false } = options
  const fromStr = parseDateOnly(fromDate)
  const toStr = parseDateOnly(toDate)
  if (!fromStr || !toStr) return withBreakdown ? { days: 0, totalDays: 0, weeklyOffDays: 0, publicHolidays: 0 } : 0

  const weeklyOffDays = await getCompanyWeeklyOffDays(companyId)
  const holidays = await getHolidaySet(companyId, fromStr, toStr)
  const range = eachDateInRange(fromStr, toStr)

  let count = 0
  let weeklyOffCount = 0
  let holidayCount = 0

  for (const d of range) {
    const dt = new Date(`${d}T12:00:00`)
    if (isWeeklyOff(dt, weeklyOffDays)) {
      weeklyOffCount += 1
      continue
    }
    if (holidays.has(d)) {
      holidayCount += 1
      continue
    }
    count += 1
  }

  if (withBreakdown) {
    return {
      days: count,
      totalDays: range.length,
      weeklyOffDays: weeklyOffCount,
      publicHolidays: holidayCount,
    }
  }
  return count
}

export async function hasOverlappingLeave(userId, fromStr, toStr, excludeRequestId = null) {
  const where = {
    userId,
    status: { [Op.in]: ['pending', 'approved'] },
    [Op.or]: [
      { fromDate: { [Op.between]: [fromStr, toStr] } },
      { toDate: { [Op.between]: [fromStr, toStr] } },
      { [Op.and]: [{ fromDate: { [Op.lte]: fromStr } }, { toDate: { [Op.gte]: toStr } }] },
    ],
  }
  if (excludeRequestId) where.id = { [Op.ne]: excludeRequestId }
  const row = await LeaveRequest.findOne({ where, attributes: ['id'] })
  return Boolean(row)
}

export async function getOrCreateBalance(userId, leaveTypeId, companyId, year, workspaceId) {
  let row = await LeaveBalance.findOne({
    where: { userId, leaveTypeId, companyId, workspaceId, year },
    include: [{ model: LeaveType, as: 'leaveType' }],
  })
  if (row) return row
  const lt = await LeaveType.findOne({ where: { id: leaveTypeId, companyId } })
  if (!lt) return null
  row = await LeaveBalance.create({
    userId,
    leaveTypeId,
    companyId,
    workspaceId,
    year,
    allocated: lt.daysPerYear,
    used: 0,
    pending: 0,
    available: lt.daysPerYear,
  })
  await row.reload({ include: [{ model: LeaveType, as: 'leaveType' }] })
  return row
}

export async function refreshBalanceAvailable(balanceRow) {
  const allocated = Number(balanceRow.allocated || 0)
  const used = Number(balanceRow.used || 0)
  const pending = Number(balanceRow.pending || 0)
  const available = Math.max(0, allocated - used - pending)
  await balanceRow.update({ available })
  return balanceRow
}

export async function validateLeaveRequest({
  userId,
  leaveTypeId,
  fromDate,
  toDate,
  companyId,
  workspaceId,
  allowPastForSick = false,
  isHalfDay = false,
}) {
  const fromStr = parseDateOnly(fromDate)
  const toStr = parseDateOnly(toDate)
  if (!fromStr || !toStr) {
    return { ok: false, message: 'Valid from and to dates are required' }
  }
  if (fromStr > toStr) {
    return { ok: false, message: 'From date must be on or before to date' }
  }

  const lt = await LeaveType.findOne({ where: { id: leaveTypeId, companyId } })
  if (!lt) return { ok: false, message: 'Leave type not found' }

  const today = new Date().toISOString().slice(0, 10)
  const isSick = String(lt.code || '').toUpperCase() === 'SL'
  if (!allowPastForSick && isSick && fromStr < today) {
    return { ok: false, message: 'Cannot apply leave for past dates (except sick leave)' }
  }

  const calDays = await calculateLeaveDays(fromStr, toStr, companyId)
  if (calDays <= 0) {
    return {
      ok: false,
      message: 'No working days in the selected range (weekly offs and public holidays are excluded)',
    }
  }

  const days = isHalfDay ? 0.5 : calDays

  if (await hasOverlappingLeave(userId, fromStr, toStr)) {
    return { ok: false, message: 'Leave dates overlap with an existing request' }
  }

  const year = new Date(fromStr).getFullYear()
  const balance = await getOrCreateBalance(userId, leaveTypeId, companyId, year, workspaceId)
  if (!balance) return { ok: false, message: 'Leave balance not found' }

  if (String(lt.code || '').toUpperCase() !== 'UL' && Number(balance.available) < days) {
    return {
      ok: false,
      message: `Insufficient balance. Available: ${balance.available}, requested: ${days}`,
    }
  }

  return { ok: true, days, leaveType: lt, balance, fromStr, toStr, year }
}
