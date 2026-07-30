import { createHmac, timingSafeEqual } from 'node:crypto'
import { EmailSuppression, LeadEmail, LeadEmailLog } from '../models/index.js'
import { primaryClientOrigin } from '../config/corsOrigins.js'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64',
)

/**
 * Signs the unsubscribe log_id so the link can't be brute-forced/guessed and the GET
 * step can be made side-effect-free (§3.7 of the bug audit). Reuses JWT_ACCESS_SECRET —
 * already a required, strong, server-only secret — rather than adding a new env var.
 */
export function signUnsubscribeToken(logId) {
  return createHmac('sha256', process.env.JWT_ACCESS_SECRET).update(String(logId)).digest('hex')
}

function verifyUnsubscribeToken(logId, sig) {
  if (!logId || !sig) return false
  const expected = signUnsubscribeToken(logId)
  const a = Buffer.from(expected)
  const b = Buffer.from(String(sig))
  return a.length === b.length && timingSafeEqual(a, b)
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** Every http(s) href present in a stored email body. */
function hrefsIn(html) {
  const out = new Set()
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m
  while ((m = re.exec(String(html || '')))) {
    try {
      const parsed = new URL(m[1])
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') out.add(parsed.href)
    } catch {
      // not an absolute URL — ignore
    }
  }
  return out
}

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
    // Only allow http(s) absolute URLs, AND only when that exact URL actually appeared
    // as a link in the email we sent (§3.12 of the bug audit) — otherwise this endpoint
    // is a working open redirector on our own domain:
    // /track/click?url=https://phishing.example works for ANY url with only the
    // protocol check. Cross-checking against the stored body means an attacker can't
    // just tack an arbitrary destination onto a real log_id/tracking id.
    let requested = ''
    try {
      const parsed = new URL(String(url || ''))
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') requested = parsed.href
    } catch {
      requested = ''
    }

    let destination = ''
    if (t === 'd' && id) {
      const row = await LeadEmail.findOne({ where: { trackingId: id }, attributes: ['bodyHtml'] })
      if (row && requested && hrefsIn(row.bodyHtml).has(requested)) destination = requested
      await LeadEmail.increment({ clickCount: 1 }, { where: { trackingId: id } })
      await LeadEmail.update({ clickedAt: new Date() }, { where: { trackingId: id, clickedAt: null } })
    } else if (log_id) {
      const row = await LeadEmailLog.findByPk(log_id, { attributes: ['bodyHtml'] })
      if (row && requested && hrefsIn(row.bodyHtml).has(requested)) destination = requested
      await LeadEmailLog.increment({ clickCount: 1 }, { where: { id: log_id } })
      await LeadEmailLog.update(
        { clickedAt: new Date(), status: 'clicked' },
        { where: { id: log_id, clickedAt: null } },
      )
    }
    return res.redirect(destination || primaryClientOrigin || '/')
  } catch (err) {
    return next(err)
  }
}

/**
 * GET is now side-effect-free (§3.7): Outlook Safe Links, Proofpoint, Mimecast and most
 * corporate scanners PREFETCH every link in an email, so a state-changing GET here was
 * silently unsubscribing recipients whose mail gateway merely scanned the message. This
 * just verifies the signature and hands off to a client confirmation page; the actual
 * suppression only happens on the explicit POST below.
 */
export async function unsubscribe(req, res, next) {
  try {
    const logId = String(req.query.log_id || '')
    const sig = String(req.query.sig || '')
    if (!verifyUnsubscribeToken(logId, sig)) {
      return res.redirect(`${primaryClientOrigin}/unsubscribe?error=invalid`)
    }
    return res.redirect(`${primaryClientOrigin}/unsubscribe?log_id=${encodeURIComponent(logId)}&sig=${encodeURIComponent(sig)}`)
  } catch (err) {
    return next(err)
  }
}

/** The actual unsubscribe action — only reachable via explicit POST from the confirmation page. */
export async function confirmUnsubscribe(req, res, next) {
  try {
    const logId = String(req.body?.log_id || '')
    const sig = String(req.body?.sig || '')
    if (!verifyUnsubscribeToken(logId, sig)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired unsubscribe link' } })
    }
    const log = await LeadEmailLog.findByPk(logId)
    if (log) {
      await log.update({ unsubscribed: true, status: 'unsubscribed' })
      const email = normalizeEmail(log.toEmail)
      if (email) {
        await EmailSuppression.findOrCreate({
          where: { companyId: log.companyId, email },
          defaults: {
            workspaceId: log.workspaceId,
            leadId: log.leadId,
            reason: 'unsubscribe',
            source: 'unsubscribe_link',
          },
        })
      }
    }
    return res.json({ success: true, data: { unsubscribed: true } })
  } catch (err) {
    return next(err)
  }
}
