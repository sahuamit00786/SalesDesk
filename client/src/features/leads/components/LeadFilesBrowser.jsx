import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import {
  ChevronRight, File, Folder, FolderOpen, FolderPlus, Grid3X3, Plus, Search, Upload, X,
} from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import {
  useGetDocumentsQuery,
  useGetDocumentFolderTreeQuery,
  useUploadDocumentMutation,
  useCreateDocumentFolderMutation,
  useMoveDocumentFolderMutation,
  useDeleteDocumentMutation,
} from '@/features/documents/documentsApi'
import { DocumentCard, DOC_CARD_GRID } from '@/features/documents/components/DocumentCard'
import { DocumentPreviewDialog } from '@/features/documents/components/DocumentPreviewDialog'

function nestFolders(flat, parentId = null) {
  return flat
    .filter((f) => (f.parentFolderId ?? null) === parentId)
    .map((f) => ({ ...f, children: nestFolders(flat, f.id) }))
}

// ─── Recursive folder row in the sidebar (drop target) ───────────────────────
function FolderSideItem({ folder, depth = 0, activeId, hasCut, dragOverId, onSelect, onDragOver, onDragLeave, onDrop }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = folder.children?.length > 0
  const isActive = activeId === folder.id
  const isDragOver = dragOverId === folder.id

  return (
    <div>
      <div
        className={cn(
          'group flex w-full items-center rounded-lg py-1 pr-1 transition',
          isActive ? 'bg-brand-50' : 'hover:bg-white',
          isDragOver && 'bg-amber-50 ring-1 ring-amber-300',
          hasCut && 'cursor-copy',
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id) }}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        {hasChildren ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 rounded p-0.5 hover:bg-slate-200">
            <ChevronRight size={12} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect({ type: 'folder', id: folder.id, name: folder.name })}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left',
            isActive ? 'font-semibold text-brand-800' : 'text-ink-muted',
          )}
        >
          {isActive
            ? <FolderOpen size={14} className="shrink-0 text-brand-600" />
            : <Folder size={14} className="shrink-0 text-amber-500" />}
          <span className="min-w-0 flex-1 truncate text-xs">{folder.name}</span>
        </button>
      </div>
      {expanded && hasChildren && folder.children.map((child) => (
        <FolderSideItem
          key={child.id}
          folder={child}
          depth={depth + 1}
          activeId={activeId}
          hasCut={hasCut}
          dragOverId={dragOverId}
          onSelect={onSelect}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}
    </div>
  )
}

// ─── Subfolder tile in the main area (drop target) ───────────────────────────
function SubfolderTile({ folder, isDragOver, hasCut, onDragOver, onDragLeave, onDrop, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id) }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folder.id)}
      className={cn(
        'flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-white px-2 py-3 text-center transition hover:border-brand-200 hover:shadow-md',
        isDragOver ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-surface-border',
        hasCut && 'cursor-copy ring-2 ring-brand-400 border-brand-300',
      )}
    >
      <Folder size={28} className={cn('shrink-0 transition', isDragOver ? 'text-amber-500' : 'text-amber-400')} strokeWidth={1.5} />
      <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight text-ink">{folder.name}</span>
      {hasCut && <span className="text-[9px] font-medium text-brand-600">Click to paste</span>}
    </button>
  )
}

/**
 * Lead-scoped file manager body — folder tree, breadcrumb, upload, drag-and-drop,
 * Ctrl+X / Ctrl+V cut-paste, delete, preview.
 *
 * Rendered both inline (Documents tab "Files" section) and inside the drawer
 * below (`LeadFilesBrowser`), so both surfaces always show identical data —
 * they share the same RTK Query cache keys.
 */
