import { appDisplayName, buildMinimalEmailDocument } from '../mailService.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function brandMarkHtml() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr><td style="width:44px;height:44px;border-radius:999px;background:#F3F4F6;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">&#9889;</td></tr></table>`
}

function primaryButtonHtml(href, label) {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;"><tr><td style="border-radius:999px;background:#111827;"><a href="${safeHref}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:999px;">${safeLabel}</a></td></tr></table>`
}

function statPill(label, value) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;background:#F9FAFB;border-radius:12px;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6B7280;">${escapeHtml(label)}</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(String(value))}</p>
    </td>
  </tr>
</table>`
}

function buildTeamNotificationEmail({ title, greetingName, introLines, stats, ctaHref, ctaLabel, footerNote }) {
  const app = appDisplayName()
  const safeName = escapeHtml(greetingName || 'there')
  const safeTitle = escapeHtml(title)
  const safeApp = escapeHtml(app)
  const introHtml = (introLines || [])
    .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#374151;">${line}</p>`)
    .join('')
  const statsHtml = (stats || []).map((s) => statPill(s.label, s.value)).join('')
  const ctaBlock = ctaHref ? `<p style="margin:24px 0 0;">${primaryButtonHtml(ctaHref, ctaLabel || 'Open in app')}</p>` : ''
  const footer = footerNote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">${footerNote}</p>`
    : `<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">You&apos;re receiving this because your team notification settings allow ${safeApp} to email you about workspace activity.</p>`
  const inner = `${brandMarkHtml()}
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#000000;line-height:1.25;">${safeTitle}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Hi ${safeName},</p>
${introHtml}
${statsHtml}
${ctaBlock}
${footer}`
  return buildMinimalEmailDocument({ innerHtml: inner })
}

export function buildLeadAssignedEmailHtml({
  recipientName,
  leadCount,
  workspaceName,
  actorName,
  companyName,
  viewUrl,
}) {
  const countLabel =
    leadCount === 1 ? '1 lead assigned to you' : `${leadCount} leads assigned to you`
  return buildTeamNotificationEmail({
    title: countLabel,
    greetingName: recipientName,
    introLines: [
      `<strong>${escapeHtml(actorName)}</strong> assigned ${escapeHtml(leadCount === 1 ? '1 lead' : `${leadCount} leads`)} to you in workspace <strong>${escapeHtml(workspaceName)}</strong> (${escapeHtml(companyName)}).`,
      leadCount > 1
        ? 'This was a bulk assignment — review your queue and follow up while they are still fresh.'
        : 'Review and follow up while it is still fresh.',
    ],
    stats: [
      { label: 'Leads assigned', value: leadCount },
      { label: 'Workspace', value: workspaceName },
      { label: 'Assigned by', value: actorName },
    ],
    ctaHref: viewUrl,
    ctaLabel: 'View leads',
  })
}

export function buildCampaignLeadsEmailHtml({
  recipientName,
  leadCount,
  campaignName,
  workspaceName,
  actorName,
  companyName,
  viewUrl,
}) {
  const countLabel = leadCount === 1 ? '1 lead' : `${leadCount} leads`
  return buildTeamNotificationEmail({
    title: `Added to campaign — ${campaignName}`,
    greetingName: recipientName,
    introLines: [
      `<strong>${escapeHtml(actorName)}</strong> added ${escapeHtml(countLabel)} to campaign <strong>${escapeHtml(campaignName)}</strong> in <strong>${escapeHtml(workspaceName)}</strong>.`,
      `Your team on ${escapeHtml(companyName)} is counting on you to work these prospects.`,
    ],
    stats: [
      { label: 'Leads in campaign', value: leadCount },
      { label: 'Campaign', value: campaignName },
      { label: 'Workspace', value: workspaceName },
    ],
    ctaHref: viewUrl,
    ctaLabel: 'Open campaign',
  })
}

