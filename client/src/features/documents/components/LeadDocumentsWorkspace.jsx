import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, Upload, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { cn } from '@/utils/cn'
import {
  DOCUMENT_TYPES,
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  usePatchDocumentMutation,
} from '@/features/documents/documentsApi'
import { DocumentCard, DOC_CARD_GRID } from '@/features/documents/components/DocumentCard'
import { formatSize, getDocumentKind, getFileUrl } from '@/features/documents/documentUtils'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
]

/** e.g. "Invoice May.pdf" → { base: "Invoice May", ext: ".pdf" } */
function splitFileStemAndExt(fileName) {
  const n = String(fileName || '').trim()
  if (!n) return { base: '', ext: '' }
  const last = n.lastIndexOf('.')
  if (last <= 0 || last >= n.length - 1) return { base: n, ext: '' }
  const ext = n.slice(last)
  const extBody = ext.slice(1)
  if (!/^[a-z0-9]+$/i.test(extBody) || extBody.length > 12) return { base: n, ext: '' }
  return { base: n.slice(0, last), ext }
}

function joinFileStemAndExt(base, ext) {
  const b = String(base || '').trim()
  const e = String(ext || '').trim()
  if (!e) return b.slice(0, 255)
  const dot = e.startsWith('.') ? e : `.${e}`
  return `${b}${dot}`.slice(0, 255)
}

function stripDuplicateExt(base, ext) {
  let b = String(base || '')
  const e = String(ext || '')
  if (!e || !b) return b
  const lower = e.toLowerCase()
  while (b.toLowerCase().endsWith(lower)) {
    b = b.slice(0, -e.length).trimEnd()
  }
  return b
}