export function LeadFilesPanel({ leadId, leadName = 'This lead', onClose, className, hideSidebar = false }) {
  const [context, setContext] = useState({ type: 'lead', id: leadId, name: leadName })
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [cutIds, setCutIds] = useState([])
  const [dragDocId, setDragDocId] = useState(null)
  const [dragOverFolderId, setDragOverFolderId] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [viewerDoc, setViewerDoc] = useState(null)
  const [osDragOver, setOsDragOver] = useState(false)
  const newFolderInputRef = useRef(null)
  const uploadInputRef = useRef(null)

  const { data: treeData, refetch: refetchTree } = useGetDocumentFolderTreeQuery()
  // Only this lead's folders — never global / other-entity folders.
  const flatFolders = useMemo(() => {
    const all = treeData?.data?.manualFolders || []
    return all.filter((f) => f.entityType === 'lead' && String(f.entityId) === String(leadId))
  }, [treeData, leadId])
  const nestedFolders = useMemo(() => nestFolders(flatFolders), [flatFolders])

  const docParams = context.type === 'folder' ? { leadId, folderId: context.id } : { leadId }
  const { data: docsData, isLoading, refetch: refetchDocs } = useGetDocumentsQuery(docParams, { skip: !leadId })
  // On the root ("All files") view, hide files already sitting inside one of this lead's folders —
  // they only render as folder contents once you open that folder, not in the loose top-level list.
  const leadFolderIds = useMemo(() => new Set(flatFolders.map((f) => f.id)), [flatFolders])
  const rows = useMemo(() => {
    const list = docsData?.data || []
    if (context.type === 'folder') return list
    return list.filter((r) => !(r.folderLinks || []).some((l) => leadFolderIds.has(l.folderId)))
  }, [docsData, context.type, leadFolderIds])

  const [createFolder, { isLoading: creatingFolder }] = useCreateDocumentFolderMutation()
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation()
  const [moveDocumentFolder] = useMoveDocumentFolderMutation()
  const [deleteDocument] = useDeleteDocumentMutation()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      String(r.name || '').toLowerCase().includes(q) || String(r.description || '').toLowerCase().includes(q),
    )
  }, [rows, search])

  const currentSubfolders = useMemo(() => {
    const parentId = context.type === 'folder' ? context.id : null
    return flatFolders.filter((f) => (f.parentFolderId ?? null) === parentId)
  }, [flatFolders, context])

  const folderPath = useMemo(() => {
    if (context.type !== 'folder') return []
    const byId = new Map(flatFolders.map((f) => [f.id, f]))
    const path = []
    let cur = byId.get(context.id)
    let guard = 0
    while (cur && guard++ < 20) {
      path.unshift({ id: cur.id, name: cur.name })
      cur = cur.parentFolderId ? byId.get(cur.parentFolderId) : null
    }
    return path
  }, [context, flatFolders])

  const hasCut = cutIds.length > 0
  const sourceFolderId = context.type === 'folder' ? context.id : null

  const moveDocs = useCallback(async (ids, toFolderId) => {
    if (!ids.length || !toFolderId) return
    try {
      await Promise.all(ids.map((id) => moveDocumentFolder({ id, fromFolderId: sourceFolderId, toFolderId }).unwrap()))
      toast.success(`${ids.length} file${ids.length !== 1 ? 's' : ''} moved`)
      setCutIds([])
      setSelectedIds([])
      refetchDocs()
      refetchTree()
    } catch {
      toast.error('Could not move files')
    }
  }, [moveDocumentFolder, sourceFolderId, refetchDocs, refetchTree])

  const selectFolder = useCallback((ctx) => {
    if (hasCut && ctx.type === 'folder') {
      moveDocs(cutIds, ctx.id)
    }
    setContext(ctx)
    setSearch('')
  }, [hasCut, cutIds, moveDocs])

  const pasteToCurrent = useCallback(() => {
    if (!hasCut) return
    if (context.type !== 'folder') {
      toast('Open a folder, then paste', { icon: '📂' })
      return
    }
    moveDocs(cutIds, context.id)
  }, [hasCut, cutIds, context, moveDocs])

  // Keyboard: Ctrl+X cut, Ctrl+V paste, Esc clear (or close, if embedded in a modal)
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedIds.length) {
        e.preventDefault()
        setCutIds([...selectedIds])
        toast(`${selectedIds.length} file${selectedIds.length !== 1 ? 's' : ''} cut — click a folder to paste`, { icon: '✂️' })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        pasteToCurrent()
      }
      if (e.key === 'Escape') {
        if (cutIds.length || selectedIds.length) {
          setCutIds([])
          setSelectedIds([])
        } else if (onClose) {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedIds, cutIds, pasteToCurrent, onClose])

  const handleDragStart = (e, docId) => {
    e.dataTransfer.setData('docId', docId)
    e.dataTransfer.effectAllowed = 'move'
    setDragDocId(docId)
  }
  const handleDragEnd = () => { setDragDocId(null); setDragOverFolderId(null) }

  const handleDropOnFolder = async (e, folderId) => {
    e.preventDefault()
    const docId = e.dataTransfer.getData('docId')
    setDragDocId(null)
    setDragOverFolderId(null)
    if (!folderId) return
    const ids = selectedIds.length > 1 && selectedIds.includes(docId) ? selectedIds : (docId ? [docId] : [])
    await moveDocs(ids, folderId)
  }

  const doUpload = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const folderId = context.type === 'folder' ? context.id : undefined
    try {
      await Promise.all(
        list.map((file) =>
          uploadDocument({
            file,
            name: file.name,
            fileType: 'Other',
            folderId,
            links: [{ entityType: 'lead', entityId: leadId }],
          }).unwrap(),
        ),
      )
      toast.success(`${list.length} file${list.length !== 1 ? 's' : ''} uploaded`)
      refetchDocs()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Upload failed')
    }
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    const parentFolderId = context.type === 'folder' ? context.id : null
    try {
      const res = await createFolder({ name, parentFolderId, entityType: 'lead', entityId: leadId }).unwrap()
      toast.success(`Folder "${name}" created`)
      setNewFolderName('')
      setShowNewFolder(false)
      refetchTree()
      if (res?.data?.id) setContext({ type: 'folder', id: res.data.id, name: res.data.name })
    } catch {
      toast.error('Could not create folder')
    }
  }

  const handleDeleteDoc = async (row) => {
    try {
      await deleteDocument(row.id).unwrap()
      toast.success('File deleted')
      setSelectedIds((p) => p.filter((x) => x !== row.id))
      refetchDocs()
    } catch {
      toast.error('Could not delete file')
    }
  }

  const toggleSelect = (id) => setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 overflow-hidden', className)}>
        {/* Sidebar */}
        {!hideSidebar && (
        <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-subtle/40">
          <div className="shrink-0 p-3 pb-2">
            <button
              type="button"
              onClick={() => selectFolder({ type: 'lead', id: leadId, name: leadName })}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition',
                context.type === 'lead'
                  ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                  : 'text-ink-muted hover:bg-white hover:text-ink',
              )}
            >
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                context.type === 'lead' ? 'bg-brand-100 text-brand-700' : 'bg-white text-ink-muted ring-1 ring-surface-border',
              )}>
                <Grid3X3 size={14} />
              </span>
              All files
            </button>
          </div>

          <div className="scrollbar-subtle flex-1 overflow-y-auto px-3 pb-4">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Folders</span>
              <button
                type="button"
                title="New folder"
                onClick={() => { setShowNewFolder((v) => !v); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
                className="rounded-lg p-1 text-ink-muted hover:bg-white hover:text-ink"
              >
                <FolderPlus size={13} />
              </button>
            </div>

            {showNewFolder && (
              <div className="mb-2 flex items-center gap-1">
                <input
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                  placeholder="Folder name"
                  className="h-7 min-w-0 flex-1 rounded-lg border border-brand-300 px-2 text-xs outline-none focus:border-brand-500"
                />
                <button type="button" onClick={handleCreateFolder} disabled={creatingFolder} className="h-7 shrink-0 rounded-lg bg-brand-700 px-2 text-xs cx-icon-inherit text-white disabled:opacity-60">
                  {creatingFolder ? '…' : <Plus size={12} />}
                </button>
              </div>
            )}

            {nestedFolders.length === 0 && !showNewFolder && (
              <p className="px-1 py-1 text-xs text-ink-faint">No folders yet.</p>
            )}

            {nestedFolders.map((folder) => (
              <FolderSideItem
                key={folder.id}
                folder={folder}
                activeId={context.id}
                hasCut={hasCut}
                dragOverId={dragOverFolderId}
                onSelect={selectFolder}
                onDragOver={setDragOverFolderId}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={handleDropOnFolder}
              />
            ))}
          </div>
        </aside>
        )}

        {/* Main */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOsDragOver(true) } }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setOsDragOver(false) }}
          onDrop={(e) => {
            if (e.dataTransfer.files?.length) { e.preventDefault(); setOsDragOver(false); doUpload(e.dataTransfer.files) }
          }}
        >
          {/* Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border px-4 py-2">
            <nav className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
              <button
                type="button"
                onClick={() => selectFolder({ type: 'lead', id: leadId, name: leadName })}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-surface-subtle',
                  context.type === 'lead' ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink')}
              >
                <Grid3X3 size={13} className="text-ink-faint" />
                All files
              </button>
              {folderPath.map((seg, i) => {
                const isLast = i === folderPath.length - 1
                return (
                  <span key={seg.id} className="flex min-w-0 items-center gap-0.5">
                    <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                    <button
                      type="button"
                      onClick={() => !isLast && selectFolder({ type: 'folder', id: seg.id, name: seg.name })}
                      className={cn('flex min-w-0 items-center gap-1.5 truncate rounded-lg px-1.5 py-1',
                        isLast ? 'font-semibold text-ink' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink')}
                    >
                      {isLast && <FolderOpen size={13} className="shrink-0 text-amber-500" />}
                      <span className="truncate">{seg.name}</span>
                    </button>
                  </span>
                )
              })}
            </nav>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files…"
                className="h-8 w-40 rounded-xl border border-surface-border bg-white pl-8 pr-3 text-xs outline-none focus:border-brand-400"
              />
            </div>
            <button
              type="button"
              onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-surface-border bg-white px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-subtle hover:text-ink"
            >
              <FolderPlus size={13} />
              New folder
            </button>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              <Upload size={13} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { doUpload(e.target.files); e.target.value = '' }}
            />
          </div>

          {/* Selection / cut strip */}
          {(hasCut || selectedIds.length > 0) && (
            <div className="flex shrink-0 items-center gap-2 border-b border-surface-border bg-surface-subtle/40 px-4 py-1.5 text-xs">
              {hasCut ? (
                <span className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                  ✂️ {cutIds.length} cut — click a folder to paste
                  <button type="button" onClick={() => setCutIds([])} className="ml-1 rounded p-0.5 hover:bg-brand-100"><X size={11} /></button>
                </span>
              ) : (
                <>
                  <span className="text-ink-muted">{selectedIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() => { setCutIds([...selectedIds]); toast(`${selectedIds.length} cut — click a folder to paste`, { icon: '✂️' }) }}
                    className="h-7 rounded-lg border border-surface-border bg-white px-2.5 text-ink-muted hover:bg-surface-subtle"
                  >
                    ✂️ Cut
                  </button>
                  <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-surface-border px-2 py-1 text-ink-muted hover:bg-surface-subtle">
                    Deselect
                  </button>
                </>
              )}
            </div>
          )}

          {/* Body */}
          <div className={cn('scrollbar-subtle relative flex-1 overflow-y-auto p-4', osDragOver && 'ring-2 ring-inset ring-brand-400 bg-brand-50/30')}>
            {osDragOver && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <span className="rounded-xl bg-brand-700/90 px-4 py-2 text-sm font-semibold cx-icon-inherit text-white shadow-lg">Drop to upload</span>
              </div>
            )}

            {currentSubfolders.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <Folder size={14} className="shrink-0 text-amber-500" strokeWidth={1.75} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Folders</p>
                  <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{currentSubfolders.length}</span>
                  <div className="ml-1 flex-1 border-t border-surface-border" />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {currentSubfolders.map((sub) => (
                    <SubfolderTile
                      key={sub.id}
                      folder={sub}
                      isDragOver={dragOverFolderId === sub.id}
                      hasCut={hasCut}
                      onDragOver={setDragOverFolderId}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={handleDropOnFolder}
                      onClick={() => selectFolder({ type: 'folder', id: sub.id, name: sub.name })}
                    />
                  ))}
                </div>
                {filtered.length > 0 && <div className="mb-1 mt-4 border-t border-surface-border" />}
              </div>
            )}

            {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

            {!isLoading && filtered.length === 0 && currentSubfolders.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-muted/30 py-16 text-center">
                <File className="mb-3 h-10 w-10 text-ink-faint" />
                <p className="text-sm font-medium text-ink">{rows.length === 0 ? 'No files here yet' : 'No files match your search'}</p>
                <p className="mt-1 text-xs text-ink-muted">Drag files here, or use Upload above.</p>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <Upload size={14} />
                  Upload file
                </button>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className={DOC_CARD_GRID}>
                {filtered.map((row) => {
                  const isCut = cutIds.includes(row.id)
                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'cursor-grab transition active:cursor-grabbing',
                        (dragDocId === row.id || isCut) && 'opacity-40',
                        isCut && 'rounded-2xl ring-2 ring-brand-400',
                      )}
                    >
                      <DocumentCard
                        row={row}
                        selected={selectedIds.includes(row.id)}
                        onToggleSelect={toggleSelect}
                        onOpen={setViewerDoc}
                        onDelete={handleDeleteDoc}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentPreviewDialog document={viewerDoc} onClose={() => setViewerDoc(null)} />
    </>
  )
}

/**
 * Lead-scoped file manager rendered in a wide right drawer.
 * Body is `LeadFilesPanel` — see that component for the actual folder/file logic.
 */
export function LeadFilesBrowser({ open, onClose, leadId, leadName = 'This lead' }) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end" role="dialog" aria-modal="true" aria-label="Lead files">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex h-full max-h-dvh w-full max-w-full flex-col overflow-hidden border-l border-brand-200/60 bg-white shadow-2xl animate-in slide-in-from-right duration-200 ease-out sm:max-w-[min(1080px,96vw)] sm:rounded-l-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-ink">Files — {leadName}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Drag files into folders · Ctrl+X to cut, Ctrl+V or click a folder to paste</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <LeadFilesPanel leadId={leadId} leadName={leadName} onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}
