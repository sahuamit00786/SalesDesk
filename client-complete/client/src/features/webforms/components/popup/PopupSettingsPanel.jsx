export function PopupSettingsPanel({ settings, onChange }) {
  return (
    <div className="space-y-3 rounded-2xl border border-surface-border bg-white p-4">
      <p className="text-sm font-semibold text-ink">Popup settings</p>
      <select className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={settings.popupTrigger || 'time_delay'} onChange={(e) => onChange({ popupTrigger: e.target.value })}>
        <option value="exit_intent">Exit intent</option>
        <option value="time_delay">Time delay</option>
        <option value="scroll_depth">Scroll depth</option>
        <option value="button_click">Button click</option>
      </select>
    </div>
  )
}
