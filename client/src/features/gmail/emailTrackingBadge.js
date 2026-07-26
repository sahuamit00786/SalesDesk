// Single source of truth for send/open/click status badges, shared by the
// Gmail-thread views (LeadDetailPage Emails tab) and the Email Status list.
export function getEmailTrackingBadge({ status, openedAt, clickedAt }) {
  if (clickedAt) return { label: 'Clicked', className: 'bg-emerald-100 text-emerald-800' }
  if (openedAt) return { label: 'Opened', className: 'bg-indigo-100 text-indigo-800' }
  if (status === 'replied') return { label: 'Replied', className: 'bg-violet-100 text-violet-800' }
  if (status === 'bounced') return { label: 'Bounced', className: 'bg-rose-100 text-rose-800' }
  if (status === 'unsubscribed') return { label: 'Unsubscribed', className: 'bg-neutral-200 text-neutral-700' }
  if (status === 'sent') return { label: 'Sent', className: 'bg-sky-100 text-sky-800' }
  if (status === 'failed') return { label: 'Failed', className: 'bg-rose-100 text-rose-800' }
  return { label: 'Sending…', className: 'bg-neutral-100 text-neutral-700' }
}
