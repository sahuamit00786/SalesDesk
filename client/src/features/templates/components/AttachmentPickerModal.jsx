import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import {
  ChevronRight,
  File as FileIcon,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Search,
  Upload,
  User,
  X,
} from 'lucide-react'
import { useGetDocumentFolderTreeQuery, useGetDocumentsQuery } from '@/features/documents/documentsApi'
import { useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { getFileUrl } from '@/features/documents/documentUtils'
import { cn } from '@/utils/cn'

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

function nestFolders(flat, parentId = null) {
  return flat
    .filter((f) => (f.parentFolderId ?? null) === parentId)
    .map((f) => ({ ...f, children: nestFolders(flat, f.id) }))
}

function leadLabel(lead) {
  return lead?.title || lead?.contactName || lead?.email || 'Untitled lead'
}

function PickerCard({ icon: Icon, name, meta, checked, disabled, onToggle }) {
  return (
    <label
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'border-brand-300 bg-brand-50' : 'border-surface-border bg-white hover:border-brand-200 hover:bg-surface-muted',
      )}
    >
      <input
        type="checkbox"
        className="absolute left-2 top-2 h-4 w-4 accent-brand-600"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 w-full">
        <p className="truncate text-xs font-medium text-ink" title={name}>{name}</p>
        <p className="truncate text-[10px] text-ink-muted">{meta}</p>
      </div>
    </label>
  )
}

