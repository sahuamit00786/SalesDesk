import toast from 'react-hot-toast'

export function EmbedCodeModal({ formToken }) {
  const appBaseUrl = window.location.origin.replace('5173', '4000')
  const scriptCode = `<!-- Copy this into your website -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='${appBaseUrl}/embed/form.js?token='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','fynloForms','${formToken || 'FORM_TOKEN_HERE'}');</script>\n<div id="fynlo-form-${formToken || 'FORM_TOKEN_HERE'}"></div>`
  const iframeCode = `<iframe src="${appBaseUrl}/f/${formToken || 'FORM_TOKEN_HERE'}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
  const publicLink = `${appBaseUrl}/f/${formToken || 'FORM_TOKEN_HERE'}`

  async function copyText(text) {
    await navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  return (
    <div className="space-y-4 rounded-2xl border border-surface-border bg-white p-4">
      <p className="text-sm font-semibold text-ink">Embed and share</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-muted">Script embed code</p>
          <button type="button" onClick={() => copyText(scriptCode)} className="h-8 rounded-lg border border-surface-border px-3 text-xs">Copy</button>
        </div>
        <textarea readOnly className="h-36 w-full rounded-xl border border-surface-border bg-slate-900 p-3 font-mono text-xs text-slate-100" value={scriptCode} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-muted">iFrame embed code</p>
          <button type="button" onClick={() => copyText(iframeCode)} className="h-8 rounded-lg border border-surface-border px-3 text-xs">Copy</button>
        </div>
        <textarea readOnly className="h-24 w-full rounded-xl border border-surface-border bg-slate-900 p-3 font-mono text-xs text-slate-100" value={iframeCode} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-muted">Share link</p>
          <button type="button" onClick={() => copyText(publicLink)} className="h-8 rounded-lg border border-surface-border px-3 text-xs">Copy</button>
        </div>
        <input readOnly className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={publicLink} />
      </div>
    </div>
  )
}
