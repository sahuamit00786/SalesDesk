// Same 4 inline markers WhatsApp itself renders — *bold*, _italic_, ~strike~, ```mono```.
// Single capturing group so String.split() keeps the matched tokens in the output array.
const FORMAT_PATTERN = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[^`\n]+```)/g

/** Renders WhatsApp's own text-formatting markers as real bold/italic/strike/mono —
 * without this, a message sent as *bold* just shows the literal asterisks in our UI
 * even though the recipient's WhatsApp app renders it formatted. */
export function WhatsAppFormattedText({ text }) {
  if (!text) return null
  const parts = String(text).split(FORMAT_PATTERN)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('```') && part.endsWith('```') && part.length >= 6) {
      return (
        <code key={i} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(3, -3)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('~') && part.endsWith('~') && part.length >= 2) {
      return <s key={i}>{part.slice(1, -1)}</s>
    }
    return part
  })
}
