import { Op } from 'sequelize'
import {
  AttendanceLog,
  Company,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PublicHoliday,
  User,
} from '../models/index.js'
import { createNotification } from './notificationService.js'

function dateOnlyStr(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

/** Returns day-of-week (0=Sun … 6=Sat) for a 'yyyy-MM-dd' string without UTC shift. */
function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function normalizeWeeklyOffDays(raw) {
  if (!Array.isArray(raw) || !raw.length) return [0, 6] // default: Sun + Sat
  return [...new Set(raw.map(Number).filter((n) => n >= 0 && n <= 6))]
}

export async function markAbsentForDate(dateStr = dateOnlyStr()) {
  const dow = getDayOfWeek(dateStr)

  // Load all companies (weekly off days) and holidays for this date in one pass
  const [companies, holidays] = await Promise.all([
    Company.findAll({ attributes: ['id', 'leaveWeeklyOffDays'] }),
    PublicHoliday.findAll({ where: { date: dateStr }, attributes: ['companyId'] }),
  ])

  const companyMap = new Map(companies.map((c) => [String(c.id), c]))
  // Set of companyIds that have a public holiday on this date
  const holidayCompanyIds = new Set(holidays.map((h) => String(h.companyId)))

  const users = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'companyId'],
  })

  let created = 0
  for (const user of users) {
    const cid = String(user.companyId)
    const company = companyMap.get(cid)
    const weeklyOffDays = normalizeWeeklyOffDays(company?.leaveWeeklyOffDays)

    // Skip: weekly off day for this company
    if (weeklyOffDays.includes(dow)) continue

    // Skip: public holiday for this company
    if (holidayCompanyIds.has(cid)) continue

    // Skip: log already exists (checked in, already absent, etc.)
    const existing = await AttendanceLog.findOne({
      where: { userId: user.id, date: dateStr },
    })
    if (existing) continue

    // Skip: user has an approved leave covering this date
    // (the team calendar view derives on_leave status from LeaveRequest directly)
    const onApprovedLeave = await LeaveRequest.findOne({
      where: {
        userId: user.id,
        status: 'approved',
        fromDate: { [Op.lte]: dateStr },
        toDate: { [Op.gte]: dateStr },
      },
      attributes: ['id'],
    })
    if (onApprovedLeave) continue

    await AttendanceLog.create({
      userId: user.id,
      companyId: user.companyId,
      date: dateStr,
      status: 'absent',
    })
    createNotification({
      userId: user.id,
      companyId: user.companyId,
      title: 'Marked absent',
      message: `You were marked absent on ${dateStr}.`,
      type: 'attendance',
      link: '/attendance',
    }).catch(() => {})
    created += 1
  }
  return created
}

export async function resetYearlyLeaveBalances(year) {
  const targetYear = year || new Date().getFullYear()
  const prevYear = targetYear - 1
  const leaveTypes = await LeaveType.findAll()
  const users = await User.findAll({ where: { isActive: true }, attributes: ['id', 'companyId'] })
  let upserted = 0

  for (const user of users) {
    const types = leaveTypes.filter((lt) => String(lt.companyId) === String(user.companyId))
    for (const lt of types) {
      const prev = await LeaveBalance.findOne({
        where: { userId: user.id, leaveTypeId: lt.id, companyId: user.companyId, year: prevYear },
      })
      let carry = 0
      if (lt.carryForward && prev) {
        carry = Math.min(Number(prev.available || 0), Number(lt.maxCarryForwardDays || 0))
      }
      const allocated = Number(lt.daysPerYear || 0) + carry
      const [row] = await LeaveBalance.findOrCreate({
        where: {
          userId: user.id,
          leaveTypeId: lt.id,
          companyId: user.companyId,
          year: targetYear,
        },
        defaults: {
          allocated,
          used: 0,
          pending: 0,
          available: allocated,
        },
      })
      if (row && !row.isNewRecord) {
        await row.update({ allocated, used: 0, pending: 0, available: allocated })
      }
      upserted += 1
    }
  }
  return upserted
}
