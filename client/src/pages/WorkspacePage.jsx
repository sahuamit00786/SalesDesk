import { useSearchParams } from 'react-router-dom'
import { Bell, IdCard } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { WorkspaceCompanyTab } from '@/pages/workspace/WorkspaceCompanyTab'
import { NotificationEmailSettingsTab } from '@/pages/workspace/NotificationEmailSettingsTab'
import { cn } from '@/utils/cn'


const SETTINGS_TABS = [
  { id: 'company', label: 'Company information', icon: IdCard },
  { id: 'notifications', label: 'Email notifications', icon: Bell },
]


export function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const settingsTab =
    tabParam === 'notifications' ? 'notifications' : 'company'

  const setSettingsTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'company') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  return (
    <PageShell fullWidth>
      <div className="space-y-4 px-2 py-3 sm:px-4">
        <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white px-3 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Workspace settings">
            {SETTINGS_TABS.map((t) => {
              const Icon = t.icon
              const active = settingsTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSettingsTab(t.id)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors',
                    active
                      ? 'border-brand-600 bg-[var(--brand-primary)] text-white shadow-sm'
                      : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t.label}
                </button>
              )
            })}
          </div>

        </div>

        {settingsTab === 'company' ? <WorkspaceCompanyTab /> : null}

        {settingsTab === 'notifications' ? <NotificationEmailSettingsTab /> : null}
      </div>

    </PageShell>
  )
}
