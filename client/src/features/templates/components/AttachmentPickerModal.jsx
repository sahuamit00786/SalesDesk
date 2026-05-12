import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { File as FileIcon, FileText, Image as ImageIcon, Search, Upload, X } from 'lucide-react'
import { useGetDocumentsQuery } from '@/features/documents/documentsApi'
import { useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'

function formatSize(bytes) {
  const num = Number(bytes) || 0
  if (num >= 1024 * 1024) return `${(num / 1024 / 1024).toFixed(2)} MB`
  if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`
  return `${num} B`
}

function fileIconFor(name) {
  const ext = String(name || '').toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return ImageIcon
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return FileText
  return FileIcon
}

/**
 * Centered modal for choosing template attachments. Two tabs:
 *  - Documents: workspace library via /api/v1/documents (files only).
 *  - Choose from System: file picker that uploads via /email/attachments.
 *
 * Selections are unified to the template attachment shape:
 *   { filename: string, url: string, size: number }
 *
 * On Done, calls onConfirm(attachments) where the array respects `maxAttachments`
 * including the existing attachments in the draft.
 */
export function AttachmentPickerModal({ open, onClose, onConfirm, existing = [], maxAttachments = 3 }) {
  const [tab, setTab] = useState('documents')
  const [search, setSearch] = useState('')
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [sessionUploads, setSessionUploads] = useState([])
  const [selectedUploadIndexes, setSelectedUploadIndexes] = useState([])

  const { data: docsResp, isFetching } = useGetDocumentsQuery({ search }, { skip: !open })
  const documents = useMemo(() => {
    const rows = Array.isArray(docsResp?.data) ? docsResp.data : []
    return rows.filter((r) => r && r.fileType && r.filePath)
  }, [docsResp])

  const [uploadAttachments, uploadState] = useUploadEmailAttachmentsMutation()

  useEffect(() => {
    if (!open) return
    setTab('documents')
    setSearch('')
    setSelectedDocIds([])
    setSessionUploads([])
    setSelectedUploadIndexes([])
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const remainingSlots = Math.max(0, maxAttachments - (existing?.length || 0))
  const totalSelected = selectedDocIds.length + selectedUploadIndexes.length
  const overLimit = totalSelected > remainingSlots

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const tooLarge = files.find((f) => f.size > 10 * 1024 * 1024)
    if (tooLarge) {
      toast.error(`File exceeds 10MB: ${tooLarge.name}`)
      e.target.value = ''
      return
    }
    try {
      const res = await uploadAttachments(files).unwrap()
      const rows = Array.isArray(res?.data) ? res.data : []
      const normalized = rows.map((r) => ({
        filename: r.fileName || r.filename || 'attachment',
        url: r.fileUrl || r.url || '',
        size: Number(r.sizeBytes ?? r.size ?? 0),
      }))
      setSessionUploads((prev) => [...prev, ...normalized])
      toast.success(`${normalized.length} file${normalized.length === 1 ? '' : 's'} uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      e.target.value = ''
    }
  }

  function toggleDoc(id) {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleUpload(index) {
    setSelectedUploadIndexes((prev) => (prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]))
  }

  function handleDone() {
    if (overLimit) {
      toast.error(`Only ${remainingSlots} attachment${remainingSlots === 1 ? '' : 's'} can be added (max ${maxAttachments}).`)
      return
    }
    const fromDocs = documents
      .filter((d) => selectedDocIds.includes(d.id))
      .map((d) => ({
        filename: d.name || 'document',
        url: d.filePath || '',
        size: Number(d.fileSize || 0),
      }))
    const fromUploads = sessionUploads.filter((_, i) => selectedUploadIndexes.includes(i))
    const next = [...fromDocs, ...fromUploads].filter((a) => a.url && a.filename)
    if (!next.length) {
      onClose?.()
      return
    }
    onConfirm?.(next)
    onClose?.()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close attachment picker"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[201] flex h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Add attachment</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Pick from your workspace documents or upload new files. Up to {maxAttachments} attachments per template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-1 border-b border-surface-border px-3 pt-2">
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
            Documents
          </TabButton>
          <TabButton active={tab === 'system'} onClick={() => setTab('system')}>
            Choose from system
          </TabButton>
          <span className="ml-auto pb-2 text-[11px] text-ink-muted">
            {totalSelected} selected • {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} remaining
          </span>
        </div>

        {tab === 'documents' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
                <Search className="h-4 w-4 text-ink-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents by name or type"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {isFetching ? (
                <p className="px-1 py-4 text-xs text-ink-muted">Loading documents...</p>
              ) : documents.length ? (
                <ul className="space-y-2">
                  {documents.map((d) => {
                    const Icon = fileIconFor(d.name)
                    const checked = selectedDocIds.includes(d.id)
                    return (
                      <li key={d.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                            checked
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-surface-border bg-white hover:bg-surface-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-orange-500"
                            checked={checked}
                            onChange={() => toggleDoc(d.id)}
                          />
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                            <p className="truncate text-[11px] text-ink-muted">
                              {d.fileType} • {formatSize(d.fileSize)}
                            </p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-ink">No documents found</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Upload files to your workspace from the Documents page or use the &quot;Choose from system&quot; tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-surface-border px-5 py-3">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-6 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100">
                <Upload className="h-4 w-4" />
                {uploadState.isLoading ? 'Uploading...' : 'Choose files from your computer'}
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploadState.isLoading} />
              </label>
              <p className="mt-2 text-[11px] text-ink-muted">
                Upload up to 10MB per file. Uploaded files are stored on the server and selected here will attach to the template.
              </p>
            </div>
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {sessionUploads.length ? (
                <ul className="space-y-2">
                  {sessionUploads.map((u, i) => {
                    const Icon = fileIconFor(u.filename)
                    const checked = selectedUploadIndexes.includes(i)
                    return (
                      <li key={`${u.url}-${i}`}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                            checked
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-surface-border bg-white hover:bg-surface-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-orange-500"
                            checked={checked}
                            onChange={() => toggleUpload(i)}
                          />
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{u.filename}</p>
                            <p className="truncate text-[11px] text-ink-muted">{formatSize(u.size)}</p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-ink">No uploads yet</p>
                  <p className="mt-1 text-xs text-ink-muted">Pick files from your computer above to make them available here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-surface-border px-5 py-3">
          <p className={`text-[11px] ${overLimit ? 'text-rose-600' : 'text-ink-muted'}`}>
            {overLimit
              ? `Reduce selection: only ${remainingSlots} more attachment${remainingSlots === 1 ? '' : 's'} allowed.`
              : `${existing?.length || 0} already attached • ${maxAttachments} max.`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-surface-border px-3 text-xs font-semibold text-ink-muted hover:bg-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={overLimit || totalSelected === 0}
              className="h-9 rounded-lg bg-orange-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-t-md px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'border-b-2 border-orange-500 text-orange-700'
          : 'border-b-2 border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
