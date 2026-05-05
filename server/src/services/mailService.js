import nodemailer from 'nodemailer'

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

function fromAddress() {
  return process.env.SMTP_FROM || `SalesDesk <${process.env.SMTP_USER}>`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildRegistrationEmailHtml({ name, companyName, email }) {
  const safeName = escapeHtml(name)
  const safeCompany = escapeHtml(companyName)
  const safeEmail = escapeHtml(email)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6fb;font-family:Segoe UI,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,17,23,.08);">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#2451eb 0%,#3b73f5 100%);color:#fff;">
          <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.9;">SalesDesk</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Welcome aboard</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#0f1117;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 16px;">Hi ${safeName},</p>
          <p style="margin:0 0 16px;">Your SalesDesk workspace for <strong>${safeCompany}</strong> is almost ready. We received a registration request for <strong>${safeEmail}</strong>.</p>
          <p style="margin:0 0 8px;">Your password was set securely on our servers — we never store it in plain text and we will not repeat it in email.</p>
          <p style="margin:16px 0 0;color:#4b5263;font-size:14px;">Use the 6-digit code in the next message (or the same thread if combined) to verify your email and start managing leads.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildOtpEmailHtml({ name, otp }) {
  const safeName = escapeHtml(name)
  const safeOtp = escapeHtml(otp)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6fb;font-family:Segoe UI,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,17,23,.08);">
        <tr><td style="padding:28px 32px;background:#0f1117;color:#fff;">
          <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">Verify your email</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">SalesDesk</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#0f1117;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 20px;">Hi ${safeName}, enter this code in the app to confirm your address:</p>
          <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.25em;color:#2451eb;text-align:center;">${safeOtp}</p>
          <p style="margin:24px 0 0;color:#8b93a8;font-size:13px;">This code expires in 15 minutes. If you did not sign up, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendRegistrationEmails({ to, name, companyName, otpPlain }) {
  const transport = getMailTransport()
  const from = fromAddress()

  const welcomeHtml = buildRegistrationEmailHtml({ name, companyName, email: to })
  const otpHtml = buildOtpEmailHtml({ name, otp: otpPlain })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[SalesDesk mail] SMTP not configured. Verification OTP for ${to}: ${otpPlain}`)
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
    subject: 'Welcome to SalesDesk — verify your email',
    html: `${welcomeHtml}<div style="height:24px"></div>${otpHtml}`,
    text: `Hi ${name},\n\nWelcome to SalesDesk (${companyName}). Your verification code is: ${otpPlain}\n\nThis code expires in 15 minutes.\n`,
  })

  return { sent: true }
}

export async function sendResendOtpEmail({ to, name, otpPlain }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const html = buildOtpEmailHtml({ name, otp: otpPlain })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[SalesDesk mail] SMTP not configured. Resent OTP for ${to}: ${otpPlain}`)
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
    subject: 'SalesDesk — your new verification code',
    html,
    text: `Hi ${name},\n\nYour new SalesDesk verification code is: ${otpPlain}\n\nThis code expires in 15 minutes.\n`,
  })

  return { sent: true }
}

