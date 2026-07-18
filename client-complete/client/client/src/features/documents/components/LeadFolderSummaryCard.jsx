import { Clock, FileText, Folder, HardDrive } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

const CONNECTOR_CLASS =
  'h-px flex-1 mx-1.5 self-center bg-[length:6px_1px] bg-repeat-x [background-image:linear-gradient(to_right,#e2e8f0_50%,transparent_50%)]'

export function formatFolderStorageCompact(bytes) {
  const n = Number(bytes) || 0
  if (n <= 0) return '0 B'
  const kb = n / 1024
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(/\.0$/, '')} MB`
  const gb = mb / 1024
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1).replace(/\.0$/, '')} GB`
}

export function formatFolderRelativeTime(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffSec = Math.round((t - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const abs = Math.abs(diffSec)
  if (abs < 45) return 'Just now'
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400 * 2) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 45) return rtf.format(Math.round(diffSec / 86400), 'day')
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function FolderStatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center text-[#6B7280]">
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="ml-1 shrink-0 text-[11px] font-normal leading-tight sm:text-[12px]">{label}</span>
      <div className={CONNECTOR_CLASS} aria-hidden />
      <span className="shrink-0 text-right text-[11px] font-medium tabular-nums text-gray-800 sm:text-[12px]">
        {String(value ?? '')}
      </span>
    </div>
  )
}

const MAIN_CARD_SHADOW =
  'shadow-[0_8px_24px_-6px_rgba(0,0,0,0.05),0_14px_28px_-8px_rgba(0,0,0,0.07)]'

export function LeadFolderSummaryCard({ name, email, documentCount, totalFileBytes = 0, lastDocumentAt, onClick }) {
  const title = String(name || 'Untitled lead').trim() || 'Untitled lead'
  const emailLine = email != null ? String(email).trim() : ''
  const filesValue = documentCount === 1 ? '1' : String(documentCount)
  const storageValue = formatFolderStorageCompact(totalFileBytes)
  const updatedValue = formatFolderRelativeTime(lastDocumentAt)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full min-w-0 max-w-full text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
      )}
    >
      <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,240px)]">
        {/* Folder tab */}
        <div
          className="pointer-events-none absolute -top-2 left-0 z-[10] h-8 w-[38%] rounded-t-[14px] bg-[#e9ecef] shadow-sm"
          aria-hidden
        />
        {/* Folder back */}
        <div
          className="pointer-events-none absolute inset-0 z-[5] rounded-[16px] bg-[#e9ecef] shadow-sm"
          aria-hidden
        />
        {/* Content panel — relative so height is driven by content, no clipping */}
        <div
          className={cn(
            'relative z-20 mt-3 rounded-[18px] bg-white px-4 py-3 sm:py-3.5',
            MAIN_CARD_SHADOW,
            'transition duration-200 ease-out',
            'group-hover:shadow-[0_10px_28px_-5px_rgba(0,0,0,0.06),0_16px_32px_-8px_rgba(0,0,0,0.09)]',
          )}
        >
          <div className="mb-3 flex min-w-0 items-start gap-2">
            <Folder className="mt-0.5 h-4 w-4 shrink-0 text-gray-800" strokeWidth={2} aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-snug text-gray-800">{title}</h2>
              {emailLine ? (
                <p className="mt-0.5 truncate text-[11px] leading-tight text-ink-muted" title={emailLine}>
                  {emailLine}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-2.5">
            <FolderStatRow icon={FileText} label="Files" value={filesValue} />
            <FolderStatRow icon={HardDrive} label="Storage" value={storageValue} />
            <FolderStatRow icon={Clock} label="Updated" value={updatedValue} />
          </div>
        </div>
      </div>
    </button>
  )
}