export function buildTaskAssignedEmailHtml({
  recipientName,
  taskCount,
  taskTitles,
  workspaceName,
  actorName,
  viewUrl,
}) {
  const countLabel = taskCount === 1 ? 'A new task' : `${taskCount} new tasks`
  const listHtml =
    Array.isArray(taskTitles) && taskTitles.length
      ? `<ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">${taskTitles
          .slice(0, 5)
          .map((t) => `<li>${escapeHtml(t)}</li>`)
          .join('')}${taskTitles.length > 5 ? `<li>…and ${taskTitles.length - 5} more</li>` : ''}</ul>`
      : ''
  const introLines = [
    `<strong>${escapeHtml(actorName)}</strong> assigned ${escapeHtml(taskCount === 1 ? 'a task' : `${taskCount} tasks`)} to you in <strong>${escapeHtml(workspaceName)}</strong>.`,
  ]
  if (listHtml) introLines.push(listHtml)
  return buildTeamNotificationEmail({
    title: countLabel,
    greetingName: recipientName,
    introLines,
    stats: [{ label: 'Tasks assigned', value: taskCount }],
    ctaHref: viewUrl,
    ctaLabel: 'View tasks',
  })
}

export function buildTasksDueTodayEmailHtml({
  recipientName,
  taskCount,
  taskTitles,
  workspaceName,
  viewUrl,
}) {
  const intro =
    taskCount === 0
      ? 'Good news — you have no open tasks due today in this workspace.'
      : taskCount === 1
        ? 'You have <strong>1 task</strong> due today. Plan your day around it.'
        : `You have <strong>${taskCount} tasks</strong> due today. Here is your short list.`
  const listHtml =
    Array.isArray(taskTitles) && taskTitles.length
      ? `<ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">${taskTitles
          .slice(0, 8)
          .map((t) => `<li>${escapeHtml(t)}</li>`)
          .join('')}${taskTitles.length > 8 ? `<li>…and ${taskTitles.length - 8} more</li>` : ''}</ul>`
      : ''
  const introLines = [intro]
  if (listHtml) introLines.push(listHtml)
  return buildTeamNotificationEmail({
    title: taskCount === 0 ? 'No tasks due today' : `Tasks due today (${taskCount})`,
    greetingName: recipientName,
    introLines,
    stats: [
      { label: 'Due today', value: taskCount },
      { label: 'Workspace', value: workspaceName },
    ],
    ctaHref: viewUrl,
    ctaLabel: 'Open task list',
    footerNote:
      '<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6B7280;">Daily digest timing can be changed in Workspace settings → Email notifications.</p>',
  })
}

export function buildFollowupDueEmailHtml({ recipientName, leadName, scheduledAt, remark, viewUrl }) {
  const timeStr = scheduledAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduledAt))
    : 'soon'
  const introLines = [
    `Your follow-up with <strong>${escapeHtml(leadName || 'a lead')}</strong> is scheduled for <strong>${escapeHtml(timeStr)}</strong>.`,
  ]
  if (remark) introLines.push(`Remark: ${escapeHtml(remark)}`)
  return buildTeamNotificationEmail({
    title: 'Follow-up reminder',
    greetingName: recipientName,
    introLines,
    stats: [{ label: 'Scheduled', value: timeStr }],
    ctaHref: viewUrl,
    ctaLabel: 'Open lead',
  })
}

export function buildLeadEmailReplyEmailHtml({ recipientName, leadName, senderEmail, viewUrl }) {
  return buildTeamNotificationEmail({
    title: 'New email reply from lead',
    greetingName: recipientName,
    introLines: [
      `<strong>${escapeHtml(leadName || 'A lead')}</strong> has replied to your email.`,
      senderEmail ? `From: ${escapeHtml(senderEmail)}` : '',
    ].filter(Boolean),
    stats: [],
    ctaHref: viewUrl,
    ctaLabel: 'View email thread',
  })
}