export function buildTeamInviteEmailHtml({ name, companyName, inviteUrl, roleName, workspaceNames }) {
  const safeName = escapeHtml(name)
  const safeCompany = escapeHtml(companyName)
  const safeUrl = escapeHtml(inviteUrl)
  const safeRole = escapeHtml(roleName || 'Team member')
  const workspaceList = Array.isArray(workspaceNames) ? workspaceNames : []
  const workspaceHtml = workspaceList.length
    ? workspaceList
        .map((w) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#1e2a78;font-size:12px;">${escapeHtml(w)}</span>`)
        .join('')
    : '<span style="font-size:13px;color:#60677a;">Workspace access will be configured by your admin.</span>'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6fb;font-family:Segoe UI,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,17,23,.08);">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#2451eb 0%,#3b73f5 100%);color:#fff;">
          <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.9;">SalesDesk</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">You are invited</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#0f1117;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 16px;">Hi ${safeName},</p>
          <p style="margin:0 0 12px;">You have been invited to join <strong>${safeCompany}</strong> on SalesDesk.</p>
          <p style="margin:0 0 6px;font-size:13px;color:#60677a;text-transform:uppercase;letter-spacing:.08em;">Assigned role</p>
          <p style="margin:0 0 14px;font-weight:600;">${safeRole}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#60677a;text-transform:uppercase;letter-spacing:.08em;">Workspace access</p>
          <div style="margin:0 0 18px;">${workspaceHtml}</div>
          <p style="margin:0 0 20px;">This secure link expires in <strong>48 hours</strong>:</p>
          <p style="margin:0;"><a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#2451eb;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">Accept invitation</a></p>
          <p style="margin:20px 0 0;color:#4b5263;font-size:13px;">For security, your password is never sent by email. You will create it when accepting the invitation.</p>
          <p style="margin:16px 0 0;color:#8b93a8;font-size:13px;">If the button does not work, paste this URL into your browser:<br/><span style="word-break:break-all;">${safeUrl}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendTeamInviteEmail({ to, name, companyName, inviteUrl, roleName, workspaceNames }) {
  const transport = getMailTransport()
  const from = fromAddress()
  const html = buildTeamInviteEmailHtml({ name, companyName, inviteUrl, roleName, workspaceNames })

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[SalesDesk mail] SMTP not configured. Invite link for ${to}:\n${inviteUrl}`)
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
    subject: `Invitation to ${companyName} — SalesDesk`,
    html,
    text: `Hi ${name},\n\nYou are invited to join ${companyName} on SalesDesk.\nRole: ${roleName || 'Team member'}\nWorkspace access: ${(workspaceNames || []).join(', ') || 'Configured by your admin'}\nAccept your invite (48h): ${inviteUrl}\n\nFor security, set your own password from the secure invite page.\n`,
  })

  return { sent: true }
}


// ==============================
// 📅 MEETING EMAIL
// ==============================

export function buildMeetingEmailHtml({
  leadName,
  meetingTitle,
  agenda,
  startTime,
  meetLink,
}) {
  const safeName = escapeHtml(leadName || "there");
  const safeTitle = escapeHtml(meetingTitle);
  const safeAgenda = escapeHtml(agenda || "");
  const safeTime = escapeHtml(startTime);
  const safeLink = escapeHtml(meetLink || "");

  return `<!DOCTYPE html>
<html>
<body style="font-family:Segoe UI,sans-serif;background:#f4f6fb;padding:20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:24px;">
    
    <h2 style="margin:0 0 12px;">📅 ${safeTitle}</h2>

    <p>Hi ${safeName},</p>

    <p>You have a scheduled meeting.</p>

    <p><b>Agenda:</b> ${safeAgenda || "N/A"}</p>

    <p><b>Date & Time:</b> ${safeTime}</p>

    ${
      meetLink
        ? `<p style="margin-top:20px;">
            <a href="${safeLink}" 
               style="background:#2451eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
               Join Meeting
            </a>
          </p>`
        : `<p style="color:#888;">Meeting link will be shared soon.</p>`
    }

  </div>
</body>
</html>`;
}

export async function sendMeetingEmail({
  to,
  leadName,
  meetingTitle,
  agenda,
  scheduledStart,
  meetLink,
}) {
  const transport = getMailTransport();
  const from = fromAddress();

  const html = buildMeetingEmailHtml({
    leadName,
    meetingTitle,
    agenda,
    startTime: new Date(scheduledStart).toLocaleString(),
    meetLink,
  });

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Meeting Email] Not sent. Link: ${meetLink}`);
      return { sent: false };
    }
    throw new Error("SMTP not configured");
  }

  await transport.sendMail({
    from,
    to,
    subject: `Meeting: ${meetingTitle}`,
    html,
    text: `
Meeting: ${meetingTitle}
Date: ${new Date(scheduledStart).toLocaleString()}
Link: ${meetLink || "Not available"}
    `,
  });

  return { sent: true };
}