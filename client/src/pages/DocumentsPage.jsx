import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Folder, Search, SlidersHorizontal, Upload, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Select } from '@/components/ui/Select'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import {
  useCreateDocumentFolderMutation,
  useGetDocumentFolderTreeQuery,
  useGetDocumentsQuery,
  useUploadDocumentMutation,
} from '@/features/documents/documentsApi'

const DOCUMENT_TYPES = ['Contract', 'NDA', 'Proposal', 'Invoice', 'Presentation', 'Image', 'Other']
const TOP_TABS = ['All files', 'By client']

const DOC_CARD_GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

function fileExtLower(name) {
  const n = String(name || '').toLowerCase()
  return n.includes('.') ? n.split('.').pop() : ''
}

function groupDocumentsByEntity(rows) {
  const groups = new Map()
  for (const row of rows) {
    const links = row.links?.length ? row.links : [{ entityType: 'unlinked', entityId: row.id, entityName: 'Unlinked' }]
    for (const link of links) {
      const key = `${link.entityType}:${link.entityId}`
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          entityType: link.entityType,
          entityId: link.entityId,
          title: link.entityName || `${link.entityType} ${link.entityId}`,
          documents: [],
        })
      }
      groups.get(key).documents.push(row)
    }
  }
  return [...groups.values()].map((group) => ({
    ...group,
    documents: [...group.documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  }))
}

