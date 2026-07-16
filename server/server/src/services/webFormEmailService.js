import { appDisplayName, buildMinimalEmailDocument, getMailTransport } from './mailService.js'

function renderTemplate(template, vars) {
  let out = String(template || '')
  Object.entries(vars || {}).forEach(([key, value]) => {
    out = out.replaceAll(`{{${key}}}`, String(value ?? ''))
  })
  return out
}

function htmlWrap(content) {
  return buildMinimalEmailDocument({ innerHtml: content })
}

export async function sendWebFormEmails({ form, submissionData, lead }) {
  const transport = getMailTransport()
  if (!transport) return

  const leadName = submissionData?.contactName || submissionData?.name || lead?.contactName || 'there'
  const leadEmail = submissionData?.email || lead?.email
  const vars = {
    name: leadName,
    email: leadEmail || '',
    form_name: form.name || '',
    submission_date: new Date().toLocaleString(),
  }

  const from = process.env.SMTP_FROM || `${appDisplayName()} <${process.env.SMTP_USER}>`

  if (form.sendConfirmationEmail && leadEmail) {
    const subject = renderTemplate(form.confirmationSubject || `Thanks for contacting us`, vars)
    const html = htmlWrap(renderTemplate(form.confirmationBody || 'Thank you for your submission.', vars))
    await transport.sendMail({ from, to: leadEmail, subject, html })
  }

  if (form.notifyOnSubmission && Array.isArray(form.notificationRecipients) && form.notificationRecipients.length) {
    const subject = renderTemplate(form.notificationSubject || `New web form submission: ${form.name}`, vars)
    const lines = Object.entries(submissionData || {})
      .map(([key, value]) => `<p style="margin:4px 0;"><strong>${key}:</strong> ${String(value ?? '')}</p>`)
      .join('')
    const html = htmlWrap(`<h3 style="margin-top:0;">New submission received</h3>${lines}`)
    await transport.sendMail({ from, to: form.notificationRecipients.join(','), subject, html })
  }
}
