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
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  if (filePath.startsWith('/')) return encodeURI(filePath)
  return encodeURI(`/${filePath}`)
}