function formatSize(size) {
  const kb = (Number(size) || 0) / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(kb))} KB`
}

function entityChipClass(entityType) {
  if (entityType === 'company') return 'bg-emerald-50 text-emerald-800'
  if (entityType === 'lead') return 'bg-violet-50 text-violet-800'
  if (entityType === 'contact') return 'bg-cyan-50 text-cyan-800'
  return 'bg-zinc-100 text-zinc-700'
}

function getDocumentKind(row) {
  const name = String(row?.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() : ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'document'
}

/** Square tile preview: image thumb or color block by type (used everywhere) */
function getDocCardPreviewMeta(row) {
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

function getFileUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  if (filePath.startsWith('/')) return encodeURI(filePath)
  return encodeURI(`/${filePath}`)
}

function DocumentCard({ row, selected, onToggleSelect, onOpen, showLinkChips = true }) {
  const meta = getDocCardPreviewMeta(row)
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white/95 shadow-sm transition hover:shadow-md ${selected ? 'border-sky-200 ring-2 ring-sky-50' : 'border-zinc-100'}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(row.id)}
        className="absolute right-2 top-2 z-10 h-4 w-4 rounded border-zinc-200 bg-white/90 shadow-sm"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${row.name}`}
      />
      <button type="button" onClick={() => onOpen(row)} className="block w-full text-left">
        <div className="aspect-square w-full overflow-hidden bg-zinc-50">
          {meta.mode === 'image' ? (
            <img src={getFileUrl(row.filePath)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center gap-1 px-2 ${meta.blockClass}`}>
              <FileText className="h-9 w-9 shrink-0 opacity-70" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">{meta.label}</span>
            </div>
          )}
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <p className="line-clamp-2 text-sm font-semibold text-zinc-800">{row.name}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatSize(row.fileSize)}
            {row.uploader?.name || row.uploader?.email ? ` · ${row.uploader?.name || row.uploader?.email}` : ''}
          </p>
          {showLinkChips ? (
            <div className="mt-1.5 flex max-h-14 flex-wrap gap-1 overflow-hidden">
              {(row.folderLinks || []).map((fl) => (
                <span
                  key={fl.id || `${row.id}-dc-${fl.folderId}`}
                  className="max-w-full truncate rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 sm:text-xs"
                  title={fl.folder?.name}
                >
                  {fl.folder?.name || 'Folder'}
                </span>
              ))}
              {(row.links || []).map((link) => (
                <span
                  key={link.id}
                  className={`max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${entityChipClass(link.entityType)}`}
                >
                  {link.entityName || link.entityId}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
    </div>
  )
}

function docHasLeadLink(doc, leadId) {
  return (doc.links || []).some((l) => l.entityType === 'lead' && String(l.entityId) === String(leadId))
}

function docHasCompanyLink(doc, companyId) {
  return (doc.links || []).some((l) => l.entityType === 'company' && String(l.entityId) === String(companyId))
}

function docInFolder(doc, folderId) {
  const fid = String(folderId)
  return (doc.folderLinks || []).some((fl) => String(fl.folderId) === fid || String(fl.folder?.id) === fid)
}

function docHasAnyFolder(doc) {
  return (doc.folderLinks || []).length > 0
}

/** Folders tied to this CRM entity plus any folder that already holds this entity's documents */
function foldersForCrmHub({ entity, entityId, manualFolders, entityDocs }) {
  const byId = new Map((manualFolders || []).map((f) => [f.id, f]))
  const out = []
  const seen = new Set()
  for (const f of manualFolders || []) {
    if (f.entityType === entity && String(f.entityId) === String(entityId) && !seen.has(f.id)) {
      seen.add(f.id)
      out.push(f)
    }
  }
  for (const doc of entityDocs) {
    for (const fl of doc.folderLinks || []) {
      const id = fl.folderId || fl.folder?.id
      if (!id || seen.has(id)) continue
      const row = byId.get(id)
      if (row) {
        seen.add(id)
        out.push(row)
      }
    }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function DocumentsPage() {
  const authUser = useSelector((state) => state.auth.user)
  const [view, setView] = useState('global')
  const [activeTab, setActiveTab] = useState('All files')
  /** Lead/company drill-down: pick → hub (folders + uncategorized) → folder (docs in one folder) */
  const [crmBrowse, setCrmBrowse] = useState(null)
  /** Collapsible Folders / Files sections in CRM hub (reference layout) */
  const [crmHubSectionsOpen, setCrmHubSectionsOpen] = useState({ folders: true, files: true })
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([])
  const [focusDocumentId, setFocusDocumentId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [uploadFolderIds, setUploadFolderIds] = useState([])
  const [viewerDocument, setViewerDocument] = useState(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [filters, setFilters] = useState({ fileType: '', fromDate: '', toDate: '', leadId: '', folderId: '' })
  const [uploadForm, setUploadForm] = useState({
    file: null,
    name: '',
    fileType: 'Other',
    leadId: '',
    companyId: '',
  })
  const [newFolder, setNewFolder] = useState({ name: '', parentFolderId: '', entityType: '', entityId: '' })

  const documentQuery = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
      ),
    [filters],
  )
  const { data: docsData, isLoading, refetch } = useGetDocumentsQuery(documentQuery)
  const { data: folderTreeData, refetch: refetchFolderTree } = useGetDocumentFolderTreeQuery()
  const { data: leadsMeta } = useGetLeadsQuery({ page: 1, limit: 200 })
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation()
  const [createFolder, { isLoading: isCreatingFolder }] = useCreateDocumentFolderMutation()

  const rows = docsData?.data || []
  const leads = leadsMeta?.data || []
  const folderTree = folderTreeData?.data
  const groupedRows = useMemo(() => groupDocumentsByEntity(rows), [rows])

  const leadSummaries = useMemo(() => {
    const m = new Map()
    for (const doc of rows) {
      for (const link of doc.links || []) {
        if (link.entityType !== 'lead') continue
        const id = link.entityId
        if (!m.has(id)) {
          m.set(id, { id, name: link.entityName || id, documents: [] })
        }
        m.get(id).documents.push(doc)
      }
    }
    return [...m.values()]
      .map((g) => ({ ...g, documents: [...new Map(g.documents.map((d) => [d.id, d])).values()] }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }, [rows])

  const companySummaries = useMemo(() => {
    const m = new Map()
    for (const doc of rows) {
      for (const link of doc.links || []) {
        if (link.entityType !== 'company') continue
        const id = link.entityId
        if (!m.has(id)) {
          m.set(id, { id, name: link.entityName || id, documents: [] })
        }
        m.get(id).documents.push(doc)
      }
    }
    return [...m.values()]
      .map((g) => ({ ...g, documents: [...new Map(g.documents.map((d) => [d.id, d])).values()] }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }, [rows])

  const crmHubContext = useMemo(() => {
    if (!crmBrowse || crmBrowse.step !== 'hub') return null
    const manual = folderTree?.manualFolders || []
    if (crmBrowse.entity === 'lead') {
      const entityDocs = rows.filter((d) => docHasLeadLink(d, crmBrowse.id))
      const folders = foldersForCrmHub({ entity: 'lead', entityId: crmBrowse.id, manualFolders: manual, entityDocs })
      const uncategorized = entityDocs.filter((d) => !docHasAnyFolder(d))
      return { entityLabel: 'Lead', folders, uncategorized, entityDocs }
    }
    const entityDocs = rows.filter((d) => docHasCompanyLink(d, crmBrowse.id))
    const folders = foldersForCrmHub({ entity: 'company', entityId: crmBrowse.id, manualFolders: manual, entityDocs })
    const uncategorized = entityDocs.filter((d) => !docHasAnyFolder(d))
    return { entityLabel: 'Company', folders, uncategorized, entityDocs }
  }, [crmBrowse, rows, folderTree])

  const crmHubTitle = useMemo(() => {
    if (!crmBrowse || (crmBrowse.step !== 'hub' && crmBrowse.step !== 'folder')) return ''
    if (crmBrowse.entity === 'lead') {
      const g = leadSummaries.find((x) => String(x.id) === String(crmBrowse.id))
      return g?.name || 'Lead'
    }
    const g = companySummaries.find((x) => String(x.id) === String(crmBrowse.id))
    return g?.name || 'Company'
  }, [crmBrowse, leadSummaries, companySummaries])

  const crmFolderTitle = useMemo(() => {
    if (!crmBrowse || crmBrowse.step !== 'folder' || !crmBrowse.folderId) return ''
    const f = (folderTree?.manualFolders || []).find((x) => String(x.id) === String(crmBrowse.folderId))
    return f?.name || 'Folder'
  }, [crmBrowse, folderTree])
  const activeFilterCount = [filters.fileType, filters.leadId, filters.fromDate, filters.toDate, filters.folderId].filter(Boolean).length

  const visibleRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const bySearch = (list) => (q ? list.filter((row) => String(row.name || '').toLowerCase().includes(q)) : list)
    if (crmBrowse?.entity === 'lead' && crmBrowse.step === 'folder' && crmBrowse.folderId) {
      return bySearch(rows.filter((d) => docHasLeadLink(d, crmBrowse.id) && docInFolder(d, crmBrowse.folderId)))
    }
    if (crmBrowse?.entity === 'company' && crmBrowse.step === 'folder' && crmBrowse.folderId) {
      return bySearch(rows.filter((d) => docHasCompanyLink(d, crmBrowse.id) && docInFolder(d, crmBrowse.folderId)))
    }
    if (filters.folderId) return bySearch(rows)
    if (crmBrowse) return []
    return bySearch(rows)
  }, [rows, searchTerm, filters.folderId, crmBrowse])

  const uncategorizedHubRows = useMemo(() => {
    if (!crmHubContext) return []
    const q = searchTerm.trim().toLowerCase()
    const list = crmHubContext.uncategorized
    return q ? list.filter((row) => String(row.name || '').toLowerCase().includes(q)) : list
  }, [crmHubContext, searchTerm])

  const hubFoldersFiltered = useMemo(() => {
    if (!crmHubContext) return []
    const q = searchTerm.trim().toLowerCase()
    if (!q) return crmHubContext.folders
    return crmHubContext.folders.filter((f) => String(f.name || '').toLowerCase().includes(q))
  }, [crmHubContext, searchTerm])

  const hubFolderStatsMap = useMemo(() => {
    const map = new Map()
    if (!crmHubContext) return map
    const manual = folderTree?.manualFolders || []
    const { entityDocs } = crmHubContext
    for (const folder of hubFoldersFiltered) {
      const subCount = manual.filter((f) => f.parentFolderId && String(f.parentFolderId) === String(folder.id)).length
      const fileCount = entityDocs.filter((d) => docInFolder(d, folder.id)).length
      map.set(folder.id, { subCount, fileCount })
    }
    return map
  }, [crmHubContext, folderTree, hubFoldersFiltered])

  useEffect(() => {
    if (crmBrowse?.step === 'hub') {
      setCrmHubSectionsOpen({ folders: true, files: true })
    }
  }, [crmBrowse?.step, crmBrowse?.entity, crmBrowse?.id])

  const pickLeadRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return leadSummaries
    return leadSummaries.filter((g) => String(g.name || '').toLowerCase().includes(q))
  }, [leadSummaries, searchTerm])

  const pickCompanyRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return companySummaries
    return companySummaries.filter((g) => String(g.name || '').toLowerCase().includes(q))
  }, [companySummaries, searchTerm])

  function toggleRowSelection(id) {
    setFocusDocumentId(id)
    setSelectedDocumentIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  function toggleSelectAllVisible(checked) {
    if (!checked) {
      setSelectedDocumentIds((prev) => prev.filter((id) => !visibleRows.some((row) => row.id === id)))
      return
    }
    const ids = visibleRows.map((row) => row.id)
    setSelectedDocumentIds((prev) => [...new Set([...prev, ...ids])])
    if (ids[0]) setFocusDocumentId(ids[0])
  }

  async function handleUploadSubmit(e) {
    e.preventDefault()
    if (!uploadForm.file) return toast.error('Select a file')
    if (!uploadForm.name.trim()) return toast.error('Document name is required')
    const links = [
      uploadForm.leadId ? { entityType: 'lead', entityId: uploadForm.leadId } : null,
      uploadForm.companyId ? { entityType: 'company', entityId: uploadForm.companyId } : null,
    ].filter(Boolean)
    const primaryFolder = uploadFolderIds[0]
    const extraFolders = uploadFolderIds.slice(1)
    try {
      await uploadDocument({
        file: uploadForm.file,
        name: uploadForm.name.trim(),
        fileType: uploadForm.fileType,
        folderId: primaryFolder || undefined,
        folderIds: extraFolders,
        links,
      }).unwrap()
      toast.success('Document uploaded')
      refetch()
      setUploadOpen(false)
      setUploadForm({ file: null, name: '', fileType: 'Other', leadId: '', companyId: '' })
      setUploadFolderIds([])
    } catch (error) {
      toast.error(error?.data?.error?.message || 'Upload failed')
    }
  }

  async function handleCreateFolder(e) {
    if (e?.preventDefault) e.preventDefault()
    if (!newFolder.name.trim()) return
    try {
      await createFolder({
        name: newFolder.name.trim(),
        parentFolderId: newFolder.parentFolderId || null,
        entityType: newFolder.entityType || null,
        entityId: newFolder.entityType === 'company' ? authUser?.companyId || null : newFolder.entityId || null,
      }).unwrap()
      await Promise.all([refetch(), refetchFolderTree()])
      setNewFolder({ name: '', parentFolderId: '', entityType: '', entityId: '' })
      setNewFolderOpen(false)
      toast.success('Folder created')
    } catch (error) {
      toast.error(error?.data?.error?.message || 'Folder creation failed')
    }
  }

  function openViewer(row) {
    setFocusDocumentId(row.id)
    setViewerDocument(row)
    setImageZoom(1)
  }

  function closeViewer() {
    setViewerDocument(null)
    setImageZoom(1)
  }

  return (
    <PageShell fullWidth>
      <div className="-mt-3 pt-[5px] sm:-mt-5">
        <div className="flex h-[calc(100dvh-84px)] min-h-[620px] flex-col overflow-hidden border-y border-surface-border bg-white text-ink shadow-sm sm:rounded-2xl sm:border">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border px-4 pt-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-4">
            {TOP_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab)
                  if (tab === 'All files') setView('global')
                  if (tab === 'By client') {
                    setView('grouped')
                    setCrmBrowse(null)
                  }
                }}
                className={`border-b-2 pb-3 text-sm transition ${
                  activeTab === tab ? 'border-brand-300 text-brand-700' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab}
                {tab === 'All files' ? (
                  <span className="ml-2 rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted">
                    {rows.length}
                  </span>
                ) : null}
              </button>
            ))}
            </div>
            <div className="flex items-center gap-2 pb-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-sm font-semibold text-ink transition hover:bg-surface-muted"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">{activeFilterCount}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500"
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="scrollbar-subtle overflow-y-auto border-r border-surface-border bg-surface-muted/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Browse by CRM</p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, folderId: '' }))
                    setCrmBrowse(null)
                  }}
                  className={`flex w-full items-center rounded-lg px-2 py-2 text-left text-sm ${
                    !crmBrowse && !filters.folderId ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-subtle'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Everything
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, folderId: '' }))
                    setCrmBrowse({ entity: 'lead', step: 'pick' })
                  }}
                  className={`flex w-full items-center rounded-lg px-2 py-2 text-left text-sm ${
                    crmBrowse?.entity === 'lead' ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-subtle'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    By lead
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, folderId: '' }))
                    setCrmBrowse({ entity: 'company', step: 'pick' })
                  }}
                  className={`flex w-full items-center rounded-lg px-2 py-2 text-left text-sm ${
                    crmBrowse?.entity === 'company' ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-subtle'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    By company
                  </span>
                </button>
              </div>
              <div className="mt-5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Your folders</p>
                <button
                  type="button"
                  onClick={() => setNewFolderOpen(true)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  + New
                </button>
              </div>
              <div className="mt-1 space-y-1">
                {(folderTree?.manualFolders || []).map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setCrmBrowse(null)
                      setFilters((f) => ({ ...f, folderId: folder.id }))
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                      filters.folderId === folder.id ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-subtle'
                    }`}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{folder.name}</span>
                  </button>
                ))}
                {!folderTree?.manualFolders?.length ? <p className="px-2 py-2 text-xs text-ink-faint">No folders yet. Use + New.</p> : null}
              </div>
            </aside>

            <section className="scrollbar-subtle min-h-0 overflow-y-auto p-4">
              {crmBrowse ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-surface-border pb-3">
                  {crmBrowse.step !== 'pick' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (crmBrowse.step === 'folder') {
                          setCrmBrowse({ entity: crmBrowse.entity, step: 'hub', id: crmBrowse.id })
                        } else if (crmBrowse.step === 'hub') {
                          setCrmBrowse({ entity: crmBrowse.entity, step: 'pick' })
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-white px-2 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                  ) : null}
                  <div className="min-w-0 text-sm text-ink">
                    <span className="text-ink-muted">{crmBrowse.entity === 'lead' ? 'Leads' : 'Companies'}</span>
                    {crmBrowse.step === 'hub' || crmBrowse.step === 'folder' ? (
                      <>
                        <span className="mx-1.5 text-ink-faint">/</span>
                        <span className="font-semibold text-ink">{crmHubTitle}</span>
                      </>
                    ) : null}
                    {crmBrowse.step === 'folder' ? (
                      <>
                        <span className="mx-1.5 text-ink-faint">/</span>
                        <span className="font-semibold text-ink">{crmFolderTitle}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[280px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={
                      crmBrowse?.step === 'pick'
                        ? 'Search names…'
                        : crmBrowse?.step === 'hub'
                          ? 'Search folders or file names…'
                          : 'Search documents...'
                    }
                    className="h-11 w-full rounded-xl border border-surface-border bg-white pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {isLoading ? <p className="text-sm text-ink-muted">Loading documents...</p> : null}

              {!isLoading && view === 'global' && crmBrowse?.entity === 'lead' && crmBrowse.step === 'pick' ? (
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:p-6">
                  <div className={DOC_CARD_GRID}>
                    {pickLeadRows.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setCrmBrowse({ entity: 'lead', step: 'hub', id: g.id })}
                        className="flex flex-col rounded-2xl border border-zinc-100 bg-white/90 p-4 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/30 hover:shadow"
                      >
                        <div className="mx-auto flex aspect-square w-full max-w-[100px] items-center justify-center rounded-2xl bg-amber-100 text-xl font-bold text-amber-800 sm:max-w-[120px] sm:text-2xl">
                          {(g.name || '?').trim().slice(0, 1).toUpperCase()}
                        </div>
                        <p className="mt-3 line-clamp-2 text-center text-sm font-semibold text-zinc-800">{g.name}</p>
                        <p className="mt-1 text-center text-xs text-zinc-400">{g.documents.length} file{g.documents.length === 1 ? '' : 's'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isLoading && view === 'global' && crmBrowse?.entity === 'company' && crmBrowse.step === 'pick' ? (
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:p-6">
                  <div className={DOC_CARD_GRID}>
                    {pickCompanyRows.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setCrmBrowse({ entity: 'company', step: 'hub', id: g.id })}
                        className="flex flex-col rounded-2xl border border-zinc-100 bg-white/90 p-4 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow"
                      >
                        <div className="mx-auto flex aspect-square w-full max-w-[100px] items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-800 sm:max-w-[120px] sm:text-2xl">
                          {(g.name || '?').trim().slice(0, 1).toUpperCase()}
                        </div>
                        <p className="mt-3 line-clamp-2 text-center text-sm font-semibold text-zinc-800">{g.name}</p>
                        <p className="mt-1 text-center text-xs text-zinc-400">{g.documents.length} file{g.documents.length === 1 ? '' : 's'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isLoading && view === 'global' && crmBrowse?.step === 'hub' && crmHubContext ? (
                (hubFoldersFiltered.length > 0 || uncategorizedHubRows.length > 0) ? (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 shadow-inner sm:p-6">
                    {hubFoldersFiltered.length > 0 ? (
                      <div className="mb-6">
                        <button
                          type="button"
                          onClick={() => setCrmHubSectionsOpen((s) => ({ ...s, folders: !s.folders }))}
                          className="mb-4 flex w-full items-center gap-2 text-left text-sm font-semibold tracking-wide text-zinc-500"
                        >
                          {crmHubSectionsOpen.folders ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />}
                          Folders
                        </button>
                        {crmHubSectionsOpen.folders ? (
                          <div className={DOC_CARD_GRID}>
                            {hubFoldersFiltered.map((folder) => {
                              const stats = hubFolderStatsMap.get(folder.id) || { subCount: 0, fileCount: 0 }
                              return (
                                <button
                                  key={folder.id}
                                  type="button"
                                  onClick={() => setCrmBrowse({ entity: crmBrowse.entity, step: 'folder', id: crmBrowse.id, folderId: folder.id })}
                                  className="group flex flex-col rounded-2xl border border-zinc-100 bg-white/90 p-4 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/20 hover:shadow"
                                >
                                  <div className="mx-auto flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-2xl bg-amber-100">
                                    <Folder className="h-12 w-12 text-amber-700/90" strokeWidth={1.75} />
                                  </div>
                                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-center text-sm font-medium leading-snug text-zinc-800">{folder.name}</p>
                                  <div className="mt-auto flex items-center justify-center gap-4 pt-3 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1 tabular-nums">
                                      {stats.subCount}
                                      <Folder className="h-3.5 w-3.5 text-zinc-300" aria-hidden />
                                    </span>
                                    <span className="flex items-center gap-1 tabular-nums">
                                      {stats.fileCount}
                                      <FileText className="h-3.5 w-3.5 text-zinc-300" aria-hidden />
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {uncategorizedHubRows.length > 0 ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setCrmHubSectionsOpen((s) => ({ ...s, files: !s.files }))}
                          className="mb-4 flex w-full items-center gap-2 text-left text-sm font-semibold tracking-wide text-zinc-500"
                        >
                          {crmHubSectionsOpen.files ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />}
                          Files
                        </button>
                        {crmHubSectionsOpen.files ? (
                          <div className={DOC_CARD_GRID}>
                            {uncategorizedHubRows.map((row) => (
                              <DocumentCard
                                key={row.id}
                                row={row}
                                selected={selectedDocumentIds.includes(row.id)}
                                onToggleSelect={toggleRowSelection}
                                onOpen={openViewer}
                                showLinkChips
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null
              ) : null}

              {!isLoading && view === 'global' && (!crmBrowse || crmBrowse.step === 'folder') ? (
                visibleRows.length > 0 ? (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 shadow-inner sm:p-6">
                    <label className="mb-4 flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-zinc-500">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-200"
                        checked={visibleRows.length > 0 && visibleRows.every((row) => selectedDocumentIds.includes(row.id))}
                        onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      />
                      Select all
                    </label>
                    <div className={DOC_CARD_GRID}>
                      {visibleRows.map((row) => (
                        <DocumentCard
                          key={row.id}
                          row={row}
                          selected={selectedDocumentIds.includes(row.id)}
                          onToggleSelect={toggleRowSelection}
                          onOpen={openViewer}
                          showLinkChips
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              ) : null}

              {!isLoading && view === 'grouped' ? (
                <div className="space-y-4">
                  {groupedRows.map((group) => {
                    const open = expandedGroups[group.id] ?? true
                    return (
                      <div key={group.id} className="overflow-hidden rounded-2xl border border-zinc-100 bg-white/90 shadow-sm">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between border-b border-zinc-50 bg-zinc-50/60 px-4 py-3 text-left"
                          onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.id]: !open }))}
                        >
                          <span className="text-sm font-semibold text-zinc-700">{group.title}</span>
                          {open ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                        </button>
                        {open ? (
                          <div className="bg-zinc-50/70 p-3 sm:p-4">
                            <div className={DOC_CARD_GRID}>
                              {group.documents.map((row) => (
                                <DocumentCard
                                  key={`${group.id}:${row.id}`}
                                  row={row}
                                  selected={selectedDocumentIds.includes(row.id)}
                                  onToggleSelect={toggleRowSelection}
                                  onOpen={openViewer}
                                  showLinkChips
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}

            </section>
          </div>
        </div>
      </div>

      <RightDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        description="Pick a file, name it, optionally link to a lead or company. Use the checkboxes if you want the file placed into workspace folders on upload."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" form="upload-document-form" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Save document'}</Button>
          </div>
        }
      >
        <form id="upload-document-form" onSubmit={handleUploadSubmit} className="space-y-3">
          <Input type="file" onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null, name: prev.name || e.target.files?.[0]?.name || '' }))} />
          <Input placeholder="Document name" value={uploadForm.name} onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Select value={uploadForm.fileType} onChange={(e) => setUploadForm((prev) => ({ ...prev, fileType: e.target.value }))}>
            {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select value={uploadForm.leadId} onChange={(e) => setUploadForm((prev) => ({ ...prev, leadId: e.target.value }))}>
            <option value="">Link lead (optional)</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.contactName || 'Untitled lead'}</option>)}
          </Select>
          <Select value={uploadForm.companyId} onChange={(e) => setUploadForm((prev) => ({ ...prev, companyId: e.target.value }))}>
            <option value="">Link company (optional)</option>
            {authUser?.companyId ? <option value={authUser.companyId}>{authUser.company?.name || 'Current company'}</option> : null}
          </Select>
          <div className="rounded-xl border border-surface-border p-3">
            <p className="mb-1 text-sm font-medium text-ink">Workspace folders (optional)</p>
            <p className="mb-2 text-xs text-ink-muted">Leave empty if you will assign folders later.</p>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {(folderTree?.manualFolders || []).map((folder) => (
                <label key={folder.id} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={uploadFolderIds.includes(folder.id)}
                    onChange={(e) =>
                      setUploadFolderIds((prev) =>
                        e.target.checked ? [...new Set([...prev, folder.id])] : prev.filter((id) => id !== folder.id),
                      )
                    }
                  />
                  {folder.name}
                </label>
              ))}
              {!folderTree?.manualFolders?.length ? <p className="text-xs text-ink-faint">No folders yet — create one from the sidebar (+ New).</p> : null}
            </div>
          </div>
        </form>
      </RightDrawer>

      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced filters"
        description="Keep defaults simple and use these only when needed."
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setFilters({ fileType: '', fromDate: '', toDate: '', leadId: '', folderId: '' })}
            >
              Clear filters
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select value={filters.fileType} onChange={(e) => setFilters((prev) => ({ ...prev, fileType: e.target.value }))}>
            <option value="">All types</option>
            {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select value={filters.leadId} onChange={(e) => setFilters((prev) => ({ ...prev, leadId: e.target.value }))}>
            <option value="">All leads</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.contactName || lead.company || 'Untitled lead'}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
            <Input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
          </div>
        </div>
      </RightDrawer>

      <RightDrawer
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        description="Folders are for your own grouping. You can optionally tie a folder to a lead or company for context."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreateFolder} disabled={isCreatingFolder}>{isCreatingFolder ? 'Creating…' : 'Create folder'}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input placeholder="Folder name" value={newFolder.name} onChange={(e) => setNewFolder((prev) => ({ ...prev, name: e.target.value }))} />
          <Select value={newFolder.entityType} onChange={(e) => setNewFolder((prev) => ({ ...prev, entityType: e.target.value, entityId: '' }))}>
            <option value="">Optional: link folder to CRM</option>
            <option value="lead">Lead</option>
            <option value="company">Company</option>
          </Select>
          {newFolder.entityType === 'lead' ? (
            <Select value={newFolder.entityId} onChange={(e) => setNewFolder((prev) => ({ ...prev, entityId: e.target.value }))}>
              <option value="">Choose lead</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.contactName || lead.company || 'Untitled lead'}</option>)}
            </Select>
          ) : null}
          {newFolder.entityType === 'company' ? (
            <p className="text-xs text-ink-muted">
              {authUser?.companyId
                ? `Folder will be tied to ${authUser.company?.name || 'your workspace company'}.`
                : 'No workspace company on your profile — pick Lead or leave CRM blank.'}
            </p>
          ) : null}
          <Select value={newFolder.parentFolderId} onChange={(e) => setNewFolder((prev) => ({ ...prev, parentFolderId: e.target.value }))}>
            <option value="">Root level (no parent)</option>
            {(folderTree?.manualFolders || []).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </Select>
        </div>
      </RightDrawer>

      {viewerDocument ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button type="button" onClick={closeViewer} className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" aria-label="Close preview" />
          <div className="relative z-[121] flex h-[90dvh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{viewerDocument.name}</p>
                <p className="text-xs text-ink-muted">{formatSize(viewerDocument.fileSize)} • {viewerDocument.uploader?.name || viewerDocument.uploader?.email || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                {getDocumentKind(viewerDocument) === 'image' ? (
                  <>
                    <button type="button" onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))} className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted" aria-label="Zoom out">
                      <ZoomOut className="h-4 w-4 text-ink-muted" />
                    </button>
                    <button type="button" onClick={() => setImageZoom(1)} className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted" aria-label="Reset zoom">
                      <RotateCcw className="h-4 w-4 text-ink-muted" />
                    </button>
                    <button type="button" onClick={() => setImageZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))} className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted" aria-label="Zoom in">
                      <ZoomIn className="h-4 w-4 text-ink-muted" />
                    </button>
                  </>
                ) : null}
                <a
                  href={getFileUrl(viewerDocument.filePath)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted"
                >
                  Open original
                </a>
                <button type="button" onClick={closeViewer} className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted" aria-label="Close">
                  <X className="h-4 w-4 text-ink-muted" />
                </button>
              </div>
            </div>
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-auto bg-surface-muted p-4">
              {getDocumentKind(viewerDocument) === 'image' ? (
                <div className="flex min-h-full items-center justify-center">
                  <img
                    src={getFileUrl(viewerDocument.filePath)}
                    alt={viewerDocument.name}
                    className="max-h-none max-w-none rounded-lg border border-surface-border bg-white shadow-sm"
                    style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                  />
                </div>
              ) : (
                <div className="h-full min-h-[70vh] overflow-auto rounded-lg border border-surface-border bg-white">
                  <iframe
                    src={getFileUrl(viewerDocument.filePath)}
                    title={viewerDocument.name}
                    className="h-full min-h-[70vh] w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
