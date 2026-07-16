export function EmbedPreviewFrame({ token }) {
  return (
    <iframe
      title="Embed preview"
      src={`/api/public/forms/${token || ''}`}
      className="h-[420px] w-full rounded-2xl border border-surface-border bg-white"
    />
  )
}
