import cron from 'node-cron'
import { Op } from 'sequelize'
import { Campaign } from '../models/index.js'

let started = false

/** Flips active campaigns past their end date to inactive so they stop accepting new leads/payments. */
export async function inactivateExpiredCampaigns() {
  const today = new Date().toISOString().slice(0, 10)
  const [count] = await Campaign.update(
    { status: 'inactive' },
    { where: { status: 'active', endDate: { [Op.ne]: null, [Op.lt]: today } } },
  )
  return count
}

export function startCampaignExpiryJob() {
  if (started) return
  started = true

  cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        const n = await inactivateExpiredCampaigns()
        // eslint-disable-next-line no-console
        console.log(`[campaign-expiry-cron] inactivated ${n} expired campaign(s)`)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[campaign-expiry-cron] failed', err)
      }
    },
    { timezone: 'UTC' },
  )
}
