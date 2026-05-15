import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { useGetGoogleEmailStatusQuery, useGetGoogleEmailConnectUrlMutation } from '@/features/leads/leadsApi'

const TABS = [
  { id: 'google', label: 'Google Settings' },
  { id: 'api', label: 'API Keys' },
]

export function IntegrationsPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'google')
  const { data: statusData, isLoading } = useGetGoogleEmailStatusQuery()
  const [getConnectUrl, { isLoading: connecting }] = useGetGoogleEmailConnectUrlMutation()
  const justConnected = searchParams.get('connected') === '1'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) setActiveTab(tab)
  }, [searchParams, activeTab])

  async function connectGoogle() {
    const response = await getConnectUrl().unwrap()
    const url = response?.data?.url
    if (url) window.location.href = url
  }

  return (
    <PageShell fullWidth>
      <div className="w-full min-w-0 px-3 py-2 sm:px-4 sm:py-3">
        <section className="w-full rounded-lg border border-surface-border bg-white shadow-sm">
          <div className="flex w-full border-b border-surface-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium transition-colors sm:py-3 sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="w-full min-w-0 p-2.5 text-left sm:p-3">
            {activeTab === 'google' ? (
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
                  <p className="text-xs text-ink-muted sm:text-sm">Checking connection…</p>
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
                    {statusData?.data?.connected && statusData?.data?.readMailbox !== false ? (
                      <p className="mt-2 text-[11px] leading-snug text-ink-muted sm:text-xs">
                        {statusData?.data?.gmailPushConfigured
                          ? 'Near real-time sync: Gmail push (Pub/Sub) is configured on the server.'
                          : 'Inbox updates rely on periodic sync until the server is configured with Gmail Pub/Sub push (see env GMAIL_PUBSUB_*).'}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-2.5 h-8 self-start rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 sm:mt-3 sm:h-9 sm:text-sm"
                      disabled={connecting}
                      onClick={connectGoogle}
                    >
                      {connecting ? 'Opening…' : statusData?.data?.connected ? 'Reconnect Google' : 'Continue with Google'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full rounded-lg border border-surface-border p-2.5 sm:p-3">
                <p className="text-xs font-semibold text-ink sm:text-sm">API Keys</p>
                <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">Coming soon.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
