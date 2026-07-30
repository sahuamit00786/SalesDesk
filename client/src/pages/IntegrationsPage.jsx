import { useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonForm } from '@/components/shared/SkeletonLoader'
import toast from 'react-hot-toast'
import { LayoutTemplate, Mail } from '@/components/ui/icons'
import { useGetGoogleEmailStatusQuery, useGetGoogleEmailConnectUrlMutation } from '@/features/leads/leadsApi'
import { usePermission } from '@/hooks/usePermission'
import { WhatsAppSettingsCard } from '@/features/whatsapp/WhatsAppSettingsCard'
import { WhatsAppTemplatesTab } from '@/features/whatsapp/WhatsAppTemplatesTab'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppIcon'
import { cn } from '@/utils/cn'

// 'google' must stay this exact id — the Google OAuth callback redirects back to
// `/integrations?tab=google&connected=1` (see leadsController.js connectGoogleEmailCallback).
const INTEGRATION_TABS = [
  { id: 'google', label: 'Google Email', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { id: 'whatsapp-templates', label: 'WhatsApp Templates', icon: LayoutTemplate },
]

function GoogleEmailTab({ justConnected }) {
  const { data: statusData, isLoading, isError, error, refetch } = useGetGoogleEmailStatusQuery()
  const [getConnectUrl, { isLoading: connecting }] = useGetGoogleEmailConnectUrlMutation()
  const canConnect = usePermission('settings.integrations', 'update')

  async function connectGoogle() {
    if (!canConnect) {
      toast.error("You don't have permission to manage integrations.")
      return
    }
    const response = await getConnectUrl().unwrap()
    const url = response?.data?.url
    if (url) window.location.href = url
  }

  return (
    <section className="w-full rounded-lg border border-surface-border bg-white shadow-sm">
      <div className="w-full min-w-0 p-2.5 text-left sm:p-3">
        <div className="flex w-full min-w-0 flex-col items-stretch space-y-2.5 text-left sm:space-y-3">
          {justConnected ? (
            <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 sm:text-[13px]">
              Google account connected successfully.
            </div>
          ) : null}
          <div className="w-full rounded-lg border border-surface-border bg-gradient-to-br from-white to-slate-50/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-surface-border bg-white shadow-sm sm:h-10 sm:w-10">
                <span className="inline-flex items-center text-[10px] font-bold leading-none tracking-tight sm:text-[11px]">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Google Email Integration</p>
                <p className="text-xs leading-snug text-ink-muted sm:text-[13px]">
                  Connect one Google account for sending email, reading the inbox in CRM, and syncing lead threads.
                </p>
              </div>
            </div>
          </div>
          {isLoading ? (
            <SkeletonForm rows={3} />
          ) : isError ? (
            <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Could not load Google Email connection status.{error?.data?.error?.message ? ` ${error.data.error.message}` : ''}{' '}
              <button type="button" className="font-medium underline" onClick={refetch}>Retry</button>
            </div>
          ) : (
            <div className="w-full rounded-lg border border-surface-border bg-white p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink sm:text-sm">Connection status</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
                    statusData?.data?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {statusData?.data?.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle px-2.5 py-2 sm:mt-2.5 sm:px-3 sm:py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Connected account</p>
                <p className="mt-0.5 truncate text-xs font-medium text-ink sm:text-sm">
                  {statusData?.data?.email || 'No account connected yet'}
                </p>
              </div>
              {statusData?.data?.connected && statusData?.data?.readMailbox === false ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950 sm:text-xs">
                  <p className="font-semibold text-amber-900">Inbox read access missing</p>
                  <p className="mt-1 text-amber-900/90">
                    Gmail is connected for sending, but the saved token does not include Gmail <strong>read</strong>. Click Reconnect Google and approve all requested permissions so the Email inbox and unread badge can load.
                  </p>
                </div>
              ) : null}
              {statusData?.data?.connected && !statusData?.data?.calendarConnected ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950 sm:text-xs">
                  <p className="font-semibold text-amber-900">Calendar access missing</p>
                  <p className="mt-1 text-amber-900/90">
                    Google Meet links for meetings require Calendar access. Click <strong>Reconnect Google</strong> below and approve all permissions.
                  </p>
                </div>
              ) : null}
              {statusData?.data?.connected && statusData?.data?.readMailbox !== false ? (
                <p className="mt-2 text-[11px] leading-snug text-ink-muted sm:text-xs">
                  {statusData?.data?.gmailPushConfigured
                    ? 'Near real-time sync: Gmail push (Pub/Sub) is configured on the server.'
                    : 'Inbox updates rely on periodic sync until the server is configured with Gmail Pub/Sub push (see env GMAIL_PUBSUB_*).'}
                </p>
              ) : null}
              <button
                type="button"
                hidden={!canConnect}
                className="mt-2.5 h-8 self-start rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 sm:mt-3 sm:h-9 sm:text-sm"
                disabled={connecting}
                onClick={connectGoogle}
              >
                {connecting ? 'Opening…' : statusData?.data?.connected ? 'Reconnect Google' : 'Continue with Google'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'whatsapp' || tabParam === 'whatsapp-templates' ? tabParam : 'google'
  const justConnected = searchParams.get('connected') === '1'

  function setActiveTab(id) {
    const next = new URLSearchParams(searchParams)
    if (id === 'google') next.delete('tab')
    else next.set('tab', id)
    next.delete('connected')
    setSearchParams(next, { replace: true })
  }

  return (
    <PageShell fullWidth>
      <div className="w-full min-w-0 px-3 py-2 sm:px-4 sm:py-3">
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-surface-border bg-white px-2.5 py-2 shadow-sm" role="tablist" aria-label="Integrations">
          {INTEGRATION_TABS.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
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

        {activeTab === 'google' ? <GoogleEmailTab justConnected={justConnected} /> : null}
        {activeTab === 'whatsapp' ? <WhatsAppSettingsCard /> : null}
        {activeTab === 'whatsapp-templates' ? <WhatsAppTemplatesTab /> : null}
      </div>
    </PageShell>
  )
}
