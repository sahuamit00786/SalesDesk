import { useCallback, useMemo, useState } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { normalizeTemplateId } from '@/utils/docTemplateQuery'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { PageTabButton } from '@/components/layout/PageTabButton'
import { TemplateMiniPreview } from '@/features/sales-docs/components/TemplateMiniPreview'
import { resolveGalleryPreviewTheme } from '@/features/sales-docs/templateGalleryPreviewTheme'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'draft', label: 'Drafts' },
]

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
  if (s === 'inactive') return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
  if (s === 'draft') return 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
  return 'bg-surface-subtle text-ink-muted ring-1 ring-surface-border'
}

function docTypeBadgeClass(docType) {
  return docType === 'invoice'
    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
    : 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200'
}

function rowDocType(row) {
  return row?.docType === 'invoice' ? 'invoice' : 'quotation'
}

function formatCreatedAt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

/** Primary key from list row (API is camelCase; tolerate odd shapes). */
function resolveTemplateRowId(row) {
  if (!row || typeof row !== 'object') return ''
  const v = row.id ?? row.templateId
  if (v == null) return ''
  const raw = typeof v === 'string' ? v.trim() : String(v).trim()
  return normalizeTemplateId(raw)
}

export function SalesDocTemplateGallery({
  items = [],
  docTypeConfig,
  onEdit,
  onDelete,
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')

  const pathnameFor = useCallback(
    (docType) => {
      const href = docTypeConfig[docType]?.createHref || '/'
      return href.startsWith('/') ? href : `/${href}`
    },
    [docTypeConfig],
  )

  const goToNewWithTemplate = useCallback(
    (pathname, templateQsKey, rawId) => {
      const id = normalizeTemplateId(rawId)
      if (!id) return
      const search = createSearchParams({ [templateQsKey]: id }).toString()
      navigate({ pathname, search })
    },
    [navigate],
  )

  const buildTemplateHref = useCallback((pathname, templateQsKey, rawId) => {
    const id = normalizeTemplateId(rawId)
    if (!id) return pathname
    const search = createSearchParams({ [templateQsKey]: id }).toString()
    return `${pathname}?${search}`
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    return items.filter((row) => String(row.status || '').toLowerCase() === tab)
  }, [items, tab])

  const counts = useMemo(() => {
    const c = { all: items.length, active: 0, inactive: 0, draft: 0 }
    for (const row of items) {
      const s = String(row.status || '').toLowerCase()
      if (s === 'active') c.active += 1
      else if (s === 'inactive') c.inactive += 1
      else if (s === 'draft') c.draft += 1
    }
    return c
  }, [items])

  return (
    <>
      <PageFilterBar>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const active = tab === t.id
            const n = counts[t.id] ?? 0
            return (
              <PageTabButton key={t.id} active={active} onClick={() => setTab(t.id)}>
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-surface-subtle text-ink-muted',
                  )}
                >
                  {n}
                </span>
              </PageTabButton>
            )
          })}
        </div>
      </PageFilterBar>

      <PageContentPanel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((row) => {
            const docType = rowDocType(row)
            const cfg = docTypeConfig[docType]
            const presetIdx = (Number(row.layoutPreset) || 1) - 1
            const presetName = cfg.presetLabels[presetIdx] || `Preset ${row.layoutPreset}`
            const templateQsKey = docType === 'invoice' ? 'invoiceTemplateId' : 'quotationTemplateId'
            const pathname = pathnameFor(docType)
            const rawId = resolveTemplateRowId(row)

            return (
              <div
                key={rawId || row.code || row.name}
                className={cn(
                  'relative isolate z-0 flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md',
                  rawId && 'cursor-pointer',
                )}
                onClick={(e) => {
                  if (!rawId) return
                  if (e.target.closest('[data-gallery-card-action]')) return
                  const h = buildTemplateHref(pathname, templateQsKey, rawId)
                  if (e.metaKey || e.ctrlKey) {
                    e.preventDefault()
                    window.open(h, '_blank', 'noopener,noreferrer')
                    return
                  }
                  goToNewWithTemplate(pathname, templateQsKey, rawId)
                }}
                onAuxClick={(e) => {
                  if (!rawId) return
                  if (e.button !== 1) return
                  e.preventDefault()
                  window.open(buildTemplateHref(pathname, templateQsKey, rawId), '_blank', 'noopener,noreferrer')
                }}
              >
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-xl">
                  <div className="relative z-0 w-full min-w-0 shrink-0">
                    <TemplateMiniPreview
                      variant={docType}
                      layoutPreset={row.layoutPreset}
                      theme={resolveGalleryPreviewTheme(docType, row)}
                      bodyFont={docType === 'quotation' && row.fontFamily ? String(row.fontFamily) : undefined}
                      {...(docType === 'invoice'
                        ? { showBankDetails: row.sectionSettings?.showBankDetails !== false }
                        : {})}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                        docTypeBadgeClass(docType),
                      )}
                    >
                      {docType}
                    </span>
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{row.name}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">{presetName}</p>
                  <p className="mt-2 text-xs text-ink-faint">Created {formatCreatedAt(row.createdAt)}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3">
                  <div className="flex items-center gap-1">
                    {onEdit ? (
                      <button
                        type="button"
                        data-gallery-card-action
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-brand-50 hover:text-brand-700"
                        title="Edit template"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(row)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        data-gallery-card-action
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(row)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize', statusBadgeClass(row.status))}>
                    {row.status || 'active'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </PageContentPanel>
    </>
  )
}
