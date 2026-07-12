import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  useGetNotificationEmailSettingsQuery,
  usePatchNotificationEmailSettingsMutation,
} from '@/features/settings/settingsApi'

const EVENT_ROWS = [
  { key: 'leadAssigned', label: 'Lead assigned', description: 'When leads are assigned to a user (bulk, create, round-robin).' },
  {
    key: 'campaignLeadsAdded',
    label: 'Campaign leads',
    description: 'When leads are added to a campaign and assigned to team members.',
  },
  { key: 'taskAssigned', label: 'Task assigned', description: 'When a task is created or reassigned to someone.' },
  {
    key: 'tasksDueToday',
    label: 'Tasks due today',
    description: 'Daily digest of open tasks due today (per workspace).',
  },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function SectionHeader({ title, description, icon: Icon }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-surface-border/70 pb-4">
      {Icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200/60 bg-slate-100 text-brand-700 shadow-sm">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
    </div>
  )
}

export function NotificationEmailSettingsTab() {
  const user = useSelector((s) => s.auth.user)
  const isAdmin = Boolean(user?.isCompanyAdmin)
  const { data, isLoading } = useGetNotificationEmailSettingsQuery()
  const [patchSettings, { isLoading: saving }] = usePatchNotificationEmailSettingsMutation()

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data?.data) setForm(data.data)
  }, [data])

  function updateEvent(key, patch) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  function updateQuiet(patch) {
    setForm((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...patch },
    }))
  }

  async function handleSave() {
    if (!isAdmin) {
      toast.error('Only company admins can change notification settings')
      return
    }
    try {
      await patchSettings(form).unwrap()
      toast.success('Notification settings saved')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not save settings')
    }
  }

  if (isLoading || !form) {
    return (
      <div className="rounded-xl border border-surface-border bg-white/90 p-8 text-sm text-ink-muted">
        Loading notification settings…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-white/90 p-5 sm:p-6">
        <SectionHeader
          title="Email notifications"
          description="Branded emails (same style as login and invite messages) are queued via BullMQ. In-app alerts appear in the notification bell."
          icon={Mail}
        />

        {!isAdmin ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Only company admins can edit these settings. You can still receive notifications based on the current
            configuration.
          </p>
        ) : null}

        <div className="space-y-4">
          {EVENT_ROWS.map((row) => {
            const event = form[row.key] || {}
            const isDigest = row.key === 'tasksDueToday'
            return (
              <div
                key={row.key}
                className="rounded-xl border border-surface-border/80 bg-surface-subtle/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{row.label}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">{row.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Toggle
                      label="Enabled"
                      checked={Boolean(event.enabled)}
                      onChange={(v) => updateEvent(row.key, { enabled: v })}
                    />
                    <Toggle
                      label="Email"
                      checked={Boolean(event.email)}
                      onChange={(v) => updateEvent(row.key, { email: v })}
                    />
                    <Toggle
                      label="In-app"
                      checked={Boolean(event.inApp)}
                      onChange={(v) => updateEvent(row.key, { inApp: v })}
                    />
                  </div>
                </div>
                {isDigest && event.enabled ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-muted">Digest hour (0–23)</label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={event.digestHour ?? 8}
                        disabled={!isAdmin}
                        onChange={(e) => updateEvent(row.key, { digestHour: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-muted">Digest minute</label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={event.digestMinute ?? 0}
                        disabled={!isAdmin}
                        onChange={(e) => updateEvent(row.key, { digestMinute: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-muted">Timezone label</label>
                      <Input
                        value={event.timezone ?? 'UTC'}
                        disabled={!isAdmin}
                        onChange={(e) => updateEvent(row.key, { timezone: e.target.value })}
                        placeholder="e.g. Asia/Kolkata"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-xl border border-surface-border/80 bg-surface-subtle/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden />
            Quiet hours
          </div>
          <p className="mb-3 text-sm text-ink-muted">
            Delay outbound notification emails until quiet hours end (server local time).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle
              label="Enable quiet hours"
              checked={Boolean(form.quietHours?.enabled)}
              onChange={(v) => updateQuiet({ enabled: v })}
            />
          </div>
          {form.quietHours?.enabled ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Start hour</label>
                <Select
                  value={String(form.quietHours.startHour ?? 22)}
                  disabled={!isAdmin}
                  onChange={(e) => updateQuiet({ startHour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Start minute</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  disabled={!isAdmin}
                  value={form.quietHours.startMinute ?? 0}
                  onChange={(e) => updateQuiet({ startMinute: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">End hour</label>
                <Select
                  value={String(form.quietHours.endHour ?? 7)}
                  disabled={!isAdmin}
                  onChange={(e) => updateQuiet({ endHour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">End minute</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  disabled={!isAdmin}
                  value={form.quietHours.endMinute ?? 0}
                  onChange={(e) => updateQuiet({ endMinute: Number(e.target.value) })}
                />
              </div>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save notification settings'}
            </Button>
          </div>
        ) : null}
      </div>

    </div>
  )
}
