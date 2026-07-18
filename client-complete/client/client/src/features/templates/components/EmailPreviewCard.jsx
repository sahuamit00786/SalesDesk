import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { useSelector } from 'react-redux'
import { File as FileIcon, FileText, Image as ImageIcon, Paperclip, Star } from '@/components/ui/icons'
import { fillMergeTags } from '@/features/templates/mergeTags'

function formatSize(bytes) {
  const num = Number(bytes) || 0
  if (num >= 1024 * 1024) return `${(num / 1024 / 1024).toFixed(2)} MB`
  if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`
  return num ? `${num} B` : ''
}

function fileIconFor(name) {
  const ext = String(name || '').toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return ImageIcon
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return FileText
  return FileIcon
}

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] || ''
  const second = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${second}`.toUpperCase()
}

/**
 * SaaS-quality email preview card. Renders the template as if it had been sent
 * by the currently logged-in user, complete with avatar, sender identity,
 * subject row, sanitized body, and an attachment chip strip.
 */
export function EmailPreviewCard({ subject, bodyHtml, attachments = [], sampleValues = {} }) {
  const authUser = useSelector((state) => state.auth.user)
  const senderName = authUser?.name || 'You'
  const senderEmail = authUser?.email || 'me@example.com'
  const companyName = authUser?.companyName || authUser?.company?.name || ''
  const initials = initialsFromName(senderName || senderEmail)
  const photoUrl = authUser?.profilePhotoUrl || null

  const filledSubject = useMemo(() => fillMergeTags(subject, sampleValues), [subject, sampleValues])
  const filledBody = useMemo(() => fillMergeTags(bodyHtml, sampleValues), [bodyHtml, sampleValues])

  const cleanBody = useMemo(
    () =>
      DOMPurify.sanitize(filledBody || '', {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'style', 'class'],
      }),
    [filledBody],
  )

  const today = new Date()
  const dateLabel = today.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
      <div className="border-b border-surface-border px-5 py-4">
        <h3 className="text-base font-semibold leading-snug text-ink">
          {filledSubject || <span className="italic text-ink-faint">No subject yet</span>}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">Inbox</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-subtle px-1.5 py-0.5 font-medium text-ink-muted">Outreach</span>
        </div>
      </div>
      <div className="flex items-start gap-3 px-5 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
          {photoUrl ? (
            <img src={photoUrl} alt={senderName} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{senderName}</span>
            <span className="truncate text-[11px] text-ink-muted">&lt;{senderEmail}&gt;</span>
            {companyName ? (
              <span className="truncate text-[11px] text-ink-faint">• {companyName}</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            To: {sampleValues?.contact_name || 'Sample Lead'} &lt;{sampleValues?.email || 'lead@example.com'}&gt;
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-[11px] text-ink-muted">{dateLabel}</span>
          <Star className="h-4 w-4 text-ink-faint" />
        </div>
      </div>
      <div className="border-t border-surface-border px-5 py-4">
        {cleanBody ? (
          <div
            className="template-email-preview prose prose-sm max-w-none text-ink text-sm"
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        ) : (
          <p className="text-sm text-ink-faint">Email body will appear here once you start writing.</p>
        )}
      </div>
      {attachments?.length ? (
        <div className="border-t border-surface-border bg-surface-muted px-5 py-3">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            <Paperclip className="h-3 w-3" />
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => {
              const Icon = fileIconFor(a.filename)
              return (
                <div
                  key={`${a.url}-${i}`}
                  className="flex max-w-xs items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5"
                >
                  <Icon className="h-4 w-4 text-brand-700" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">{a.filename}</p>
                    {a.size ? <p className="text-[10px] text-ink-muted">{formatSize(a.size)}</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

