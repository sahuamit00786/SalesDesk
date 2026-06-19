import nodemailer from 'nodemailer'
import { OTP_EXPIRY_MIN } from './otpService.js'

let transporter = null

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export function getMailTransport() {
  if (!smtpConfigured()) return null
  if (transporter) return transporter
  const port = Number(process.env.SMTP_PORT) || 587
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

export function appDisplayName() {
  const n = String(process.env.APP_PUBLIC_NAME || 'SalesDesk').trim()
  return n || 'SalesDesk'
}

function fromAddress() {
  return process.env.SMTP_FROM || `${appDisplayName()} <${process.env.SMTP_USER}>`
}

export function companyRegistrationNotifyEmail() {
  return String(process.env.COMPANY_REGISTRATION_NOTIFY_EMAIL || 'sahuamit00786@gmail.com').trim()
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MINIMAL_FONT =
  'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'

/** Subtle grid + base gray; degrades to flat fill where gradients are unsupported. */
const PAGE_TD_STYLE = `padding:48px 20px;background-color:#F9F9F9;background-image:linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px);background-size:20px 20px;`

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

function brandMarkHtml() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr><td style="width:44px;height:44px;border-radius:999px;background:#F3F4F6;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">&#9889;</td></tr></table>`
}

function primaryButtonHtml(href, label) {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;"><tr><td style="border-radius:999px;background:#111827;"><a href="${safeHref}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:999px;">${safeLabel}</a></td></tr></table>`
}

/**
 * One complete HTML email: centered white card on light grid background.
 * @param {{ innerHtml: string }} opts — HTML fragment for the card body (already escaped where needed).
 */
export function buildMinimalEmailDocument({ innerHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title></title>
</head>
<body style="margin:0;padding:0;${MINIMAL_FONT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100%;">
    <tr>
      <td align="center" valign="middle" style="${PAGE_TD_STYLE}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="background:#ffffff;border-radius:28px;padding:36px 32px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
              ${innerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildOtpCodeRowHtml(otp) {
  const safeOtp = escapeHtml(otp)
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;background:#F3F4F6;border-radius:10px;">
  <tr>
    <td width="40" style="font-size:1px;line-height:1px;">&nbsp;</td>
    <td align="center" style="padding:16px 8px;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:0.22em;color:#000000;">${safeOtp}</td>
    <td width="44" align="center" valign="middle" style="padding:8px 12px 8px 0;">${COPY_ICON_SVG}</td>
  </tr>
</table>`
}

function otpDisclaimerFooterHtml(appName) {
  const safeApp = escapeHtml(appName)
  return `<p style="margin:28px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">If you didn&apos;t request this for ${safeApp}, you can safely ignore this email. Someone else might have typed your email address by mistake.</p>`
}

export function buildOtpEmailHtml({ name, otp }) {
  const safeName = escapeHtml(name)
  const app = appDisplayName()
  const safeApp = escapeHtml(app)
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">Verify your email</h1>
<p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">You started signing up for <strong>${safeApp}</strong>. Your one-time code is:</p>
${buildOtpCodeRowHtml(otp)}
<p style="margin:20px 0 0;font-size:15px;font-weight:700;color:#000000;line-height:1.4;">This code expires in ${OTP_EXPIRY_MIN} minutes.</p>
${otpDisclaimerFooterHtml(app)}`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

/** Single message: welcome copy + verification code (one valid HTML document). */
export function buildRegistrationVerificationEmailHtml({ name, companyName, email, otp }) {
  const safeName = escapeHtml(name)
  const safeCompany = escapeHtml(companyName)
  const safeEmail = escapeHtml(email)
  const app = appDisplayName()
  const safeApp = escapeHtml(app)
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">Welcome — verify your email</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Your workspace for <strong>${safeCompany}</strong> on <strong>${safeApp}</strong> is almost ready. We received a registration request for <strong>${safeEmail}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#374151;">Your password was set securely on our servers — we never store it in plain text and we will not repeat it in email.</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">Your one-time verification code is:</p>
${buildOtpCodeRowHtml(otp)}
<p style="margin:20px 0 0;font-size:15px;font-weight:700;color:#000000;line-height:1.4;">This code expires in ${OTP_EXPIRY_MIN} minutes.</p>
${otpDisclaimerFooterHtml(app)}`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

export function buildCompanyRegistrationNotifyEmailHtml({ company, user, registeredAt }) {
  const safeCompany = escapeHtml(company?.name || '—')
  const safeCompanyId = escapeHtml(company?.id || '—')
  const safeUserName = escapeHtml(user?.name || '—')
  const safeUserEmail = escapeHtml(user?.email || '—')
  const safeWhen = escapeHtml(
    registeredAt instanceof Date ? registeredAt.toISOString() : String(registeredAt || new Date().toISOString()),
  )
  const app = appDisplayName()
  const safeApp = escapeHtml(app)
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">New company registered</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">A new company signed up on <strong>${safeApp}</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
  <tr><td style="padding:8px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Company</td></tr>
  <tr><td style="padding:0 0 4px;font-size:15px;font-weight:600;color:#111827;">${safeCompany}</td></tr>
  <tr><td style="padding:0 0 16px;font-size:13px;color:#6B7280;">ID: ${safeCompanyId}</td></tr>
  <tr><td style="padding:8px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Admin user</td></tr>
  <tr><td style="padding:0 0 4px;font-size:15px;color:#111827;">${safeUserName}</td></tr>
  <tr><td style="padding:0 0 16px;font-size:14px;color:#374151;">${safeUserEmail}</td></tr>
  <tr><td style="padding:8px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Registered at</td></tr>
  <tr><td style="padding:0;font-size:14px;color:#374151;">${safeWhen}</td></tr>
</table>`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

/** Internal alert when a new company registers (does not throw if SMTP is missing). */
export async function sendCompanyRegistrationNotifyEmail({ company, user, registeredAt = new Date() }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const app = appDisplayName()
  const to = companyRegistrationNotifyEmail()
  if (!to) return { sent: false }

  const companyName = company?.name || 'Unknown company'
  const html = buildCompanyRegistrationNotifyEmailHtml({ company, user, registeredAt })
  const text = [
    `New company registered on ${app}`,
    '',
    `Company: ${companyName}`,
    `Company ID: ${company?.id || '—'}`,
    `Admin: ${user?.name || '—'} <${user?.email || '—'}>`,
    `Registered at: ${registeredAt instanceof Date ? registeredAt.toISOString() : registeredAt}`,
  ].join('\n')

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${app} mail] SMTP not configured. Company registration notify -> ${to}\n${text}`)
    }
    return { sent: false }
  }

  await transport.sendMail({
    from,
    to,
    subject: `New company registered — ${companyName}`,
    html,
    text,
  })

  return { sent: true }
}

export async function sendRegistrationEmails({ to, name, companyName, otpPlain }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const app = appDisplayName()
  const html = buildRegistrationVerificationEmailHtml({
    name,
    companyName,
    email: to,
    otp: otpPlain,
  })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${app} mail] SMTP not configured. Verification OTP for ${to}: ${otpPlain}`)
      return { sent: false, devOtp: otpPlain }
    }
    const err = new Error('SMTP is not configured')
    err.status = 503
    err.code = 'SMTP_UNAVAILABLE'
    err.publicMessage = 'Email delivery is not configured on the server'
    throw err
  }

  await transport.sendMail({
    from,
    to,
    subject: `Welcome to ${app} — verify your email`,
    html,
    text: `Hi ${name},\n\nWelcome to ${app} (${companyName}). Your verification code is: ${otpPlain}\n\nThis code expires in ${OTP_EXPIRY_MIN} minutes.\n`,
  })

  return { sent: true }
}

export async function sendPasswordResetOtpEmail({ to, name, otpPlain }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const app = appDisplayName()
  const safeName = escapeHtml(name)
  const safeApp = escapeHtml(app)
  const html = buildMinimalEmailDocument({
    innerHtml: `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">Reset your password</h1>
<p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">Use this code to reset your <strong>${safeApp}</strong> password:</p>
${buildOtpCodeRowHtml(otpPlain)}
<p style="margin:20px 0 0;font-size:15px;font-weight:700;color:#000000;line-height:1.4;">This code expires in ${OTP_EXPIRY_MIN} minutes.</p>
${otpDisclaimerFooterHtml(app)}`,
  })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${app} mail] SMTP not configured. Password reset OTP for ${to}: ${otpPlain}`)
      return { sent: false, devOtp: otpPlain }
    }
    const err = new Error('SMTP is not configured')
    err.status = 503
    err.code = 'SMTP_UNAVAILABLE'
    err.publicMessage = 'Email delivery is not configured on the server'
    throw err
  }

  await transport.sendMail({
    from,
    to,
    subject: `${app} — password reset code`,
    html,
    text: `Hi ${name},\n\nYour ${app} password reset code is: ${otpPlain}\n\nThis code expires in ${OTP_EXPIRY_MIN} minutes.\n`,
  })

  return { sent: true }
}

export async function sendResendOtpEmail({ to, name, otpPlain }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const app = appDisplayName()
  const html = buildOtpEmailHtml({ name, otp: otpPlain })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${app} mail] SMTP not configured. Resent OTP for ${to}: ${otpPlain}`)
      return { sent: false, devOtp: otpPlain }
    }
    const err = new Error('SMTP is not configured')
    err.status = 503
    err.code = 'SMTP_UNAVAILABLE'
    err.publicMessage = 'Email delivery is not configured on the server'
    throw err
  }

  await transport.sendMail({
    from,
    to,
    subject: `${app} — your new verification code`,
    html,
    text: `Hi ${name},\n\nYour new ${app} verification code is: ${otpPlain}\n\nThis code expires in ${OTP_EXPIRY_MIN} minutes.\n`,
  })

  return { sent: true }
}

