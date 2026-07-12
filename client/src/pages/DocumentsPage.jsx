import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDown, ArrowUp, Building2, ChevronRight, File, FileArchive,
  FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus,
  Grid3X3, List, Music, Pencil, Plus, Presentation, Search, Trash2, Upload, Users, Video, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  useGetDocumentsQuery,
  useLazyGetFolderInfoQuery,
  useGetDocumentFolderTreeQuery,
  useUploadDocumentMutation,
  usePatchDocumentMutation,
  useCreateDocumentFolderMutation,
  useAddDocumentToFolderMutation,
  useRemoveDocumentFromFolderMutation,
  useMoveDocumentFolderMutation,
  useDeleteDocumentMutation,
  useDeleteFolderMutation,
  DOCUMENT_TYPES,
} from '@/features/documents/documentsApi'
import { DocumentCard, DOC_CARD_GRID } from '@/features/documents/components/DocumentCard'
import { fileExtLower } from '@/features/documents/documentUtils'
import { DocumentPreviewDialog } from '@/features/documents/components/DocumentPreviewDialog'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'

// ─── helpers ─────────────────────────────────────────────────────────────────
function splitFileStemAndExt(fileName) {
  const n = String(fileName || '').trim()
  if (!n) return { base: '', ext: '' }
  const last = n.lastIndexOf('.')
  if (last <= 0 || last >= n.length - 1) return { base: n, ext: '' }
  const ext = n.slice(last)
  if (!/^[a-z0-9]+$/i.test(ext.slice(1)) || ext.length > 13) return { base: n, ext: '' }
  return { base: n.slice(0, last), ext }
}
function joinStemExt(base, ext) {
  const b = String(base || '').trim()
  const e = String(ext || '').trim()
  if (!e) return b.slice(0, 255)
  return `${b}${e.startsWith('.') ? e : `.${e}`}`.slice(0, 255)
}
function generateTimestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}
function nestFolders(flat, parentId = null) {
  return flat
    .filter((f) => (f.parentFolderId ?? null) === parentId)
    .map((f) => ({ ...f, children: nestFolders(flat, f.id) }))
}

// ─── File-type grouping ──────────────────────────────────────────────────────
const TYPE_GROUPS = [
  { key: 'image',   label: 'Images',        icon: FileImage,       iconClass: 'text-violet-500' },
  { key: 'pdf',     label: 'PDFs',          icon: FileText,        iconClass: 'text-rose-500' },
  { key: 'doc',     label: 'Documents',     icon: FileText,        iconClass: 'text-sky-500' },
  { key: 'sheet',   label: 'Spreadsheets',  icon: FileSpreadsheet, iconClass: 'text-emerald-500' },
  { key: 'slides',  label: 'Presentations', icon: Presentation,    iconClass: 'text-orange-500' },
  { key: 'audio',   label: 'Audio',         icon: Music,           iconClass: 'text-teal-500' },
  { key: 'video',   label: 'Video',         icon: Video,           iconClass: 'text-fuchsia-500' },
  { key: 'archive', label: 'Archives',      icon: FileArchive,     iconClass: 'text-amber-600' },
  { key: 'other',   label: 'Other files',   icon: File,            iconClass: 'text-zinc-400' },
]
const TYPE_GROUP_MAP = Object.fromEntries(TYPE_GROUPS.map((g) => [g.key, g]))

function getTypeGroupKey(name) {
  const ext = fileExtLower(name)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'avif'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'md'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'slides'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  return 'other'
}

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Earlier this month', 'Older']
function getDateGroupLabel(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Older'
  const now = new Date()
  const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Earlier this week'
  if (diffDays < 30) return 'Earlier this month'
  return 'Older'
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}

function FileTypeIcon({ name, size = 15 }) {
  const g = TYPE_GROUP_MAP[getTypeGroupKey(name)]
  const Icon = g.icon
  return <Icon size={size} className={cn('shrink-0', g.iconClass)} strokeWidth={1.75} />
}

function FragmentGroup({ group, showLabel, children }) {
  return (
    <>
      {showLabel && (
        <tr className="bg-surface-subtle/50">
          <td colSpan={7} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            {group.label}
            <span className="ml-1.5 font-semibold normal-case tracking-normal text-ink-muted">({group.items.length})</span>
          </td>
        </tr>
      )}
      {children}
    </>
  )
}

function GroupHeader({ groupKey, label, count, showIcon }) {
  const g = TYPE_GROUP_MAP[groupKey]
  const Icon = showIcon && g ? g.icon : null
  return (
    <div className="mb-2 flex items-center gap-2">
      {Icon && <Icon size={14} className={cn('shrink-0', g.iconClass)} strokeWidth={1.75} />}
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{count}</span>
      <div className="ml-1 flex-1 border-t border-surface-border" />
    </div>
  )
}