export function LeadDocumentsWorkspace({ leadId, showUpload = true }) {
  const { data: docsData, isLoading, refetch } = useGetDocumentsQuery({ leadId }, { skip: !leadId })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [search, setSearch] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [sort, setSort] = useState('created_desc')
  const [selectedIds, setSelectedIds] = useState([])
  const [viewerDocument, setViewerDocument] = useState(null)
  const [imageZoom, setImageZoom] = useState(1)

  const [uploadForm, setUploadForm] = useState({
    file: null,
    nameBase: '',
    nameExt: '',
    description: '',
  })
  const [editForm, setEditForm] = useState({ nameBase: '', nameExt: '', description: '' })

  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation()
  const [patchDocument, { isLoading: patching }] = usePatchDocumentMutation()

  const rows = docsData?.data || []

  const processed = useMemo(() => {
    let list = [...rows]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const name = String(r.name || '').toLowerCase()
        const desc = String(r.description || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    }
    if (fileTypeFilter) {
      list = list.filter((r) => String(r.fileType || '') === fileTypeFilter)
    }
    list.sort((a, b) => {
      if (sort === 'name_asc') return String(a.name || '').localeCompare(String(b.name || ''))
      if (sort === 'name_desc') return String(b.name || '').localeCompare(String(a.name || ''))
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      if (sort === 'created_asc') return ta - tb
      return tb - ta
    })
    return list
  }, [rows, search, fileTypeFilter, sort])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const openViewer = (row) => {
    setViewerDocument(row)
    setImageZoom(1)
  }

  const closeViewer = () => {
    setViewerDocument(null)
    setImageZoom(1)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    const { base, ext } = splitFileStemAndExt(row.name || '')
    setEditForm({
      nameBase: base,
      nameExt: ext,
      description: row.description || '',
    })
    setEditOpen(true)
  }

  async function onUploadSubmit(e) {
    e.preventDefault()
    if (!uploadForm.file) {
      toast.error('Select a file')
      return
    }
    const fullName = joinFileStemAndExt(uploadForm.nameBase, uploadForm.nameExt).trim()
    if (!fullName) {
      toast.error('Enter a document name')
      return
    }
    try {
      await uploadDocument({
        file: uploadForm.file,
        name: fullName,
        fileType: 'Other',
        description: uploadForm.description.trim() || undefined,
        links: [{ entityType: 'lead', entityId: leadId }],
      }).unwrap()
      toast.success('Document uploaded')
      setUploadOpen(false)
      setUploadForm({ file: null, nameBase: '', nameExt: '', description: '' })
      void refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Upload failed')
    }
  }

  async function onEditSave() {
    if (!editingRow?.id) return
    const fullName = joinFileStemAndExt(editForm.nameBase, editForm.nameExt).trim()
    if (!fullName) {
      toast.error('Name is required')
      return
    }
    try {
      await patchDocument({
        id: editingRow.id,
        name: fullName,
        description: editForm.description.trim() || null,
      }).unwrap()
      toast.success('Document updated')
      setEditOpen(false)
      setEditingRow(null)
      void refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Update failed')
    }
  }

  if (!leadId) {
    return <p className="text-sm text-ink-muted">Missing lead.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description…"
            className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
          />
        </div>
        <label className="text-xs font-medium text-ink-muted">
          Type
          <select
            className="mt-1 block h-10 min-w-[140px] rounded-xl border border-surface-border bg-white px-2 text-sm text-ink"
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">
          Sort
          <select
            className="mt-1 block h-10 min-w-[140px] rounded-xl border border-surface-border bg-white px-2 text-sm text-ink"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {showUpload ? (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        ) : null}
      </div>

      {isLoading ? <p className="text-sm text-ink-muted">Loading files…</p> : null}
      {!isLoading && processed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border bg-surface-muted/30 p-8 text-center text-sm text-ink-muted">
          {rows.length === 0 ? 'No documents linked to this lead yet.' : 'No documents match your filters.'}
        </p>
      ) : null}

      {!isLoading && processed.length > 0 ? (
        <div className={DOC_CARD_GRID}>
          {processed.map((row) => (
            <DocumentCard
              key={row.id}
              row={row}
              selected={selectedIds.includes(row.id)}
              onToggleSelect={toggleSelect}
              onOpen={openViewer}
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : null}

      <RightDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        description="File is stored in your workspace and linked to this lead."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="lead-doc-upload-form" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Save'}
            </Button>
          </div>
        }
      >
        <form id="lead-doc-upload-form" onSubmit={onUploadSubmit} className="space-y-3">
          <Input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null
              if (!f) {
                setUploadForm((prev) => ({ ...prev, file: null }))
                return
              }
              const { base, ext } = splitFileStemAndExt(f.name)
              setUploadForm((prev) => ({
                ...prev,
                file: f,
                nameBase: base,
                nameExt: ext,
              }))
            }}
          />
          <label className="block text-sm font-medium text-ink">
            Document name
            <div className="mt-1 flex w-full min-w-0 overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm ring-brand-500/20 transition-all focus-within:border-brand-500 focus-within:ring-2">
              <input
                type="text"
                placeholder="Name without extension"
                value={uploadForm.nameBase}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    nameBase: stripDuplicateExt(e.target.value, prev.nameExt),
                  }))
                }
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {uploadForm.nameExt ? (
                <span className="flex shrink-0 items-center border-l border-surface-border bg-surface-muted px-3 py-2.5 text-sm font-medium tabular-nums text-ink-muted">
                  {uploadForm.nameExt}
                </span>
              ) : null}
            </div>
          </label>
          <label className="block text-sm font-medium text-ink">
            Description (optional)
            <textarea
              rows={3}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink"
              value={uploadForm.description}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What this file is for…"
            />
          </label>
        </form>
      </RightDrawer>

      <RightDrawer
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditingRow(null)
        }}
        title="Edit document"
        description="Update how this file appears in the library."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onEditSave} disabled={patching}>
              {patching ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink">
            Document name
            <div className="mt-1 flex w-full min-w-0 overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm ring-brand-500/20 transition-all focus-within:border-brand-500 focus-within:ring-2">
              <input
                type="text"
                placeholder="Name without extension"
                value={editForm.nameBase}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    nameBase: stripDuplicateExt(e.target.value, prev.nameExt),
                  }))
                }
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {editForm.nameExt ? (
                <span className="flex shrink-0 items-center border-l border-surface-border bg-surface-muted px-3 py-2.5 text-sm font-medium tabular-nums text-ink-muted">
                  {editForm.nameExt}
                </span>
              ) : null}
            </div>
          </label>
          <label className="block text-sm font-medium text-ink">
            Description
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink"
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
        </div>
      </RightDrawer>

      {viewerDocument ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button type="button" onClick={closeViewer} className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" aria-label="Close preview" />
          <div className="relative z-[121] flex h-[90dvh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{viewerDocument.name}</p>
                <p className="text-xs text-ink-muted">
                  {formatSize(viewerDocument.fileSize)} • {viewerDocument.uploader?.name || viewerDocument.uploader?.email || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getDocumentKind(viewerDocument) === 'image' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
                      className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4 text-ink-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageZoom(1)}
                      className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="h-4 w-4 text-ink-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))}
                      className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                      aria-label="Zoom in"
                    >
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
                  <iframe src={getFileUrl(viewerDocument.filePath)} title={viewerDocument.name} className="h-full min-h-[70vh] w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
