import cron from 'node-cron'
import { markAbsentForDate, resetYearlyLeaveBalances } from '../services/attendanceCronService.js'

let started = false

export function startAttendanceJob() {
  if (started) return
  started = true

  cron.schedule('59 23 * * *', async () => {
    try {
      const created = await markAbsentForDate()
      // eslint-disable-next-line no-console
      console.log(`[attendance-cron] marked ${created} absent record(s)`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[attendance-cron] mark absent failed', err)
    }
  }, { timezone: 'UTC' })

  cron.schedule('0 0 1 1 *', async () => {
    try {
      const year = new Date().getFullYear()
      const n = await resetYearlyLeaveBalances(year)
      // eslint-disable-next-line no-console
      console.log(`[attendance-cron] reset ${n} leave balance row(s) for ${year}`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[attendance-cron] yearly reset failed', err)
    }
  }, { timezone: 'UTC' })
}
