import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useGetDocumentFolderTreeQuery, useGetDocumentsQuery } from '@/features/documents/documentsApi'
import { getFileUrl } from '@/features/documents/documentUtils'
import { cn } from '@/utils/cn'

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fileIconFor(name) {
  const ext = String(name || '').toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return ImageIcon
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return FileText
  return File
}

function nestFolders(flat, parentId = null) {
  return flat
    .filter((f) => (f.parentFolderId ?? null) === parentId)
    .map((f) => ({ ...f, children: nestFolders(flat, f.id) }))
}

function docToAttachment(doc) {
  return {
    id: doc.id,
    fileName: doc.name || 'document',
    fileUrl: getFileUrl(doc.filePath),
    mimeType: doc.fileType || null,
    sizeBytes: Number(doc.fileSize || 0),
  }
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
 * Large modal for multi-selecting workspace documents (folders, unlinked, lead-linked).
 * Returns attachment shape: { id, fileName, fileUrl, mimeType, sizeBytes }
 */
export function DocumentPickerModal({
  open,
  onClose,
  onConfirm,
  leadId = null,
  initialSelected = [],
}) {
  const [context, setContext] = useState({ type: 'all', name: 'All documents' })
  const [search, setSearch] = useState('')
  const [selectedAttachments, setSelectedAttachments] = useState([])
  const selectedIds = useMemo(() => selectedAttachments.map((a) => a.id), [selectedAttachments])

  const { data: treeData } = useGetDocumentFolderTreeQuery(undefined, { skip: !open })
  const flatFolders = treeData?.data?.manualFolders || []
  const nestedFolders = useMemo(() => nestFolders(flatFolders), [flatFolders])

  const docParams = useMemo(() => {
    if (context.type === 'folder') return { folderId: context.id }
    if (context.type === 'lead') return { leadId: context.id }
    if (context.type === 'unlinked') return { unlinked: 'true' }
    return {}
  }, [context])

  const { data: docsResp, isFetching } = useGetDocumentsQuery(docParams, { skip: !open })
  const documents = useMemo(() => {
    const rows = Array.isArray(docsResp?.data) ? docsResp.data : []
    return rows.filter((r) => r?.filePath)
  }, [docsResp])

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((d) => {
      const name = String(d.name || '').toLowerCase()
      const desc = String(d.description || '').toLowerCase()
      const type = String(d.fileType || '').toLowerCase()
      return name.includes(q) || desc.includes(q) || type.includes(q)
    })
  }, [documents, search])

  const activeKey = useMemo(() => {
    if (context.type === 'folder') return `folder:${context.id}`
    if (context.type === 'lead') return `lead:${context.id}`
    if (context.type === 'unlinked') return 'unlinked'
    return 'all'
  }, [context])

  useEffect(() => {
    if (!open) return
    setContext({ type: 'all', name: 'All documents' })
    setSearch('')
    setSelectedAttachments((initialSelected || []).filter((a) => a?.id))
  }, [open, initialSelected])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  function toggleDoc(doc) {
    const att = docToAttachment(doc)
    setSelectedAttachments((prev) => (
      prev.some((a) => a.id === doc.id)
        ? prev.filter((a) => a.id !== doc.id)
        : [...prev, att]
    ))
  }

  function handleDone() {
    onConfirm?.(selectedAttachments)
    onClose?.()
  }

  function selectContext(next) {
    setContext(next)
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close document picker"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[201] flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Pick documents</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Browse folders, unlinked files, or this lead&apos;s documents. Select multiple files to attach.
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
          <aside className="scrollbar-subtle w-56 shrink-0 overflow-y-auto border-r border-surface-border bg-slate-50/80 p-3">
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
                <File size={14} className="shrink-0" />
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
            </nav>

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
            <div className="shrink-0 border-b border-surface-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{context.name}</p>
                <span className="shrink-0 text-xs text-ink-muted">{selectedIds.length} selected</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
                <Search className="h-4 w-4 shrink-0 text-ink-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, type, or description…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {isFetching ? (
                <p className="py-8 text-center text-sm text-ink-muted">Loading documents…</p>
              ) : filteredDocuments.length ? (
                <ul className="space-y-2">
                  {filteredDocuments.map((doc) => {
                    const Icon = fileIconFor(doc.name)
                    const checked = selectedIds.includes(doc.id)
                    const folderNames = (doc.folderLinks || [])
                      .map((l) => l.folder?.name)
                      .filter(Boolean)
                      .join(', ')
                    const leadLinked = (doc.links || []).some((l) => l.entityType === 'lead')
                    return (
                      <li key={doc.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            checked ? 'border-brand-300 bg-brand-50' : 'border-surface-border bg-white hover:border-brand-200 hover:bg-slate-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                            checked={checked}
                            onChange={() => toggleDoc(doc)}
                          />
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
                            <p className="truncate text-xs text-ink-muted">
                              {doc.fileType || 'File'}
                              {doc.fileSize ? ` • ${formatBytes(doc.fileSize)}` : ''}
                              {folderNames ? ` • ${folderNames}` : ''}
                              {!leadLinked ? ' • Unlinked' : ''}
                            </p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-ink">No documents here</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Try another folder, Unlinked, or upload files from the Documents page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-surface-border bg-slate-50/50 px-5 py-4">
          <p className="text-xs text-ink-muted">
            {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleDone}>
              Attach {selectedIds.length ? `(${selectedIds.length})` : ''}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
