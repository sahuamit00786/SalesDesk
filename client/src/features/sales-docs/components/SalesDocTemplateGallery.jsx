import React, { useCallback, useMemo, useState } from 'react'
import { createSearchParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { normalizeTemplateId } from '@/utils/docTemplateQuery'
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
  if (s === 'draft') return 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200'
  return 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200'
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
  variant,
  items = [],
  presetLabels,
  isLibraryCode,
  createHref,
  listHref,
  listLabel,
  title,
  subtitle,
  onEdit,
  onDelete,
  toolbarExtra = null,
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')

  const pathname = useMemo(
    () => (createHref.startsWith('/') ? createHref : `/${createHref}`),
    [createHref],
  )

  const goToNewWithTemplate = useCallback(
    (templateQsKey, rawId) => {
      const id = normalizeTemplateId(rawId)
      if (!id) return
      const search = createSearchParams({ [templateQsKey]: id }).toString()
      navigate({ pathname, search })
    },
    [navigate, pathname],
  )

  const buildTemplateHref = useCallback(
    (templateQsKey, rawId) => {
      const id = normalizeTemplateId(rawId)
      if (!id) return pathname
      const search = createSearchParams({ [templateQsKey]: id }).toString()
      return `${pathname}?${search}`
    },
    [pathname],
  )

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
    <div className="flex w-full min-w-0 flex-col gap-8 py-2">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-2 text-base font-semibold text-neutral-900">{subtitle.lead}</p>
          <p className="mt-1 text-sm text-neutral-500">{subtitle.hint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <Link
            to={listHref}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            {listLabel}
          </Link>
        </div>
      </header>

      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex flex-wrap gap-6" aria-label="Filter templates">
          {TABS.map((t) => {
            const active = tab === t.id
            const n = counts[t.id] ?? 0
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
                  active ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800',
                )}
              >
                {t.label}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">
                  {n}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Link
          to={pathname}
          className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-6 shadow-sm transition hover:border-[#534AB7]/40 hover:bg-violet-50/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <Plus className="h-7 w-7" strokeWidth={2} />
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-neutral-800">
            {variant === 'invoice' ? 'Send Invoice' : 'New quotation'}
          </p>
          <p className="mt-1 text-center text-xs text-neutral-500">Start from scratch</p>
        </Link>

        {filtered.map((row) => {
          const presetIdx = (Number(row.layoutPreset) || 1) - 1
          const presetName = presetLabels[presetIdx] || `Preset ${row.layoutPreset}`
          /** Separate keys so invoice vs quotation ?templateId= never collide in history or hand-built links. */
          const templateQsKey = variant === 'invoice' ? 'invoiceTemplateId' : 'quotationTemplateId'
          const rawId = resolveTemplateRowId(row)

          return (
            <div
              key={rawId || row.code || row.name}
              className={cn(
                'relative isolate z-0 flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md',
                rawId && 'cursor-pointer',
              )}
              onClick={(e) => {
                if (!rawId) return
                if (e.target.closest('[data-gallery-card-action]')) return
                const h = buildTemplateHref(templateQsKey, rawId)
                if (e.metaKey || e.ctrlKey) {
                  e.preventDefault()
                  window.open(h, '_blank', 'noopener,noreferrer')
                  return
                }
                goToNewWithTemplate(templateQsKey, rawId)
              }}
              onAuxClick={(e) => {
                if (!rawId) return
                if (e.button !== 1) return
                e.preventDefault()
                window.open(buildTemplateHref(templateQsKey, rawId), '_blank', 'noopener,noreferrer')
              }}
            >
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-xl">
                <div className="relative z-0 w-full min-w-0 shrink-0">
                  <TemplateMiniPreview
                    variant={variant}
                    layoutPreset={row.layoutPreset}
                    theme={resolveGalleryPreviewTheme(variant, row)}
                    bodyFont={variant === 'quotation' && row.fontFamily ? String(row.fontFamily) : undefined}
                    {...(variant === 'invoice'
                      ? { showBankDetails: row.sectionSettings?.showBankDetails !== false }
                      : {})}
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-neutral-900">{row.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{presetName}</p>
                <p className="mt-2 text-xs text-neutral-400">Created {formatCreatedAt(row.createdAt)}</p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-gallery-card-action
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    title="Edit template"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit?.(row)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-gallery-card-action
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(row)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize', statusBadgeClass(row.status))}>
                  {row.status || 'active'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
