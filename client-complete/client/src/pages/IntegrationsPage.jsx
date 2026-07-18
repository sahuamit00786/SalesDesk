import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonForm } from '@/components/shared/SkeletonLoader'
import { useGetGoogleEmailStatusQuery, useGetGoogleEmailConnectUrlMutation } from '@/features/leads/leadsApi'
import {
  useGetAurinkoStatusQuery,
  useGetAurinkoConnectUrlMutation,
  useDisconnectAurinkoMutation,
  useGetAurinkoCalendarsQuery,
  useSubscribeAurinkoCalendarMutation,
} from '@/features/aurinko/aurinkoApi'

function GoogleWordmark() {
  return (
    <span className="inline-flex items-center text-[10px] font-bold leading-none tracking-tight sm:text-[11px]">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
    </span>
  )
}

function StatusPill({ ok, okLabel = 'Connected', badLabel = 'Not connected' }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {ok ? okLabel : badLabel}
    </span>
  )
}

export function IntegrationsPage() {
  const [searchParams] = useSearchParams()
  const justConnected = searchParams.get('connected') === '1'
  const aurinkoError = searchParams.get('aurinkoError')

  const { data: aurinkoRes, isLoading: loadingAurinko } = useGetAurinkoStatusQuery(undefined, {
    pollingInterval: 60000,
  })
  const aurinko = aurinkoRes?.data
  const aurinkoConfigured = Boolean(aurinko?.configured)
  const aurinkoConnected = Boolean(aurinko?.connected)

  const { data: legacyStatus, isLoading: loadingLegacy } = useGetGoogleEmailStatusQuery()
  const [getAurinkoUrl, { isLoading: openingAurinko }] = useGetAurinkoConnectUrlMutation()
  const [getLegacyUrl, { isLoading: openingLegacy }] = useGetGoogleEmailConnectUrlMutation()
  const [disconnectAurinko, { isLoading: disconnecting }] = useDisconnectAurinkoMutation()
  const [subscribeCalendar, { isLoading: subscribing }] = useSubscribeAurinkoCalendarMutation()

  const { data: calendarsRes, isFetching: loadingCalendars } = useGetAurinkoCalendarsQuery(undefined, {
    skip: !aurinkoConnected,
  })
  const calendars = Array.isArray(calendarsRes?.data) ? calendarsRes.data : []
  const [selectedCalendarId, setSelectedCalendarId] = useState('')

  const connecting = openingAurinko || openingLegacy
  const isLoading = loadingAurinko || loadingLegacy

  async function connectGoogle() {
    try {
      // Aurinko-first: the consent screen is white-labeled with our own Google
      // OAuth credentials configured in the Aurinko app.
      const response = aurinkoConfigured
        ? await getAurinkoUrl({ returnTo: '/integrations' }).unwrap()
        : await getLegacyUrl().unwrap()
      const url = response?.data?.url
      if (url) window.location.href = url
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start Google sign-in')
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectAurinko().unwrap()
      toast.success('Google account disconnected')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Disconnect failed')
    }
  }

  async function enableCalendarSync() {
    try {
      const calendarId = selectedCalendarId || calendars.find((c) => c.primary)?.id || 'primary'
      await subscribeCalendar({ calendarId }).unwrap()
      toast.success('Calendar change sync enabled')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not enable calendar sync')
    }
  }

  const connectedEmail = aurinkoConnected
    ? aurinko?.email
    : legacyStatus?.data?.email
  const anyConnected = aurinkoConnected || Boolean(legacyStatus?.data?.connected)

  return (
    <PageShell fullWidth>
      <div className="w-full min-w-0 px-3 py-2 sm:px-4 sm:py-3">
        <section className="w-full rounded-lg border border-surface-border bg-white shadow-sm">
          <div className="w-full min-w-0 p-2.5 text-left sm:p-3">
            <div className="flex w-full min-w-0 flex-col items-stretch space-y-2.5 text-left sm:space-y-3">
              {justConnected ? (
                <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 sm:text-[13px]">
                  Google account connected successfully.
                </div>
              ) : null}
              {aurinkoError ? (
                <div className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 sm:text-[13px]">
                  Google sign-in did not complete ({aurinkoError}). Please try again.
                </div>
              ) : null}

              {/* ---------------- Google account (Gmail + Calendar) ---------------- */}
              <div className="w-full rounded-lg border border-surface-border bg-gradient-to-br from-white to-slate-50/80 p-2.5 sm:p-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-surface-border bg-white shadow-sm sm:h-10 sm:w-10">
                    <GoogleWordmark />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Google — Gmail &amp; Calendar</p>
                    <p className="text-xs leading-snug text-ink-muted sm:text-[13px]">
                      Continue with Google to read and send email from the CRM inbox and access
                      Google Calendar. New mail syncs from the moment you connect — no historical import.
                    </p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <SkeletonForm rows={3} />
              ) : (
                <div className="w-full rounded-lg border border-surface-border bg-white p-2.5 sm:p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink sm:text-sm">Connection status</p>
                    <StatusPill ok={anyConnected} />
                  </div>
                  <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle px-2.5 py-2 sm:mt-2.5 sm:px-3 sm:py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Connected account</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-ink sm:text-sm">
                      {connectedEmail || 'No account connected yet'}
                    </p>
                    {aurinkoConnected && aurinko?.connectedAt ? (
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        Email sync active since {new Date(aurinko.connectedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — older mail is never imported.
                      </p>
                    ) : null}
                  </div>

                  {aurinko?.status === 'reauth_required' ? (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950 sm:text-xs">
                      <p className="font-semibold text-amber-900">Reconnection needed</p>
                      <p className="mt-1 text-amber-900/90">
                        Google access expired or was revoked. Click <strong>Reconnect Google</strong> to restore
                        the connection. Your synced mail stays intact.
                      </p>
                    </div>
                  ) : null}

                  {aurinkoConnected ? (
                    <p className="mt-2 text-[11px] leading-snug text-ink-muted sm:text-xs">
                      {aurinko?.emailSubscription
                        ? 'Real-time sync: new-mail events are pushed to the CRM (metadata first; full content loads when you open a message).'
                        : 'New-mail event subscription is being set up. If this persists, check that the server URL is publicly reachable (PUBLIC_SERVER_URL).'}
                    </p>
                  ) : null}
                  {!aurinkoConfigured ? (
                    <p className="mt-2 text-[11px] leading-snug text-amber-700 sm:text-xs">
                      Aurinko keys are not configured on the server (AURINKO_CLIENT_ID / AURINKO_CLIENT_SECRET) —
                      falling back to the direct Google connection.
                    </p>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
                    <button
                      type="button"
                      className="h-8 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 sm:h-9 sm:text-sm"
                      disabled={connecting}
                      onClick={connectGoogle}
                    >
                      {connecting ? 'Opening…' : anyConnected ? 'Reconnect Google' : 'Continue with Google'}
                    </button>
                    {aurinkoConnected && aurinko?.ownAccount ? (
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-60 sm:h-9 sm:text-sm"
                        disabled={disconnecting}
                        onClick={handleDisconnect}
                      >
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {/* ---------------- Google Calendar sync ---------------- */}
              {aurinkoConnected ? (
                <div className="w-full rounded-lg border border-surface-border bg-white p-2.5 sm:p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink sm:text-sm">Google Calendar</p>
                    <StatusPill
                      ok={Boolean(aurinko?.calendarSubscription)}
                      okLabel="Live sync on"
                      badLabel="On-demand"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-muted sm:text-xs">
                    Calendars and events load directly from Google whenever needed. Optionally enable
                    change sync so edits made in Google Calendar are pushed to the CRM automatically.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 rounded-lg border border-surface-border bg-white px-2 text-xs text-ink sm:h-9 sm:text-sm"
                      value={selectedCalendarId}
                      disabled={loadingCalendars}
                      onChange={(e) => setSelectedCalendarId(e.target.value)}
                    >
                      <option value="">
                        {loadingCalendars ? 'Loading calendars…' : 'Primary calendar'}
                      </option>
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.primary ? ' (primary)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-60 sm:h-9 sm:text-sm"
                      disabled={subscribing || Boolean(aurinko?.calendarSubscription)}
                      onClick={enableCalendarSync}
                    >
                      {aurinko?.calendarSubscription
                        ? `Sync on (${aurinko?.calendarId || 'primary'})`
                        : subscribing
                          ? 'Enabling…'
                          : 'Enable change sync'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
