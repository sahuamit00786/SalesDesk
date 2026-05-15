import { Op } from 'sequelize'
import {
  AttendanceLog,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  User,
} from '../models/index.js'

function dateOnlyStr(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export async function markAbsentForDate(dateStr = dateOnlyStr()) {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'companyId'],
  })
  let created = 0
  for (const user of users) {
    const existing = await AttendanceLog.findOne({
      where: { userId: user.id, date: dateStr },
    })
    if (existing) continue

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
