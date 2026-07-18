import { SOCKET_URL } from '@/config'

export function fileExtLower(name) {
  const n = String(name || '').toLowerCase()
  return n.includes('.') ? n.split('.').pop() : ''
}

export function formatSize(size) {
  const kb = (Number(size) || 0) / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(kb))} KB`
}

export function getDocumentKind(row) {
  const name = String(row?.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() : ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'document'
}

// Text/code files we can safely fetch and render inline as plain text.
const TEXT_PREVIEW_EXTS = [
  'sql', 'txt', 'csv', 'tsv', 'json', 'log', 'md', 'markdown', 'xml', 'yml', 'yaml',
  'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'htm', 'sh', 'bash', 'env',
  'ini', 'conf', 'cfg', 'toml', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'go', 'rs',
]

/**
 * How the preview dialog should render a file:
 * 'image' → <img>, 'pdf' → <iframe>, 'text' → fetched <pre>, 'download' → fallback card.
 * Only images and PDFs are safely embeddable; everything else (e.g. .sql, .zip)
 * would otherwise trigger a download inside an iframe and flicker.
 */
export function getPreviewMode(row) {
  const kind = getDocumentKind(row)
  if (kind === 'image') return 'image'
  if (kind === 'pdf') return 'pdf'
  if (TEXT_PREVIEW_EXTS.includes(fileExtLower(row?.name))) return 'text'
  return 'download'
}

export function getDocCardPreviewMeta(row) {
  const kind = getDocumentKind(row)
  const ext = fileExtLower(row?.name)
  if (kind === 'image') return { mode: 'image', label: (ext || 'img').toUpperCase() }
  if (kind === 'pdf') return { mode: 'block', label: 'PDF', blockClass: 'bg-rose-50 text-rose-800' }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return { mode: 'block', label: (ext || 'audio').toUpperCase(), blockClass: 'bg-emerald-50 text-emerald-800' }
  }
  if (['doc', 'docx'].includes(ext)) return { mode: 'block', label: 'DOC', blockClass: 'bg-sky-50 text-sky-800' }
  return { mode: 'block', label: (ext || 'file').toUpperCase().slice(0, 5), blockClass: 'bg-zinc-100 text-zinc-700' }
}

export function getFileUrl(filePath) {
  if (!filePath) return ''
  const t = String(filePath).trim()
  if (t.startsWith('data:') || t.startsWith('blob:')) return t
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  let path = t.startsWith('/') ? t : `/${t}`
  try {
    path = encodeURI(decodeURI(path))
  } catch {
    path = encodeURI(path)
  }
  return `${SOCKET_URL}${path}`
}

/** Map a task JSON attachment into a document row the preview dialog understands. */
export function normalizeTaskAttachmentForPreview(att, index = 0) {
  const name = String(att?.filename || att?.fileName || att?.name || 'attachment').trim() || 'attachment'
  const filePath = att?.filePath || att?.url || att?.fileUrl || ''
  if (!filePath) return null
  return {
    id: att?.id || att?.documentId || `task-att-${index}`,
    name,
    filePath,
    fileSize: Number(att?.size ?? att?.sizeBytes ?? 0) || 0,
    uploader: att?.uploader || null,
  }
}

export function getTaskPreviewDocuments(taskLike) {
  const raw = Array.isArray(taskLike?.attachments) ? taskLike.attachments : []
  return raw.map((a, i) => normalizeTaskAttachmentForPreview(a, i)).filter(Boolean)
}
