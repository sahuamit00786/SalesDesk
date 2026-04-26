function radiusClass(borderRadius) {
  if (borderRadius === 'none') return 'rounded-none'
  if (borderRadius === 'sm') return 'rounded-lg'
  if (borderRadius === 'lg') return 'rounded-2xl'
  return 'rounded-xl'
}

export function FormLivePreview({ form, fields }) {
  return (
    <div
      className={`rounded-2xl border border-surface-border p-4 ${radiusClass(form?.borderRadius)}`}
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
          if (field.type === 'divider') return <hr key={field.id} className="my-2" />
          if (field.type === 'heading') return <h4 key={field.id} className="font-semibold">{field.label || 'Heading'}</h4>
          if (field.type === 'paragraph') return <p key={field.id} className="text-sm">{field.label || 'Paragraph'}</p>
          return (
            <div key={field.id} className="space-y-1">
              <label className="text-sm">{field.label || 'Untitled field'}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className={`h-24 w-full border border-surface-border px-3 py-2 ${radiusClass(form?.borderRadius)}`}
                  placeholder={field.placeholder || ''}
                  readOnly
                />
              ) : (
                <input
                  className={`h-10 w-full border border-surface-border px-3 ${radiusClass(form?.borderRadius)}`}
                  placeholder={field.placeholder || ''}
                  readOnly
                />
              )}
            </div>
          )
        })}
        <button
          type="button"
          className={`h-10 px-5 text-sm font-semibold text-white ${radiusClass(form?.borderRadius)}`}
          style={{ backgroundColor: form?.primaryColor || '#3b73f5' }}
        >
          {form?.submitButtonText || 'Submit'}
        </button>
      </div>
    </div>
  )
}
