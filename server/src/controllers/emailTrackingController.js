import { EmailSuppression, LeadEmail, LeadEmailLog } from '../models/index.js'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64',
)

export async function trackOpen(req, res, next) {
  try {
    const { id, t, log_id } = req.query
    if (t === 'd' && id) {
      // Direct LeadEmail: increment count, set openedAt only on first open
      await LeadEmail.increment({ openCount: 1 }, { where: { trackingId: id } })
      await LeadEmail.update({ openedAt: new Date() }, { where: { trackingId: id, openedAt: null } })
    } else if (log_id) {
      // Template/bulk LeadEmailLog
      await LeadEmailLog.increment({ openCount: 1 }, { where: { id: log_id } })
      await LeadEmailLog.update(
        { openedAt: new Date(), status: 'opened' },
        { where: { id: log_id, openedAt: null } },
      )
    }
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return res.status(200).send(PIXEL)
  } catch (err) {
    return next(err)
  }
}

export async function trackClick(req, res, next) {
  try {
    const { id, t, log_id, url } = req.query
    // Only allow http(s) absolute URLs as redirect targets. Prevents the
    // tracker from being abused as an open redirector / javascript: sink.
    let destination = ''
    try {
      const parsed = new URL(String(url || ''))
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') destination = parsed.href
    } catch {
      destination = ''
    }
    if (t === 'd' && id) {
      await LeadEmail.increment({ clickCount: 1 }, { where: { trackingId: id } })
      await LeadEmail.update({ clickedAt: new Date() }, { where: { trackingId: id, clickedAt: null } })
    } else if (log_id) {
      await LeadEmailLog.increment({ clickCount: 1 }, { where: { id: log_id } })
      await LeadEmailLog.update(
        { clickedAt: new Date(), status: 'clicked' },
        { where: { id: log_id, clickedAt: null } },
      )
    }
    return res.redirect(destination || process.env.CLIENT_ORIGIN || '/')
  } catch (err) {
    return next(err)
  }
}

export async function unsubscribe(req, res, next) {
  try {
    const logId = String(req.query.log_id || '')
    const log = await LeadEmailLog.findByPk(logId)
    if (log) {
      await log.update({
        unsubscribed: true,
        status: 'unsubscribed',
      })
      if (log.toEmail) {
        await EmailSuppression.findOrCreate({
          where: { companyId: log.companyId, email: log.toEmail },
          defaults: {
            workspaceId: log.workspaceId,
            leadId: log.leadId,
            reason: 'unsubscribe',
            source: 'unsubscribe_link',
          },
        })
      }
    }
    return res.redirect(`${process.env.CLIENT_ORIGIN || ''}/unsubscribe-success`)
  } catch (err) {
    return next(err)
  }
}
