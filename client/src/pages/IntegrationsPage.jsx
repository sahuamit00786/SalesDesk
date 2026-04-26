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
      <div className="w-full px-[5px] py-[5px]">
        <section className="w-full rounded-xl border border-surface-border bg-white shadow-sm">
          <div className="border-b border-surface-border px-4">
            <div className="flex items-center gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>
          <div className="w-full p-3 sm:p-4">
            {activeTab === 'google' ? (
              <div className="w-full space-y-4">
                {justConnected ? (
                  <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Google account connected successfully.
                  </div>
                ) : null}
                <div className="w-full rounded-xl border border-surface-border bg-gradient-to-br from-white to-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
                      <span className="inline-flex items-center text-[12px] font-bold leading-none tracking-[-0.01em]">
                        <span className="text-[#4285F4]">G</span>
                        <span className="text-[#EA4335]">o</span>
                        <span className="text-[#FBBC05]">o</span>
                        <span className="text-[#4285F4]">g</span>
                        <span className="text-[#34A853]">l</span>
                        <span className="text-[#EA4335]">e</span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-ink">Google Email Integration</p>
                      <p className="text-sm text-ink-muted">Connect one Google account for sending and syncing lead emails.</p>
                    </div>
                  </div>
                </div>
                {isLoading ? (
                  <p className="text-sm text-ink-muted">Checking connection...</p>
                ) : (
                  <div className="w-full rounded-xl border border-surface-border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Connection Status</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusData?.data?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {statusData?.data?.connected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Connected account</p>
                      <p className="mt-1 text-sm font-medium text-ink">{statusData?.data?.email || 'No account connected yet'}</p>
                    </div>
                    <button
                      type="button"
                      className="mt-4 h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                      disabled={connecting}
                      onClick={connectGoogle}
                    >
                      {connecting ? 'Opening...' : statusData?.data?.connected ? 'Reconnect Google' : 'Continue with Google'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full rounded-xl border border-surface-border p-4">
                <p className="text-sm font-semibold text-ink">API Keys</p>
                <p className="mt-1 text-sm text-ink-muted">Coming soon.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