export function buildMeetingReminderEmailHtml({ recipientName, meetingTitle, scheduledStart, meetLink, viewUrl }) {
  const timeStr = scheduledStart
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduledStart))
    : 'soon'
  const introLines = [
    `Your meeting <strong>${escapeHtml(meetingTitle || 'Meeting')}</strong> starts at <strong>${escapeHtml(timeStr)}</strong>.`,
  ]
  return buildTeamNotificationEmail({
    title: 'Meeting starting soon',
    greetingName: recipientName,
    introLines,
    stats: [{ label: 'Starts at', value: timeStr }],
    ctaHref: meetLink || viewUrl,
    ctaLabel: 'Join meeting',
  })
}

export function buildDailyDigestEmailHtml({ recipientName, taskCount, followupCount, meetingCount, taskTitles, meetingTitles, viewUrl }) {
  const parts = []
  if (meetingCount) parts.push(`${meetingCount} meeting${meetingCount > 1 ? 's' : ''}`)
  if (taskCount) parts.push(`${taskCount} task${taskCount > 1 ? 's' : ''} due`)
  if (followupCount) parts.push(`${followupCount} follow-up${followupCount > 1 ? 's' : ''} due`)
  const summary = parts.length ? parts.join(' · ') : 'Nothing scheduled'
  const list = [
    ...(meetingTitles || []).map((t) => `📅 ${escapeHtml(t)}`),
    ...(taskTitles || []).map((t) => `✅ ${escapeHtml(t)}`),
  ]
  return buildTeamNotificationEmail({
    title: 'Your day at a glance',
    greetingName: recipientName,
    introLines: [`Here's what's on your plate today: <strong>${escapeHtml(summary)}</strong>.`, ...list],
    stats: [
      { label: 'Meetings', value: String(meetingCount || 0) },
      { label: 'Tasks', value: String(taskCount || 0) },
      { label: 'Follow-ups', value: String(followupCount || 0) },
    ],
    ctaHref: viewUrl,
    ctaLabel: 'Open your day',
  })
}

export function buildWeeklySummaryEmailHtml({ recipientName, period, leadsCreated, leadsWon, tasksCompleted, tasksOverdue, viewUrl }) {
  const label = period === 'month' ? 'This month' : 'This week'
  return buildTeamNotificationEmail({
    title: `${label} on your team`,
    greetingName: recipientName,
    introLines: [`${label}'s activity across your team:`],
    stats: [
      { label: 'Leads created', value: String(leadsCreated || 0) },
      { label: 'Leads won', value: String(leadsWon || 0) },
      { label: 'Tasks done', value: String(tasksCompleted || 0) },
      { label: 'Overdue tasks', value: String(tasksOverdue || 0) },
    ],
    ctaHref: viewUrl,
    ctaLabel: 'View reports',
  })
}

export function buildSecurityAlertEmailHtml({ recipientName, kind, viewUrl }) {
  const what = kind === 'email' ? 'account email' : 'password'
  return buildTeamNotificationEmail({
    title: 'Security alert',
    greetingName: recipientName,
    introLines: [
      `Your ${what} was just changed.`,
      `If this was you, no action is needed. If it wasn't, secure your account immediately and contact your admin.`,
    ],
    stats: [],
    ctaHref: viewUrl,
    ctaLabel: 'Review account security',
  })
}

export function buildDocumentSharedEmailHtml({ recipientName, actorName, documentName, viewUrl }) {
  return buildTeamNotificationEmail({
    title: 'A document was shared with you',
    greetingName: recipientName,
    introLines: [`${escapeHtml(actorName || 'A teammate')} shared "${escapeHtml(documentName || 'a document')}" with you.`],
    stats: [],
    ctaHref: viewUrl,
    ctaLabel: 'Open document',
  })
}

export function buildPaymentReceivedEmailHtml({ recipientName, invoiceNumber, amount, currency, viewUrl }) {
  return buildTeamNotificationEmail({
    title: 'Payment received',
    greetingName: recipientName,
    introLines: [`A payment of ${escapeHtml(String(currency || ''))} ${escapeHtml(String(amount || ''))} was recorded on invoice ${escapeHtml(invoiceNumber || '')}.`],
    stats: [],
    ctaHref: viewUrl,
    ctaLabel: 'View invoice',
  })
}

