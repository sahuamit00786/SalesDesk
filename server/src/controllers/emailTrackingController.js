import { EmailSuppression, LeadEmailLog } from '../models/index.js'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64',
)

export async function trackOpen(req, res, next) {
  try {
    const logId = String(req.query.log_id || '')
    if (logId) {
      await LeadEmailLog.update(
        {
          openedAt: new Date(),
          status: 'opened',
        },
        { where: { id: logId } },
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
    const logId = String(req.query.log_id || '')
    const destination = String(req.query.url || '')
    if (logId) {
      await LeadEmailLog.update(
        {
          clickedAt: new Date(),
          status: 'clicked',
        },
        { where: { id: logId } },
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
