function radiusClass(borderRadius) {
  if (borderRadius === 'none') return 'rounded-none'
  if (borderRadius === 'sm') return 'rounded-lg'
  if (borderRadius === 'lg') return 'rounded-2xl'
  return 'rounded-xl'
}

export function FormLivePreview({ form, fields }) {
  const rc = radiusClass(form?.borderRadius)
  return (
    <div
      className={`rounded-2xl border border-surface-border p-4 ${rc}`}
      style={{
        backgroundColor: form?.backgroundColor || '#ffffff',
        color: form?.textColor || '#0f1117',
        fontFamily: form?.fontFamily || 'Plus Jakarta Sans',
      }}
    >
      <div className="mx-auto space-y-3" style={{ maxWidth: `${Math.max(320, Math.min(1200, Number(form?.formWidth || 760)))}px` }}>
        {form?.formTitle ? <h3 className="text-lg font-semibold">{form.formTitle}</h3> : null}
        {form?.formSubtitle ? <p className="text-sm opacity-80">{form.formSubtitle}</p> : null}
        {(fields || []).map((field) => {
          if (field.type === 'divider') return <hr key={field.id} className="my-2 border-surface-border" />

          if (field.type === 'heading') {
            return (
              <h2 key={field.id} className="text-xl font-bold leading-snug">
                {field.label || 'Heading'}
              </h2>
            )
          }

          if (field.type === 'paragraph') {
            return (
              <p key={field.id} className="text-sm leading-relaxed opacity-80">
                {field.label || 'Paragraph text'}
              </p>
            )
          }

          if (field.type === 'hidden') {
            return (
              <div key={field.id} className={`flex items-center gap-2 rounded-lg border border-dashed border-surface-border bg-surface-muted/50 px-3 py-2 ${rc}`}>
                <span className="text-xs font-medium text-ink-muted">Hidden field:</span>
                <code className="text-xs text-ink-muted">{field.crmField || 'key'}</code>
                <span className="text-xs text-ink-faint">= {field.defaultValue || '(empty)'}</span>
              </div>
            )
          }

          if (field.type === 'file') {
            const opts = field.options || {}
            const hint = [
              opts.maxFiles > 1 ? `Up to ${opts.maxFiles} files` : null,
              opts.maxFileSizeMB ? `Max ${opts.maxFileSizeMB} MB each` : null,
              opts.accept ? opts.accept : null,
            ].filter(Boolean).join(' · ')
            return (
              <div key={field.id} className="space-y-1">
                <label className="text-sm">
                  {field.label || 'Upload file'}
                  {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="file"
                  accept={opts.accept || undefined}
                  multiple={opts.maxFiles > 1}
                  disabled
                  className={`w-full border border-surface-border px-3 py-1.5 text-sm ${rc}`}
                />
                {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
              </div>
            )
          }

          if (field.type === 'date') {
            return (
              <div key={field.id} className="space-y-1">
                <label className="text-sm">
                  {field.label || 'Date'}
                  {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  disabled
                  className={`h-10 w-full border border-surface-border px-3 ${rc}`}
                />
              </div>
            )
          }

          return (
            <div key={field.id} className="space-y-1">
              <label className="text-sm">
                {field.label || 'Untitled field'}
                {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  className={`h-24 w-full border border-surface-border px-3 py-2 ${rc}`}
                  placeholder={field.placeholder || ''}
                  readOnly
                />
              ) : (
                <input
                  className={`h-10 w-full border border-surface-border px-3 ${rc}`}
                  placeholder={field.placeholder || ''}
                  readOnly
                />
              )}
              {field.maxLength ? <p className="text-right text-xs text-ink-faint">max {field.maxLength} chars</p> : null}
            </div>
          )
        })}
        <button
          type="button"
          className={`h-10 px-5 text-sm font-semibold text-white ${rc}`}
          style={{ backgroundColor: form?.primaryColor || '#3b73f5' }}
        >
          {form?.submitButtonText || 'Submit'}
        </button>
      </div>
    </div>
  )
}