// ─── Sidebar folder item (recursive) ─────────────────────────────────────────
function FolderSideItem({ folder, depth = 0, activeId, onSelect, onDelete, dragOverId, onDragOver, onDragLeave, onDrop }) {
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
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id) }}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        {/* expand toggle */}
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

        {/* folder label */}
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

        {/* delete button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(folder) }}
          className="shrink-0 rounded p-1 text-zinc-300 transition hover:bg-red-50 hover:text-red-500"
          title="Delete folder"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {expanded && hasChildren && folder.children.map((child) => (
        <FolderSideItem
          key={child.id}
          folder={child}
          depth={depth + 1}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          dragOverId={dragOverId}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}
    </div>
  )
}

// ─── Subfolder tile shown in main area ───────────────────────────────────────
function SubfolderTile({ folder, isDragOver, hasCut, onDragOver, onDragLeave, onDrop, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id) }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folder.id)}
      className={cn(
        'flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-white px-2 py-3 text-center transition hover:shadow-md hover:border-brand-200',
        isDragOver ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-surface-border',
        hasCut && 'cursor-copy ring-2 ring-brand-400 border-brand-300',
      )}
    >
      <Folder size={28} className={cn('shrink-0 transition', isDragOver ? 'text-amber-500' : 'text-amber-400')} strokeWidth={1.5} />
      <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight text-ink">{folder.name}</span>
      {hasCut && <span className="text-[9px] text-brand-600 font-medium">Click to paste</span>}
    </button>
  )
}

// ─── Centered confirm modal ───────────────────────────────────────────────────
function ConfirmModal({ open, onConfirm, onCancel, loading, title, body, confirmLabel = 'Delete', confirmClass }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative z-[301] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={18} className="text-red-500" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink-muted">{body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
              confirmClass ?? 'bg-red-600 hover:bg-red-700',
            )}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DocumentsPage() {
  const [searchParams] = useSearchParams()
  const [context, setContext] = useState(() => {
    const leadId = searchParams.get('leadId')
    return leadId ? { type: 'lead', id: leadId, name: 'Lead' } : { type: 'all', name: 'All documents' }
  })
  const [dragDocId, setDragDocId] = useState(null)
  const [dragOverFolderId, setDragOverFolderId] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const newFolderInputRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [cutIds, setCutIds] = useState([])            // Ctrl+X clipboard
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({ file: null, nameBase: '', nameExt: '', description: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({ nameBase: '', nameExt: '', description: '' })
  const [viewDoc, setViewDoc] = useState(null)
  const [leadsExpanded, setLeadsExpanded] = useState(true)
  const [leadSearch, setLeadSearch] = useState('')
  const [companiesExpanded, setCompaniesExpanded] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [groupBy, setGroupBy] = useState('type')   // 'type' | 'date' | 'none'
  const [sortBy, setSortBy] = useState('name')     // 'name' | 'date' | 'size'
  const [sortDir, setSortDir] = useState('asc')    // 'asc' | 'desc'
  // Delete confirm modals
  const [deleteFileConfirm, setDeleteFileConfirm] = useState(null) // { id, name }
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(null) // { folder, fileCount, subfolderCount, loading }
  const [deleteActionLoading, setDeleteActionLoading] = useState(false)

  // API
  const [triggerFolderInfo] = useLazyGetFolderInfoQuery()
  const [deleteFolder] = useDeleteFolderMutation()
  const { data: treeData, refetch: refetchTree } = useGetDocumentFolderTreeQuery()
  const allFolders = useMemo(() => treeData?.data?.manualFolders || [], [treeData])
  // Global folders only — shown in the sidebar tree and at the "All documents" root.
  const flatFolders = useMemo(() => allFolders.filter((f) => !f.entityType), [allFolders])
  const nestedFolders = useMemo(() => nestFolders(flatFolders), [flatFolders])
  const leadNodes = treeData?.data?.roots?.find((r) => r.id === 'auto-leads-root')?.children || []
  const companyNodes = treeData?.data?.roots?.find((r) => r.id === 'auto-companies-root')?.children || []

  // Deep-link from a lead's "Open in Documents" — resolve real name once tree loads
  useEffect(() => {
    if (context.type !== 'lead') return
    const found = leadNodes.find((n) => n.entityId === context.id)
    if (found && found.name !== context.name) {
      setContext((c) => (c.type === 'lead' && c.id === found.entityId ? { ...c, name: found.name } : c))
    }
  }, [leadNodes, context.type, context.id, context.name])

  // Folder tiles in the main area: root folders on "All documents", children inside a folder,
  // or that lead/company's own folders when browsing its record.
  const currentSubfolders = useMemo(() => {
    if (context.type === 'folder') return allFolders.filter((f) => (f.parentFolderId ?? null) === context.id)
    if (context.type === 'all') return flatFolders.filter((f) => (f.parentFolderId ?? null) === null)
    if (context.type === 'lead' || context.type === 'company') {
      return allFolders.filter((f) => f.entityType === context.type && String(f.entityId) === String(context.id) && (f.parentFolderId ?? null) === null)
    }
    return []
  }, [context, flatFolders, allFolders])

  const [leadLimit, setLeadLimit] = useState(15)
  const [companyLimit, setCompanyLimit] = useState(15)

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase()
    const list = q ? leadNodes.filter((n) => n.name.toLowerCase().includes(q)) : leadNodes
    return { list: list.slice(0, leadLimit), total: list.length }
  }, [leadNodes, leadSearch, leadLimit])

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase()
    const list = q ? companyNodes.filter((n) => n.name.toLowerCase().includes(q)) : companyNodes
    return { list: list.slice(0, companyLimit), total: list.length }
  }, [companyNodes, companySearch, companyLimit])

  const docParams = useMemo(() => {
    if (context.type === 'folder') return { folderId: context.id }
    if (context.type === 'lead') return { leadId: context.id }
    if (context.type === 'company') return { companyId: context.id }
    return {}
  }, [context])
  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useGetDocumentsQuery(docParams)
  // On a "root" view (all documents, or a lead/company's own list), hide files already sitting inside
  // one of the folders shown as tiles here — they only render as folder contents once that folder is open.
  const rootFolderIds = useMemo(() => {
    if (context.type === 'all') return new Set(flatFolders.map((f) => f.id))
    if (context.type === 'lead' || context.type === 'company') {
      return new Set(allFolders.filter((f) => f.entityType === context.type && String(f.entityId) === String(context.id)).map((f) => f.id))
    }
    return null
  }, [context, flatFolders, allFolders])
  const allRows = useMemo(() => {
    const list = docsData?.data || []
    if (!rootFolderIds) return list
    return list.filter((r) => !(r.folderLinks || []).some((l) => rootFolderIds.has(l.folderId)))
  }, [docsData, rootFolderIds])

  const filtered = useMemo(() => {
    let list = [...allRows]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((r) => String(r.name || '').toLowerCase().includes(q) || String(r.description || '').toLowerCase().includes(q))
    if (typeFilter) list = list.filter((r) => r.fileType === typeFilter)
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortBy === 'size') return dir * ((a.fileSize || 0) - (b.fileSize || 0))
      if (sortBy === 'date') return dir * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      return dir * String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    })
    return list
  }, [allRows, search, typeFilter, sortBy, sortDir])

  // Grouped sections for rendering
  const grouped = useMemo(() => {
    if (groupBy === 'none' || filtered.length === 0) return [{ key: 'all', label: null, items: filtered }]
    const map = new Map()
    for (const r of filtered) {
      const k = groupBy === 'date' ? getDateGroupLabel(r.createdAt) : getTypeGroupKey(r.name)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(r)
    }
    if (groupBy === 'date') {
      return DATE_GROUP_ORDER.filter((l) => map.has(l)).map((l) => ({ key: l, label: l, items: map.get(l) }))
    }
    return TYPE_GROUPS.filter((g) => map.has(g.key)).map((g) => ({ key: g.key, label: g.label, items: map.get(g.key) }))
  }, [filtered, groupBy])

  // Breadcrumb chain for nested folders
  const folderPath = useMemo(() => {
    if (context.type !== 'folder') return []
    const byId = new Map(allFolders.map((f) => [f.id, f]))
    const path = []
    let cur = byId.get(context.id)
    let guard = 0
    while (cur && guard++ < 20) {
      path.unshift({ id: cur.id, name: cur.name })
      cur = cur.parentFolderId ? byId.get(cur.parentFolderId) : null
    }
    return path
  }, [context, allFolders])

  const [createFolder, { isLoading: creatingFolder }] = useCreateDocumentFolderMutation()
  const [addToFolder] = useAddDocumentToFolderMutation()
  const [removeFromFolder] = useRemoveDocumentFromFolderMutation()
  const [moveDocumentFolder] = useMoveDocumentFolderMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation()
  const [patchDocument, { isLoading: patching }] = usePatchDocumentMutation()

  // ── Ctrl+X / Escape keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        if (selectedIds.length) {
          e.preventDefault()
          setCutIds([...selectedIds])
          toast(`${selectedIds.length} document${selectedIds.length !== 1 ? 's' : ''} cut — click a folder to paste`, { icon: '✂️' })
        }
      }
      if (e.key === 'Escape') {
        setCutIds([])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedIds])

  // ── Navigate + paste on folder select ───────────────────────────────────
  async function handleSelectFolder(ctx) {
    if (cutIds.length && ctx.type === 'folder') {
      await pasteToFolder(ctx.id)
    }
    setContext(ctx)
    setSearch('')
    setTypeFilter('')
  }

  async function pasteToFolder(folderId) {
    if (!cutIds.length || !folderId) return
    const sourceFolderId = context.type === 'folder' ? context.id : null
    try {
      await Promise.all(cutIds.map((id) => moveDocumentFolder({ id, fromFolderId: sourceFolderId, toFolderId: folderId }).unwrap()))
      toast.success(`${cutIds.length} document${cutIds.length !== 1 ? 's' : ''} moved`)
      setCutIds([])
      setSelectedIds([])
      refetchDocs()
      refetchTree()
    } catch {
      toast.error('Could not paste documents')
    }
  }

  // ── Folder creation ──────────────────────────────────────────────────────
  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const parentFolderId = context.type === 'folder' ? context.id : null
    try {
      const res = await createFolder({ name, parentFolderId }).unwrap()
      toast.success(`Folder "${name}" created`)
      setNewFolderName('')
      setShowNewFolder(false)
      refetchTree()
      if (res?.data?.id) setContext({ type: 'folder', id: res.data.id, name: res.data.name })
    } catch {
      toast.error('Could not create folder')
    }
  }

  // ── Drag and drop ────────────────────────────────────────────────────────
  function handleDragStart(e, docId) {
    e.dataTransfer.setData('docId', docId)
    e.dataTransfer.effectAllowed = 'move'
    setDragDocId(docId)
  }
  function handleDragEnd() { setDragDocId(null); setDragOverFolderId(null) }

  async function handleDropOnFolder(e, folderId) {
    e.preventDefault()
    const docId = e.dataTransfer.getData('docId')
    setDragDocId(null)
    setDragOverFolderId(null)
    if (!docId || !folderId) return
    const sourceFolderId = context.type === 'folder' ? context.id : null
    try {
      await moveDocumentFolder({ id: docId, fromFolderId: sourceFolderId, toFolderId: folderId }).unwrap()
      toast.success('Document moved to folder')
      refetchDocs()
      refetchTree()
    } catch {
      toast.error('Could not move document')
    }
  }

  // Drop multiple selected docs onto a subfolder tile
  async function handleDropMultiOnFolder(e, folderId) {
    e.preventDefault()
    const docId = e.dataTransfer.getData('docId')
    setDragDocId(null)
    setDragOverFolderId(null)
    if (!folderId) return
    const ids = selectedIds.length > 1 && selectedIds.includes(docId) ? selectedIds : (docId ? [docId] : [])
    if (!ids.length) return
    const sourceFolderId = context.type === 'folder' ? context.id : null
    try {
      await Promise.all(ids.map((id) => moveDocumentFolder({ id, fromFolderId: sourceFolderId, toFolderId: folderId }).unwrap()))
      toast.success(`${ids.length} document${ids.length !== 1 ? 's' : ''} moved`)
      refetchDocs()
      refetchTree()
    } catch {
      toast.error('Could not move documents')
    }
  }

  // ── Bulk move ────────────────────────────────────────────────────────────
  async function handleBulkMoveToFolder(folderId) {
    if (!selectedIds.length || !folderId) return
    try {
      await Promise.all(selectedIds.map((id) => addToFolder({ id, folderIds: [folderId] }).unwrap()))
      toast.success(`${selectedIds.length} document${selectedIds.length !== 1 ? 's' : ''} moved`)
      setSelectedIds([])
      setShowMoveModal(false)
      refetchDocs()
    } catch {
      toast.error('Could not move some documents')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  // ── File delete (opens modal) ────────────────────────────────────────────
  function promptDeleteFile(row) {
    setDeleteFileConfirm({ id: row.id, name: row.name })
  }

  async function confirmDeleteFile() {
    if (!deleteFileConfirm) return
    setDeleteActionLoading(true)
    try {
      await deleteDocument(deleteFileConfirm.id).unwrap()
      toast.success('File deleted')
      setSelectedIds((p) => p.filter((x) => x !== deleteFileConfirm.id))
      setDeleteFileConfirm(null)
      refetchDocs()
    } catch {
      toast.error('Could not delete file')
    } finally {
      setDeleteActionLoading(false)
    }
  }

  // ── Folder delete (fetches count, opens modal) ───────────────────────────
  async function promptDeleteFolder(folder) {
    setDeleteFolderConfirm({ folder, fileCount: null, subfolderCount: null, loading: true })
    try {
      const res = await triggerFolderInfo(folder.id).unwrap()
      setDeleteFolderConfirm({ folder, fileCount: res.data?.fileCount ?? 0, subfolderCount: res.data?.subfolderCount ?? 0, loading: false })
    } catch {
      setDeleteFolderConfirm((prev) => prev ? { ...prev, fileCount: 0, subfolderCount: 0, loading: false } : null)
    }
  }

  async function confirmDeleteFolder() {
    if (!deleteFolderConfirm) return
    setDeleteActionLoading(true)
    try {
      await deleteFolder(deleteFolderConfirm.folder.id).unwrap()
      toast.success(`Folder "${deleteFolderConfirm.folder.name}" deleted`)
      if (context.id === deleteFolderConfirm.folder.id) {
        setContext({ type: 'all', name: 'All documents' })
      }
      setDeleteFolderConfirm(null)
      refetchTree()
      refetchDocs()
    } catch {
      toast.error('Could not delete folder')
    } finally {
      setDeleteActionLoading(false)
    }
  }

  // kept for legacy call in edit drawer
  async function handleDelete(id) {
    const row = allRows.find((r) => r.id === id)
    promptDeleteFile(row || { id, name: 'this file' })
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function onUploadSubmit(e) {
    e.preventDefault()
    if (!uploadForm.file) return toast.error('Select a file')
    const stampedBase = `${uploadForm.nameBase.trim()}_${generateTimestamp()}`
    const fullName = joinStemExt(stampedBase, uploadForm.nameExt).trim()
    if (!fullName) return toast.error('Enter a document name')
    const links = context.type === 'lead' ? [{ entityType: 'lead', entityId: context.id }]
      : context.type === 'company' ? [{ entityType: 'company', entityId: context.id }]
      : []
    const folderId = context.type === 'folder' ? context.id : undefined
    try {
      await uploadDocument({ file: uploadForm.file, name: fullName, fileType: 'Other', description: uploadForm.description.trim() || undefined, folderId, links }).unwrap()
      toast.success('Uploaded')
      setUploadOpen(false)
      setUploadForm({ file: null, nameBase: '', nameExt: '', description: '' })
      refetchDocs()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Upload failed')
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  async function onEditSave() {
    if (!editRow?.id) return
    const fullName = joinStemExt(editForm.nameBase, editForm.nameExt).trim()
    if (!fullName) return toast.error('Name required')
    try {
      await patchDocument({ id: editRow.id, name: fullName, description: editForm.description.trim() || null }).unwrap()
      toast.success('Updated')
      setEditOpen(false)
      setEditRow(null)
      refetchDocs()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Update failed')
    }
  }

  function openEdit(row) {
    setEditRow(row)
    const { base, ext } = splitFileStemAndExt(row.name || '')
    setEditForm({ nameBase: base, nameExt: ext, description: row.description || '' })
    setEditOpen(true)
  }

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length
  const toggleAll = () => setSelectedIds(allSelected ? [] : filtered.map((r) => r.id))

  const contextIcon = context.type === 'folder' ? <FolderOpen size={15} className="text-amber-500" />
    : context.type === 'lead' ? <Users size={15} className="text-brand-500" />
    : context.type === 'company' ? <Building2 size={15} className="text-violet-500" />
    : <Grid3X3 size={15} className="text-ink-faint" />

  const hasCut = cutIds.length > 0

  return (
    <PageShell fullWidth mainClassName="pt-3 sm:pt-4">
      <div className="-mt-2 pl-3 pt-1 sm:-mt-4 sm:pt-2">
        <div className="flex h-[calc(100dvh-84px)] min-h-[560px] overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className="flex w-[240px] shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-subtle/40">

            {/* All documents — pinned */}
            <div className="shrink-0 p-3 pb-2">
              <button
                type="button"
                onClick={() => { setContext({ type: 'all', name: 'All documents' }); setSearch(''); setTypeFilter('') }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition',
                  context.type === 'all'
                    ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                    : 'text-ink-muted hover:bg-white hover:text-ink',
                )}
              >
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  context.type === 'all' ? 'bg-brand-100 text-brand-700' : 'bg-white text-ink-muted ring-1 ring-surface-border',
                )}>
                  <Grid3X3 size={14} />
                </span>
                All documents
              </button>
            </div>

            {/* Scrollable sections */}
            <div className="scrollbar-subtle flex-1 overflow-y-auto px-3 pb-4">

              {/* Custom Folders */}
              <div className="pt-1">
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
                    <button type="button" onClick={handleCreateFolder} disabled={creatingFolder} className="h-7 shrink-0 rounded-lg bg-brand-700 px-2 text-xs text-white disabled:opacity-60">
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
                    onSelect={handleSelectFolder}
                    onDelete={promptDeleteFolder}
                    dragOverId={dragOverFolderId}
                    onDragOver={setDragOverFolderId}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={handleDropOnFolder}
                  />
                ))}
              </div>

              <div className="my-3 border-t border-surface-border" />

              {/* Lead Folders */}
              <div>
                <button
                  type="button"
                  onClick={() => setLeadsExpanded((v) => !v)}
                  className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint hover:text-ink-muted"
                >
                  <ChevronRight size={11} className={cn('transition-transform', leadsExpanded && 'rotate-90')} />
                  Leads
                  <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-ink-muted ring-1 ring-surface-border">{leadNodes.length}</span>
                </button>

                {leadsExpanded && (
                  <>
                    <div className="relative mb-1.5">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                      <input
                        value={leadSearch}
                        onChange={(e) => { setLeadSearch(e.target.value); setLeadLimit(15) }}
                        placeholder="Search leads…"
                        className="h-7 w-full rounded-lg border border-surface-border bg-white pl-7 pr-2 text-xs outline-none focus:border-brand-400"
                      />
                    </div>
                    <div className="space-y-0.5">
                      {filteredLeads.list.map((lead) => {
                        const active = context.id === lead.entityId
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => {
                              if (hasCut) {
                                toast.error("Cannot paste to lead folder. Use drag-drop inside a custom folder.")
                                return
                              }
                              setContext({ type: 'lead', id: lead.entityId, name: lead.name })
                              setSearch('')
                              setTypeFilter('')
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition',
                              active ? 'bg-white font-semibold text-ink shadow-sm ring-1 ring-surface-border' : 'text-ink-muted hover:bg-white/70 hover:text-ink',
                            )}
                          >
                            <span className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold',
                              active ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700',
                            )}>
                              {initialsOf(lead.name)}
                            </span>
                            <span className="truncate text-xs">{lead.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {filteredLeads.total > filteredLeads.list.length && (
                      <button
                        type="button"
                        onClick={() => setLeadLimit((n) => n + 25)}
                        className="mt-1 w-full rounded-lg py-1.5 text-center text-[11px] font-medium text-brand-600 hover:bg-white"
                      >
                        Show more ({filteredLeads.total - filteredLeads.list.length} left)
                      </button>
                    )}
                    {leadSearch && filteredLeads.total === 0 && (
                      <p className="px-2 py-1 text-xs text-ink-faint">No leads match.</p>
                    )}
                  </>
                )}
              </div>

              <div className="my-3 border-t border-surface-border" />

              {/* Company Folders */}
              <div>
                <button
                  type="button"
                  onClick={() => setCompaniesExpanded((v) => !v)}
                  className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint hover:text-ink-muted"
                >
                  <ChevronRight size={11} className={cn('transition-transform', companiesExpanded && 'rotate-90')} />
                  Companies
                  <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-ink-muted ring-1 ring-surface-border">{companyNodes.length}</span>
                </button>

                {companiesExpanded && (
                  <>
                    <div className="relative mb-1.5">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                      <input
                        value={companySearch}
                        onChange={(e) => { setCompanySearch(e.target.value); setCompanyLimit(15) }}
                        placeholder="Search companies…"
                        className="h-7 w-full rounded-lg border border-surface-border bg-white pl-7 pr-2 text-xs outline-none focus:border-brand-400"
                      />
                    </div>
                    <div className="space-y-0.5">
                      {filteredCompanies.list.map((company) => {
                        const active = context.id === company.entityId
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => {
                              setContext({ type: 'company', id: company.entityId, name: company.name })
                              setSearch('')
                              setTypeFilter('')
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition',
                              active ? 'bg-white font-semibold text-ink shadow-sm ring-1 ring-surface-border' : 'text-ink-muted hover:bg-white/70 hover:text-ink',
                            )}
                          >
                            <span className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold',
                              active ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700',
                            )}>
                              {initialsOf(company.name)}
                            </span>
                            <span className="truncate text-xs">{company.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {filteredCompanies.total > filteredCompanies.list.length && (
                      <button
                        type="button"
                        onClick={() => setCompanyLimit((n) => n + 25)}
                        className="mt-1 w-full rounded-lg py-1.5 text-center text-[11px] font-medium text-brand-600 hover:bg-white"
                      >
                        Show more ({filteredCompanies.total - filteredCompanies.list.length} left)
                      </button>
                    )}
                    {companySearch && filteredCompanies.total === 0 && (
                      <p className="px-2 py-1 text-xs text-ink-faint">No companies match.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* ── Main content area ────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Toolbar row 1 — breadcrumb + primary actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border px-4 py-2">
              <nav className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => { setContext({ type: 'all', name: 'All documents' }); setSearch(''); setTypeFilter('') }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-surface-subtle',
                    context.type === 'all' ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <Grid3X3 size={13} className="text-ink-faint" />
                  All documents
                </button>
                {context.type === 'folder' && folderPath.map((seg, i) => {
                  const isLast = i === folderPath.length - 1
                  return (
                    <span key={seg.id} className="flex min-w-0 items-center gap-0.5">
                      <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                      <button
                        type="button"
                        onClick={() => !isLast && handleSelectFolder({ type: 'folder', id: seg.id, name: seg.name })}
                        className={cn(
                          'flex min-w-0 items-center gap-1.5 truncate rounded-lg px-1.5 py-1 transition',
                          isLast ? 'font-semibold text-ink' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                        )}
                      >
                        {isLast && <FolderOpen size={13} className="shrink-0 text-amber-500" />}
                        <span className="truncate">{seg.name}</span>
                      </button>
                    </span>
                  )
                })}
                {(context.type === 'lead' || context.type === 'company') && (
                  <span className="flex min-w-0 items-center gap-0.5">
                    <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                    <span className="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 font-semibold text-ink">
                      {contextIcon}
                      <span className="truncate">{context.name}</span>
                    </span>
                  </span>
                )}
              </nav>
              <div className="flex shrink-0 items-center gap-2">
                {(context.type === 'folder' || context.type === 'all') && (
                  <button
                    type="button"
                    onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-surface-border bg-white px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-subtle hover:text-ink"
                  >
                    <FolderPlus size={13} />
                    New folder
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  <Upload size={13} />
                  Upload
                </button>
              </div>
            </div>

            {/* Toolbar row 2 — search, filters, group, sort, view */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border bg-surface-subtle/30 px-4 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files…"
                  className="h-8 w-44 rounded-xl border border-surface-border bg-white pl-8 pr-3 text-xs outline-none focus:border-brand-400"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-xl border border-surface-border bg-white px-2 text-xs text-ink"
              >
                <option value="">All types</option>
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink-faint">Group:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="h-8 rounded-xl border border-surface-border bg-white px-2 text-xs text-ink"
                >
                  <option value="type">Type</option>
                  <option value="date">Date added</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink-faint">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8 rounded-xl border border-surface-border bg-white px-2 text-xs text-ink"
                >
                  <option value="name">Name</option>
                  <option value="date">Date added</option>
                  <option value="size">Size</option>
                </select>
                <button
                  type="button"
                  title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-surface-border bg-white text-ink-muted hover:bg-surface-subtle hover:text-ink"
                >
                  {sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {hasCut && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                    ✂️ {cutIds.length} cut — click a folder to paste
                    <button type="button" onClick={() => setCutIds([])} className="ml-1 rounded p-0.5 hover:bg-brand-100"><X size={11} /></button>
                  </div>
                )}
                {selectedIds.length > 0 && !hasCut && (
                  <>
                    <span className="text-xs text-ink-muted">{selectedIds.length} selected</span>
                    <button
                      type="button"
                      title="Cut (Ctrl+X) — then click a folder to move"
                      onClick={() => { setCutIds([...selectedIds]); toast(`${selectedIds.length} cut — click a folder to paste`, { icon: '✂️' }) }}
                      className="h-8 rounded-xl border border-surface-border bg-white px-2.5 text-xs text-ink-muted hover:bg-surface-subtle"
                    >
                      ✂️ Cut
                    </button>
                    <Button variant="secondary" onClick={() => setShowMoveModal(true)} className="h-8 gap-1 text-xs">
                      <Folder size={13} />
                      Move to…
                    </Button>
                    <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle">
                      Deselect
                    </button>
                  </>
                )}
                <div className="flex overflow-hidden rounded-xl border border-surface-border">
                  <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={cn('px-2 py-1.5', viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'bg-white text-ink-muted hover:bg-surface-subtle')}><Grid3X3 size={14} /></button>
                  <button type="button" title="List view" onClick={() => setViewMode('list')} className={cn('border-l border-surface-border px-2 py-1.5', viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'bg-white text-ink-muted hover:bg-surface-subtle')}><List size={14} /></button>
                </div>
              </div>
            </div>

            {/* Select all strip */}
            {filtered.length > 0 && (
              <div className="flex shrink-0 items-center gap-2 border-b border-surface-border bg-surface-subtle/30 px-4 py-1.5">
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-ink-muted">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300" />
                  {allSelected ? 'Deselect all' : `Select all (${filtered.length})`}
                </label>
                <span className="ml-auto text-xs text-ink-faint">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Scrollable body */}
            <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">

              {/* Subfolder tiles — shown when inside a custom folder */}
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
                        onDrop={handleDropMultiOnFolder}
                        onClick={() => {
                          if (hasCut) {
                            pasteToFolder(sub.id).then(() => handleSelectFolder({ type: 'folder', id: sub.id, name: sub.name }))
                          } else {
                            handleSelectFolder({ type: 'folder', id: sub.id, name: sub.name })
                          }
                        }}
                      />
                    ))}
                  </div>
                  {filtered.length > 0 && <div className="mt-4 mb-1 border-t border-surface-border" />}
                </div>
              )}

              {docsLoading && <p className="text-sm text-ink-muted">Loading…</p>}

              {!docsLoading && filtered.length === 0 && currentSubfolders.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-muted/30 py-16 text-center">
                  <File className="mb-3 h-10 w-10 text-ink-faint" />
                  <p className="text-sm font-medium text-ink">
                    {allRows.length === 0 ? 'No documents here yet' : 'No documents match your filters'}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {allRows.length === 0 ? 'Upload a file to get started.' : 'Try clearing search or filters.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    <Upload size={14} />
                    Upload document
                  </button>
                </div>
              )}

              {!docsLoading && filtered.length === 0 && currentSubfolders.length > 0 && (
                <p className="text-sm text-ink-faint text-center py-6">No loose files here. Open a folder or upload above.</p>
              )}

              {!docsLoading && filtered.length > 0 && viewMode === 'grid' && (
                <div className="space-y-6">
                  {grouped.map((group) => (
                    <section key={group.key}>
                      {group.label && <GroupHeader groupKey={group.key} label={group.label} count={group.items.length} showIcon={groupBy === 'type'} />}
                      <div className={DOC_CARD_GRID}>
                        {group.items.map((row) => {
                          const isCut = cutIds.includes(row.id)
                          return (
                            <div
                              key={row.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, row.id)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                'cursor-grab active:cursor-grabbing transition',
                                (dragDocId === row.id || isCut) && 'opacity-40',
                                isCut && 'ring-2 ring-dashed ring-brand-400 rounded-2xl',
                              )}
                            >
                              <DocumentCard
                                row={row}
                                selected={selectedIds.includes(row.id)}
                                onToggleSelect={toggleSelect}
                                onOpen={setViewDoc}
                                onEdit={openEdit}
                                onDelete={promptDeleteFile}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {!docsLoading && filtered.length > 0 && viewMode === 'list' && (
                <div className="overflow-hidden rounded-2xl border border-surface-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-surface-border bg-surface-subtle/60">
                      <tr>
                        <th className="w-8 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300" /></th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">Name</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">Type</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">Size</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">Added</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-muted">Uploader</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {grouped.map((group) => (
                        <FragmentGroup key={group.key} group={group} showLabel={!!group.label}>
                          {group.items.map((row) => {
                            const isCut = cutIds.includes(row.id)
                            return (
                              <tr
                                key={row.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, row.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  'hover:bg-surface-subtle/40 cursor-grab transition',
                                  (dragDocId === row.id || isCut) && 'opacity-40',
                                  selectedIds.includes(row.id) && 'bg-brand-50',
                                  isCut && 'bg-brand-50/60',
                                )}
                              >
                                <td className="px-3 py-2.5">
                                  <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300" />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <FileTypeIcon name={row.name} />
                                    <div className="min-w-0">
                                      <button type="button" onClick={() => setViewDoc(row)} className="block max-w-[280px] truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                                        {row.name}
                                      </button>
                                      {row.description ? <p className="max-w-[280px] truncate text-xs text-ink-muted">{row.description}</p> : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-ink-muted">{row.fileType}</td>
                                <td className="px-3 py-2.5 text-xs tabular-nums text-ink-muted">{formatBytes(row.fileSize)}</td>
                                <td className="px-3 py-2.5 text-xs tabular-nums text-ink-muted">{formatShortDate(row.createdAt)}</td>
                                <td className="px-3 py-2.5 text-xs text-ink-muted">{row.uploader?.name || '—'}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <button type="button" title="Edit" onClick={() => openEdit(row)} className="rounded p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink"><Pencil size={13} /></button>
                                    <button type="button" title="Delete" onClick={() => promptDeleteFile(row)} className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </FragmentGroup>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Move to folder modal ──────────────────────────────────────────── */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMoveModal(false)} />
          <div className="relative z-[101] w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Move {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} to…</p>
              <button type="button" onClick={() => setShowMoveModal(false)} className="rounded p-1 text-ink-muted hover:bg-surface-subtle"><X size={15} /></button>
            </div>
            {flatFolders.length === 0 ? (
              <p className="text-sm text-ink-muted">No custom folders yet. Create one first.</p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {flatFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleBulkMoveToFolder(f.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-sm hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Folder size={14} className="text-amber-500" />
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload drawer ─────────────────────────────────────────────────── */}
      <RightDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        description={`Will be added to "${context.name}".`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" form="doc-upload-form" disabled={uploading}>{uploading ? 'Uploading…' : 'Save'}</Button>
          </div>
        }
      >
        <form id="doc-upload-form" onSubmit={onUploadSubmit} className="space-y-3">
          <Input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null
              if (!f) { setUploadForm((p) => ({ ...p, file: null })); return }
              const { base, ext } = splitFileStemAndExt(f.name)
              setUploadForm((p) => ({ ...p, file: f, nameBase: base, nameExt: ext }))
            }}
          />
          <label className="block text-sm font-medium text-ink">
            Document name
            <div className="mt-1 flex overflow-hidden rounded-xl border border-surface-border bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <input
                type="text"
                placeholder="Name without extension"
                value={uploadForm.nameBase}
                onChange={(e) => setUploadForm((p) => ({ ...p, nameBase: e.target.value }))}
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm outline-none"
              />
              {uploadForm.nameExt && (
                <span className="flex shrink-0 items-center border-l border-surface-border bg-surface-muted px-3 py-2.5 text-sm font-medium text-ink-muted">{uploadForm.nameExt}</span>
              )}
            </div>
          </label>
          <label className="block text-sm font-medium text-ink">
            Description (optional)
            <textarea rows={3} className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm" value={uploadForm.description} onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))} />
          </label>
        </form>
      </RightDrawer>

      {/* ── Edit drawer ───────────────────────────────────────────────────── */}
      <RightDrawer
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditRow(null) }}
        title="Edit document"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="button" onClick={onEditSave} disabled={patching}>{patching ? 'Saving…' : 'Save changes'}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink">
            Name
            <div className="mt-1 flex overflow-hidden rounded-xl border border-surface-border bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <input type="text" placeholder="Name" value={editForm.nameBase} onChange={(e) => setEditForm((p) => ({ ...p, nameBase: e.target.value }))} className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm outline-none" />
              {editForm.nameExt && <span className="flex shrink-0 items-center border-l border-surface-border bg-surface-muted px-3 py-2.5 text-sm font-medium text-ink-muted">{editForm.nameExt}</span>}
            </div>
          </label>
          <label className="block text-sm font-medium text-ink">
            Description
            <textarea rows={4} className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
          </label>
          {editRow && (
            <button type="button" onClick={() => { promptDeleteFile(editRow); setEditOpen(false) }} className="flex w-full items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 size={14} />
              Delete document
            </button>
          )}
        </div>
      </RightDrawer>

      <DocumentPreviewDialog document={viewDoc} onClose={() => setViewDoc(null)} />

      {/* ── File delete confirm ───────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteFileConfirm}
        onCancel={() => setDeleteFileConfirm(null)}
        onConfirm={confirmDeleteFile}
        loading={deleteActionLoading}
        title="Delete file?"
        body={deleteFileConfirm ? `"${deleteFileConfirm.name}" will be permanently deleted and cannot be recovered.` : ''}
      />

      {/* ── Folder delete confirm ─────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteFolderConfirm}
        onCancel={() => setDeleteFolderConfirm(null)}
        onConfirm={confirmDeleteFolder}
        loading={deleteActionLoading}
        title={`Delete folder "${deleteFolderConfirm?.folder?.name}"?`}
        body={
          deleteFolderConfirm?.loading
            ? 'Counting files…'
            : deleteFolderConfirm
            ? (() => {
                const fc = deleteFolderConfirm.fileCount ?? 0
                const sc = deleteFolderConfirm.subfolderCount ?? 0
                const parts = []
                if (sc > 0) parts.push(`${sc} subfolder${sc !== 1 ? 's' : ''}`)
                if (fc > 0) parts.push(`${fc} file${fc !== 1 ? 's' : ''}`)
                if (parts.length === 0) return 'This folder is empty. It will be permanently deleted.'
                return `This will permanently delete the folder, ${parts.join(' and ')} inside it. This cannot be undone.`
              })()
            : ''
        }
      />
    </PageShell>
  )
}
