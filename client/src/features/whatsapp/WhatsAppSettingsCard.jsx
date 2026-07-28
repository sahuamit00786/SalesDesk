import { useState } from 'react'
import toast from 'react-hot-toast'
import { SkeletonForm } from '@/components/shared/SkeletonLoader'
import { usePermission } from '@/hooks/usePermission'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppIcon'
import {
  useGetWhatsAppSettingsQuery,
  useSaveWhatsAppSettingsMutation,
  useRegenerateWhatsAppVerifyTokenMutation,
} from '@/features/whatsapp/whatsappApi'

const STATUS_LABEL = {
  not_configured: 'Not connected',
  pending_verification: 'Pending',
  verified: 'Connected',
  error: 'Error',
}

const STATUS_CLASS = {
  not_configured: 'bg-amber-100 text-amber-800',
  pending_verification: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
}

function CopyField({ label, value }) {
  async function copy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }
  return (
    <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle px-2.5 py-2 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-mono text-ink sm:text-[13px]">{value || '—'}</p>
        <button
          type="button"
          className="shrink-0 rounded-md border border-surface-border bg-white px-2 py-1 text-[11px] font-medium text-ink-muted hover:text-ink"
          onClick={copy}
          disabled={!value}
        >
          Copy
        </button>
      </div>
    </div>
  )
}

/**
 * Only mounted once settings have finished loading (see WhatsAppSettingsCard),
 * so `form` can be initialized straight from `settings` with no effect needed
 * to sync it in after the fact.
 */
function WhatsAppSettingsForm({ settings, canConnect }) {
  const [saveSettings, { isLoading: saving }] = useSaveWhatsAppSettingsMutation()
  const [regenerateToken, { isLoading: regenerating }] = useRegenerateWhatsAppVerifyTokenMutation()
  const [form, setForm] = useState({
    phoneNumberId: settings?.phoneNumberId || '',
    wabaId: settings?.wabaId || '',
    accessToken: '',
    appSecret: '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!canConnect) {
      toast.error("You don't have permission to manage integrations.")
      return
    }
    if (!form.phoneNumberId.trim() || !form.wabaId.trim() || !form.accessToken.trim()) {
      toast.error('Phone Number ID, WABA ID, and Access Token are required')
      return
    }
    try {
      await saveSettings({
        phoneNumberId: form.phoneNumberId.trim(),
        wabaId: form.wabaId.trim(),
        accessToken: form.accessToken.trim(),
        appSecret: form.appSecret.trim() || undefined,
      }).unwrap()
      toast.success('WhatsApp Business API connected')
      setForm((prev) => ({ ...prev, accessToken: '', appSecret: '' }))
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not verify these WhatsApp credentials')
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Regenerating the verify token requires updating it in your Meta App webhook config too. Continue?')) return
    try {
      await regenerateToken().unwrap()
      toast.success('Verify token regenerated — update it in Meta App settings')
    } catch {
      toast.error('Could not regenerate the verify token')
    }
  }

  const status = settings?.status || 'not_configured'

  return (
    <div className="w-full rounded-lg border border-surface-border bg-white p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink sm:text-sm">Connection status</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {settings?.lastError ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] leading-snug text-red-900 sm:text-xs">
          {settings.lastError}
        </div>
      ) : null}

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Phone Number ID</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs sm:h-9 sm:text-sm"
            value={form.phoneNumberId}
            onChange={(e) => update('phoneNumberId', e.target.value)}
            disabled={!canConnect}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">WhatsApp Business Account ID</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs sm:h-9 sm:text-sm"
            value={form.wabaId}
            onChange={(e) => update('wabaId', e.target.value)}
            disabled={!canConnect}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Access Token</span>
          <input
            type="password"
            autoComplete="off"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs sm:h-9 sm:text-sm"
            placeholder={settings?.isVerified ? '••••••••  (leave blank to keep current)' : ''}
            value={form.accessToken}
            onChange={(e) => update('accessToken', e.target.value)}
            disabled={!canConnect}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">App Secret (optional, for signed webhooks)</span>
          <input
            type="password"
            autoComplete="off"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs sm:h-9 sm:text-sm"
            placeholder={settings?.hasAppSecret ? '••••••••  (leave blank to keep current)' : ''}
            value={form.appSecret}
            onChange={(e) => update('appSecret', e.target.value)}
            disabled={!canConnect}
          />
        </label>
      </div>

      {!settings?.hasAppSecret ? (
        <p className="mt-2 text-[11px] leading-snug text-amber-800">
          No App Secret set — webhook signature verification is disabled until you add one.
        </p>
      ) : null}

      <button
        type="button"
        hidden={!canConnect}
        className="mt-2.5 h-8 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 sm:h-9 sm:text-sm"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? 'Verifying…' : 'Save & Verify'}
      </button>

      {settings?.isVerified ? (
        <>
          <CopyField label="Webhook callback URL" value={settings.callbackUrl} />
          <CopyField label="Verify token" value={settings.webhookVerifyToken} />
          {canConnect ? (
            <button
              type="button"
              className="mt-2 h-8 rounded-lg border border-surface-border px-3 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-60"
              disabled={regenerating}
              onClick={handleRegenerate}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate verify token'}
            </button>
          ) : null}
          <p className="mt-2 text-[11px] leading-snug text-ink-muted sm:text-xs">
            Paste the callback URL and verify token into your Meta App → WhatsApp → Configuration → Webhooks.
          </p>
        </>
      ) : null}
    </div>
  )
}

export function WhatsAppSettingsCard() {
  const { data: settingsData, isLoading } = useGetWhatsAppSettingsQuery()
  const canConnect = usePermission('settings.integrations', 'update')
  const settings = settingsData?.data

  return (
    <section className="w-full rounded-lg border border-surface-border bg-white shadow-sm">
      <div className="w-full min-w-0 p-2.5 text-left sm:p-3">
        <div className="flex w-full min-w-0 flex-col items-stretch space-y-2.5 text-left sm:space-y-3">
          <div className="w-full rounded-lg border border-surface-border bg-gradient-to-br from-white to-slate-50/80 p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-surface-border bg-[#25D366] shadow-sm sm:h-10 sm:w-10">
                <WhatsAppIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">WhatsApp Business API</p>
                <p className="text-xs leading-snug text-ink-muted sm:text-[13px]">
                  Connect your own WhatsApp Business phone number (Meta Cloud API) — messages and events are stored for this company only.
                </p>
              </div>
            </div>
          </div>

          {isLoading ? <SkeletonForm rows={4} /> : <WhatsAppSettingsForm settings={settings} canConnect={canConnect} />}
        </div>
      </div>
    </section>
  )
}
