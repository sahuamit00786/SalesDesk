import { Inbox, Paperclip, Pencil, Send, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Select } from '@/components/ui/Select'

function NavItem({ icon: Icon, label, active, onClick, badge = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-r-full py-2 pl-5 pr-3 text-sm transition-colors',
        active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink hover:bg-surface-muted',
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge ? (
        <span className={cn('shrink-0 text-xs tabular-nums', active ? 'font-bold text-brand-800' : 'font-semibold text-ink')}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}

function SidebarBody({
  box, onBoxChange,
  unreadCount, unreadApproximate,
  filterMode, onFilterModeChange,
  hasAttachments, onHasAttachmentsChange,
  leadId, onLeadIdChange, leads,
  onCompose, composeDisabled,
}) {
  const unreadBadge = unreadCount > 0 ? `${unreadCount}${unreadApproximate ? '+' : ''}` : null
  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto py-3 pr-2">
      <div className="mb-2 px-3">
        <button
          type="button"
          onClick={onCompose}
          disabled={composeDisabled}
          className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-800 disabled:opacity-50"
        >
          <Pencil size={15} />
          Compose
        </button>
      </div>
      <NavItem icon={Inbox} label="Inbox" active={box === 'inbox' && filterMode === 'all'} badge={unreadBadge}
        onClick={() => { onBoxChange('inbox'); onFilterModeChange('all') }} />
      <NavItem icon={Send} label="Sent" active={box === 'sent' && filterMode === 'all'}
        onClick={() => { onBoxChange('sent'); onFilterModeChange('all') }} />

      <p className="mb-1 mt-4 px-5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">CRM filters</p>
      <NavItem
        icon={(props) => <span {...props} className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current" />}
        label="Lead-linked mail"
        active={filterMode === 'lead-linked'}
        onClick={() => onFilterModeChange(filterMode === 'lead-linked' ? 'all' : 'lead-linked')}
      />
      <label className="flex cursor-pointer items-center gap-3 py-2 pl-5 pr-3 text-sm text-ink hover:bg-surface-muted">
        <Paperclip size={15} className="shrink-0 text-ink-muted" />
        <span className="flex-1">Has attachments</span>
        <input
          type="checkbox"
          checked={hasAttachments}
          onChange={(e) => onHasAttachmentsChange(e.target.checked)}
          className="rounded border-slate-300 text-brand-700"
        />
      </label>
      <div className="px-3 pt-1">
        <Select
          className="h-9 w-full rounded-lg text-xs"
          value={leadId}
          onChange={(e) => onLeadIdChange(e.target.value)}
          aria-label="Filter by lead"
        >
          <option value="">All leads</option>
          {leads.filter((l) => l.email).map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title || lead.contactName || lead.email}
              {lead.isOpportunity ? ' (Opportunity)' : ''}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export default function EmailSidebar({ mobileOpen, onMobileClose, ...body }) {
  return (
    <>
      <aside className="hidden w-[220px] shrink-0 border-r border-surface-border bg-surface-muted/20 lg:block">
        <SidebarBody {...body} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} role="presentation" />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-white shadow-2xl">
            <div className="flex items-center justify-end px-2 pt-2">
              <button type="button" onClick={onMobileClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <SidebarBody {...body} />
          </div>
        </div>
      ) : null}
    </>
  )
}