export function buildTeamInviteEmailHtml({ name, companyName, inviteUrl, roleName, workspaceNames }) {
  const safeName = escapeHtml(name)
  const safeCompany = escapeHtml(companyName)
  const safeUrl = escapeHtml(inviteUrl)
  const safeRole = escapeHtml(roleName || 'Team member')
  const app = appDisplayName()
  const safeApp = escapeHtml(app)
  const workspaceList = Array.isArray(workspaceNames) ? workspaceNames : []
  const workspaceHtml = workspaceList.length
    ? workspaceList
        .map(
          (w) =>
            `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;border-radius:999px;background:#F3F4F6;color:#374151;font-size:12px;font-weight:500;">${escapeHtml(w)}</span>`,
        )
        .join('')
    : '<span style="font-size:14px;color:#6B7280;">Workspace access will be configured by your admin.</span>'
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">You&apos;re invited</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">You have been invited to join <strong>${safeCompany}</strong> on <strong>${safeApp}</strong>.</p>
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Assigned role</p>
<p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">${safeRole}</p>
<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Workspace access</p>
<div style="margin:0 0 24px;">${workspaceHtml}</div>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">This secure link expires in <strong>48 hours</strong>.</p>
<p style="margin:0 0 20px;">${primaryButtonHtml(inviteUrl, 'Accept invitation')}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#6B7280;">For security, your password is never sent by email. You will create it when accepting the invitation.</p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">If the button does not work, paste this URL into your browser:<br/><span style="word-break:break-all;color:#374151;">${safeUrl}</span></p>`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

export async function sendTeamInviteEmail({ to, name, companyName, inviteUrl, roleName, workspaceNames }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const app = appDisplayName()
  const html = buildTeamInviteEmailHtml({ name, companyName, inviteUrl, roleName, workspaceNames })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${app} mail] SMTP not configured. Invite link for ${to}:\n${inviteUrl}`)
      return { sent: false }
    }
    const err = new Error('SMTP is not configured')
    err.status = 503
    err.code = 'SMTP_UNAVAILABLE'
    err.publicMessage = 'Email delivery is not configured on the server'
    throw err
  }

  await transport.sendMail({
    from,
    to,
    subject: `Invitation to ${companyName} — ${app}`,
    html,
    text: `Hi ${name},\n\nYou are invited to join ${companyName} on ${app}.\nRole: ${roleName || 'Team member'}\nWorkspace access: ${(workspaceNames || []).join(', ') || 'Configured by your admin'}\nAccept your invite (48h): ${inviteUrl}\n\nFor security, set your own password from the secure invite page.\n`,
  })

  return { sent: true }
}

export function buildMeetingEmailHtml({ leadName, meetingTitle, agenda, startTime, meetLink }) {
  const safeName = escapeHtml(leadName || 'there')
  const safeTitle = escapeHtml(meetingTitle)
  const safeAgenda = escapeHtml(agenda || '')
  const safeTime = escapeHtml(startTime)
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">${safeTitle}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">You have a scheduled meeting.</p>
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Agenda</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#111827;">${safeAgenda || '—'}</p>
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">Date &amp; time</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#111827;">${safeTime}</p>
${
  meetLink
    ? `<p style="margin:0 0 16px;">${primaryButtonHtml(meetLink, 'Join meeting')}</p>`
    : `<p style="margin:0;font-size:14px;color:#6B7280;">Meeting link will be shared soon.</p>`
}
<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">If you did not expect this message, you can ignore it.</p>`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

export async function sendMeetingEmail({
  to,
  leadName,
  meetingTitle,
  agenda,
  scheduledStart,
  meetLink,
}) {
  const transport = getMailTransport()
  const from = fromAddress()

  const html = buildMeetingEmailHtml({
    leadName,
    meetingTitle,
    agenda,
    startTime: new Date(scheduledStart).toLocaleString(),
    meetLink,
  })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[Meeting Email] Not sent. Link: ${meetLink}`)
      return { sent: false }
    }
    throw new Error('SMTP not configured')
  }

  await transport.sendMail({
    from,
    to,
    subject: `Meeting: ${meetingTitle}`,
    html,
    text: `Meeting: ${meetingTitle}\nDate: ${new Date(scheduledStart).toLocaleString()}\nLink: ${meetLink || 'Not available'}\n`,
  })

  return { sent: true }
}
