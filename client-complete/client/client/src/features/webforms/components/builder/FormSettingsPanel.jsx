export function FormSettingsPanel({
  form,
  onChange,
  templates = [],
  selectedTemplateId = '',
  onSelectTemplate,
  onOpenTemplateDrawer,
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-surface-border bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">Form settings</h3>
      <label className="block text-xs text-ink-muted">
        Form name
        <input className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={form.name || ''} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label className="block text-xs text-ink-muted">
        Form title
        <input className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={form.formTitle || ''} onChange={(e) => onChange({ formTitle: e.target.value })} />
      </label>
      <label className="block text-xs text-ink-muted">
        Submit button text
        <input className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={form.submitButtonText || ''} onChange={(e) => onChange({ submitButtonText: e.target.value })} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs text-ink-muted">
          Primary color
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-white px-2"
            value={form.primaryColor || '#3b73f5'}
            onChange={(e) => onChange({ primaryColor: e.target.value })}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          Text color
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-white px-2"
            value={form.textColor || '#0f1117'}
            onChange={(e) => onChange({ textColor: e.target.value })}
          />
        </label>
      </div>
      <label className="block text-xs text-ink-muted">
        Background color
        <input
          type="color"
          className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-white px-2"
          value={form.backgroundColor || '#ffffff'}
          onChange={(e) => onChange({ backgroundColor: e.target.value })}
        />
      </label>
      <label className="block text-xs text-ink-muted">
        Form width (px)
        <input
          type="number"
          min={320}
          max={1200}
          step={10}
          className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
          value={form.formWidth || 760}
          onChange={(e) => onChange({ formWidth: Number(e.target.value || 760) })}
        />
      </label>
      <label className="block text-xs text-ink-muted">
        Thank-you type
        <select className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={form.thankyouType || 'message'} onChange={(e) => onChange({ thankyouType: e.target.value })}>
          <option value="message">Message</option>
          <option value="redirect">Redirect</option>
        </select>
      </label>
      <div className="space-y-2 rounded-xl border border-surface-border bg-surface-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Notifications</p>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={Boolean(form.notifyOnSubmission)} onChange={(e) => onChange({ notifyOnSubmission: e.target.checked })} />
          Notify team on submission
        </label>
        <input
          className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
          placeholder="team@company.com, ops@company.com"
          value={Array.isArray(form.notificationRecipients) ? form.notificationRecipients.join(', ') : ''}
          onChange={(e) => onChange({ notificationRecipients: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
        />
        <input
          className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
          placeholder="Notification subject"
          value={form.notificationSubject || ''}
          onChange={(e) => onChange({ notificationSubject: e.target.value })}
        />
      </div>
      <div className="space-y-2 rounded-xl border border-surface-border bg-surface-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lead Email</p>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={Boolean(form.sendConfirmationEmail)}
            onChange={(e) => onChange({ sendConfirmationEmail: e.target.checked })}
          />
          Send confirmation email to lead
        </label>
        {form.sendConfirmationEmail ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="h-9 w-full min-w-0 rounded-xl border border-surface-border px-3 text-sm sm:flex-1"
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate?.(e.target.value)}
              >
                <option value="">Select template</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button type="button" onClick={onOpenTemplateDrawer} className="h-9 w-full rounded-xl border border-surface-border px-3 text-sm whitespace-nowrap sm:w-auto sm:shrink-0">
                + Add template
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