export function subjectForEvent(eventType, payload) {
  const app = appDisplayName()
  switch (eventType) {
    case 'lead_assigned': {
      const n = payload.leadCount || 1
      return n === 1 ? `${app} — 1 lead assigned to you` : `${app} — ${n} leads assigned to you`
    }
    case 'campaign_leads_added':
      return `${app} — ${payload.leadCount || 1} lead(s) added to ${payload.campaignName || 'campaign'}`
    case 'task_assigned': {
      const n = payload.taskCount || 1
      return n === 1 ? `${app} — New task assigned` : `${app} — ${n} tasks assigned to you`
    }
    case 'tasks_due_today':
      return `${app} — ${payload.taskCount || 0} task(s) due today`
    case 'followup_due':
      return `${app} — Follow-up reminder: ${payload.leadName || 'Lead'}`
    case 'lead_email_reply':
      return `${app} — ${payload.leadName || 'A lead'} replied to your email`
    case 'meeting_reminder':
      return `${app} — Meeting "${payload.meetingTitle || 'Meeting'}" starts in 10 minutes`
    case 'digest_daily':
      return `${app} — Your day: ${payload.meetingCount || 0} meetings, ${payload.taskCount || 0} tasks`
    case 'digest_weekly':
      return `${app} — ${payload.period === 'month' ? 'Monthly' : 'Weekly'} team summary`
    case 'lead_status_changed':
      return `${app} — ${payload.leadName || 'A lead'} ${payload.reassignedAwayTo ? 'was reassigned' : 'status changed'}`
    case 'lead_note_added':
      return `${app} — New note on ${payload.leadName || 'a lead'}`
    case 'opportunity_stage_changed':
      return `${app} — Opportunity ${payload.created ? 'created' : 'updated'}`
    case 'deal_stage_changed':
      return `${app} — Deal ${payload.created ? 'created' : 'updated'}`
    case 'task_comment_added':
      return `${app} — New comment on "${payload.taskTitle || 'a task'}"`
    case 'invoice_created':
      return `${app} — Invoice ${payload.invoiceNumber || ''} created`
    case 'invoice_payment_received':
      return `${app} — Payment received on ${payload.invoiceNumber || 'invoice'}`
    case 'document_shared':
      return `${app} — A document was shared with you`
    case 'call_reminder':
      return `${app} — Call reminder`
    case 'security_password_changed':
    case 'security_email_changed':
      return `${app} — Security alert`
    case 'leave_decided':
      return payload.status === 'approved' ? `${app} — Leave approved` : `${app} — Leave rejected`
    default:
      return `${app} — Team notification`
  }
}

export function buildHtmlForEvent(eventType, payload) {
  switch (eventType) {
    case 'lead_assigned':
      return buildLeadAssignedEmailHtml(payload)
    case 'campaign_leads_added':
      return buildCampaignLeadsEmailHtml(payload)
    case 'task_assigned':
      return buildTaskAssignedEmailHtml(payload)
    case 'tasks_due_today':
      return buildTasksDueTodayEmailHtml(payload)
    case 'followup_due':
      return buildFollowupDueEmailHtml(payload)
    case 'lead_email_reply':
      return buildLeadEmailReplyEmailHtml(payload)
    case 'meeting_reminder':
      return buildMeetingReminderEmailHtml(payload)
    case 'digest_daily':
      return buildDailyDigestEmailHtml(payload)
    case 'digest_weekly':
      return buildWeeklySummaryEmailHtml(payload)
    case 'document_shared':
      return buildDocumentSharedEmailHtml(payload)
    case 'invoice_payment_received':
      return buildPaymentReceivedEmailHtml(payload)
    case 'security_password_changed':
    case 'security_email_changed':
      return buildSecurityAlertEmailHtml(payload)
    default:
      return buildTeamNotificationEmail({
        title: 'Notification',
        greetingName: payload.recipientName,
        introLines: [escapeHtml(payload.message || 'You have a new notification.')],
        stats: [],
        ctaHref: payload.viewUrl,
      })
  }
}