function FolderNavItem({ folder, depth = 0, activeKey, onSelect }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = folder.children?.length > 0
  const key = `folder:${folder.id}`
  const isActive = activeKey === key

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${8 + depth * 12}px` }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded p-0.5 hover:bg-slate-200"
          >
            <ChevronRight size={12} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect({ type: 'folder', id: folder.id, name: folder.name })}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-xs transition',
            isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
          )}
        >
          {isActive ? <FolderOpen size={14} className="shrink-0 text-brand-600" /> : <Folder size={14} className="shrink-0 text-amber-500" />}
          <span className="truncate">{folder.name}</span>
        </button>
      </div>
      {expanded && hasChildren
        ? folder.children.map((child) => (
          <FolderNavItem key={child.id} folder={child} depth={depth + 1} activeKey={activeKey} onSelect={onSelect} />
        ))
        : null}
    </div>
  )
}

/**
 * Full-featured modal for choosing attachments. Sections in the sidebar:
 *  - All documents / Unlinked / This lead (when `leadId` is preset) / Folders
 *  - By lead: search any lead and browse its linked documents
 *  - Upload: pick new files from the computer
 *
 * Selections persist across section switches and are unified to the shape:
 *   { filename: string, url: string, size: number }
 *
 * On Done, calls onConfirm(attachments) where the array respects `maxAttachments`
 * including the existing attachments already on the draft/task.
 */
export function AttachmentPickerModal({ open, onClose, onConfirm, existing = [], maxAttachments = 3, leadId = null }) {
  const [context, setContext] = useState({ type: 'all', name: 'All documents' })
  const [search, setSearch] = useState('')
  const [leadQuery, setLeadQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [sessionUploads, setSessionUploads] = useState([])

  const { data: treeData } = useGetDocumentFolderTreeQuery(undefined, { skip: !open })
  const flatFolders = treeData?.data?.manualFolders || []
  const nestedFolders = useMemo(() => nestFolders(flatFolders), [flatFolders])

  const { data: leadsRes, isFetching: leadsFetching } = useGetLeadsQuery(
    { page: 1, limit: 8, search: leadQuery.trim() },
    { skip: !open || leadQuery.trim().length < 1 },
  )
  const leadResults = useMemo(() => (Array.isArray(leadsRes?.data) ? leadsRes.data : []), [leadsRes])

  const docParams = useMemo(() => {
    if (context.type === 'folder') return { folderId: context.id }
    if (context.type === 'lead') return { leadId: context.id }
    if (context.type === 'unlinked') return { unlinked: 'true' }
    return {}
  }, [context])

  const { data: docsResp, isFetching: docsFetching } = useGetDocumentsQuery(docParams, {
    skip: !open || context.type === 'upload',
  })
  const documents = useMemo(() => {
    const rows = Array.isArray(docsResp?.data) ? docsResp.data : []
    return rows.filter((r) => r && r.fileType && r.filePath)
  }, [docsResp])

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((d) => {
      const name = String(d.name || '').toLowerCase()
      const type = String(d.fileType || '').toLowerCase()
      return name.includes(q) || type.includes(q)
    })
  }, [documents, search])

  const [uploadAttachments, uploadState] = useUploadEmailAttachmentsMutation()

  const activeKey = useMemo(() => {
    if (context.type === 'folder') return `folder:${context.id}`
    if (context.type === 'lead') return `lead:${context.id}`
    if (context.type === 'unlinked') return 'unlinked'
    if (context.type === 'upload') return 'upload'
    return 'all'
  }, [context])

  useEffect(() => {
    if (!open) return
    setContext({ type: 'all', name: 'All documents' })
    setSearch('')
    setLeadQuery('')
    setSelected([])
    setSessionUploads([])
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const remainingSlots = Math.max(0, maxAttachments - (existing?.length || 0))
  const overLimit = selected.length > remainingSlots
  const atCap = selected.length >= remainingSlots

  function selectContext(next) {
    setContext(next)
    setSearch('')
  }

  function toggleDoc(doc) {
    const uid = `doc:${doc.id}`
    setSelected((prev) => {
      if (prev.some((a) => a.uid === uid)) return prev.filter((a) => a.uid !== uid)
      if (prev.length >= remainingSlots) return prev
      return [...prev, { uid, filename: doc.name || 'document', url: getFileUrl(doc.filePath), size: Number(doc.fileSize || 0) }]
    })
  }

  function toggleUpload(u, index) {
    const uid = `upload:${index}-${u.url}`
    setSelected((prev) => {
      if (prev.some((a) => a.uid === uid)) return prev.filter((a) => a.uid !== uid)
      if (prev.length >= remainingSlots) return prev
      return [...prev, { uid, filename: u.filename, url: u.url, size: u.size }]
    })
  }

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

  function handleDone() {
    if (overLimit) {
      toast.error(`Only ${remainingSlots} attachment${remainingSlots === 1 ? '' : 's'} can be added (max ${maxAttachments}).`)
      return
    }
    if (!selected.length) {
      onClose?.()
      return
    }
    onConfirm?.(selected.map(({ filename, url, size }) => ({ filename, url, size })))
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
        className="relative z-[201] flex h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Add attachment</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Browse workspace documents, a lead&apos;s files, or upload new ones. Up to {maxAttachments} attachments.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-brand-50 hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="scrollbar-subtle w-60 shrink-0 overflow-y-auto border-r border-surface-border bg-slate-50/80 p-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Browse</p>
            <nav className="space-y-0.5">
              <button
                type="button"
                onClick={() => selectContext({ type: 'all', name: 'All documents' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition',
                  activeKey === 'all' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
                )}
              >
                <FileIcon size={14} className="shrink-0" />
                All documents
              </button>
              <button
                type="button"
                onClick={() => selectContext({ type: 'unlinked', name: 'Unlinked' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition',
                  activeKey === 'unlinked' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
                )}
              >
                <Link2 size={14} className="shrink-0" />
                Unlinked
              </button>
              {leadId ? (
                <button
                  type="button"
                  onClick={() => selectContext({ type: 'lead', id: leadId, name: 'This lead' })}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition',
                    activeKey === `lead:${leadId}` ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
                  )}
                >
                  <FileText size={14} className="shrink-0" />
                  This lead
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => selectContext({ type: 'upload', name: 'Upload from computer' })}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition',
                  activeKey === 'upload' ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
                )}
              >
                <Upload size={14} className="shrink-0" />
                Upload from computer
              </button>
            </nav>

            <div className="mt-4">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">By lead</p>
              <div className="mx-1 flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
                <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <input
                  value={leadQuery}
                  onChange={(e) => setLeadQuery(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
              {leadQuery.trim().length >= 1 ? (
                <div className="mt-1 space-y-0.5">
                  {leadsFetching ? (
                    <p className="px-2 py-1.5 text-[11px] text-ink-muted">Searching...</p>
                  ) : leadResults.length ? (
                    leadResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => selectContext({ type: 'lead', id: lead.id, name: leadLabel(lead) })}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition',
                          activeKey === `lead:${lead.id}` ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-muted hover:bg-white hover:text-ink',
                        )}
                      >
                        <User size={13} className="shrink-0" />
                        <span className="truncate">{leadLabel(lead)}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-[11px] text-ink-muted">No leads found</p>
                  )}
                </div>
              ) : null}
            </div>

            {nestedFolders.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Folders</p>
                {nestedFolders.map((folder) => (
                  <FolderNavItem
                    key={folder.id}
                    folder={folder}
                    activeKey={activeKey}
                    onSelect={selectContext}
                  />
                ))}
              </div>
            ) : null}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {context.type === 'upload' ? (
              <>
                <div className="shrink-0 border-b border-surface-border px-5 py-4">
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-6 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100">
                    <Upload className="h-4 w-4" />
                    {uploadState.isLoading ? 'Uploading...' : 'Choose files from your computer'}
                    <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploadState.isLoading} />
                  </label>
                  <p className="mt-2 text-[11px] text-ink-muted">
                    Up to 10MB per file. Uploaded files are stored on the server and selected here will attach.
                  </p>
                </div>
                <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-3">
                  {sessionUploads.length ? (
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {sessionUploads.map((u, i) => {
                        const uid = `upload:${i}-${u.url}`
                        const checked = selected.some((a) => a.uid === uid)
                        const disabled = !checked && atCap
                        return (
                          <li key={uid}>
                            <PickerCard
                              icon={fileIconFor(u.filename)}
                              name={u.filename}
                              meta={formatSize(u.size)}
                              checked={checked}
                              disabled={disabled}
                              onToggle={() => toggleUpload(u, i)}
                            />
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
              </>
            ) : (
              <>
                <div className="shrink-0 border-b border-surface-border px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{context.name}</p>
                    <span className="shrink-0 text-xs text-ink-muted">{selected.length} selected</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
                    <Search className="h-4 w-4 shrink-0 text-ink-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search documents by name or type"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {docsFetching ? (
                    <p className="py-8 text-center text-sm text-ink-muted">Loading documents...</p>
                  ) : filteredDocuments.length ? (
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {filteredDocuments.map((d) => {
                        const uid = `doc:${d.id}`
                        const checked = selected.some((a) => a.uid === uid)
                        const disabled = !checked && atCap
                        return (
                          <li key={d.id}>
                            <PickerCard
                              icon={fileIconFor(d.name)}
                              name={d.name}
                              meta={`${d.fileType} • ${formatSize(d.fileSize)}`}
                              checked={checked}
                              disabled={disabled}
                              onToggle={() => toggleDoc(d)}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-sm font-medium text-ink">No documents found</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Try another folder, Unlinked, a different lead, or upload files from the &quot;Upload&quot; section.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-surface-border bg-slate-50/50 px-5 py-4">
          <p className={cn('text-[11px]', overLimit ? 'text-rose-600' : 'text-ink-muted')}>
            {overLimit
              ? `Reduce selection: only ${remainingSlots} more attachment${remainingSlots === 1 ? '' : 's'} allowed.`
              : `${existing?.length || 0} already attached • ${selected.length} selected • ${maxAttachments} max.`}
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
              disabled={overLimit || selected.length === 0}
              className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Attach {selected.length ? `(${selected.length})` : ''}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
