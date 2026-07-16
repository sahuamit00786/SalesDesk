import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart2,
  BookOpen,
  Building2,
  CalendarCheck,
  FileText,
  MessageCircle,
  Search,
  Users,
  Workflow,
  X,
} from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { cn } from '@/utils/cn'
import { KB_SECTIONS } from '@/features/knowledge/kbData'
import { parseKbModules } from '@/features/knowledge/parseKbModules'
import { KnowledgeAccordion } from '@/features/knowledge/KnowledgeAccordion'
import { useKbSearchIndex, searchKbIndex } from '@/features/knowledge/useKbSearchIndex'

const ICONS = {
  Users,
  MessageCircle,
  FileText,
  Workflow,
  Building2,
  CalendarCheck,
  BarChart2,
}

function moduleKey(sectionId, anchor) {
  return `${sectionId}::${anchor}`
}

export function KnowledgeBasePage() {
  const parsedBySection = useMemo(
    () => Object.fromEntries(KB_SECTIONS.map((s) => [s.id, parseKbModules(s.content)])),
    [],
  )

  const [activeSectionId, setActiveSectionId] = useState(KB_SECTIONS[0].id)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [pendingAnchor, setPendingAnchor] = useState(null)
  const [openModules, setOpenModules] = useState(() => {
    const first = parsedBySection[KB_SECTIONS[0].id]?.modules[0]
    return first ? new Set([moduleKey(KB_SECTIONS[0].id, first.anchor)]) : new Set()
  })
  const [openFaqs, setOpenFaqs] = useState(new Set())
  const searchBoxRef = useRef(null)

  const searchIndex = useKbSearchIndex(KB_SECTIONS)
  const results = useMemo(() => searchKbIndex(searchIndex, query), [searchIndex, query])
  const parsed = parsedBySection[activeSectionId]

  useEffect(() => {
    function onClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!pendingAnchor) return
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(pendingAnchor)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('kb-flash')
        setTimeout(() => el.classList.remove('kb-flash'), 1600)
      }
      setPendingAnchor(null)
    })
    return () => cancelAnimationFrame(raf)
  }, [pendingAnchor, activeSectionId])

  /** Ensures the given section has at least one open module (its first one), without clobbering user choices. */
  function ensureSectionHasOpenModule(prevOpenModules, sectionId) {
    const hasAny = [...prevOpenModules].some((k) => k.startsWith(`${sectionId}::`))
    if (hasAny) return prevOpenModules
    const first = parsedBySection[sectionId]?.modules[0]
    if (!first) return prevOpenModules
    const next = new Set(prevOpenModules)
    next.add(moduleKey(sectionId, first.anchor))
    return next
  }

  function goToResult(result) {
    setQuery('')
    setSearchOpen(false)
    setActiveSectionId(result.sectionId)
    setOpenModules((prev) => new Set(prev).add(moduleKey(result.sectionId, result.moduleAnchor)))
    if (result.itemId) {
      setOpenFaqs((prev) => new Set(prev).add(moduleKey(result.sectionId, result.itemId)))
    }
    setPendingAnchor(result.itemId ?? result.moduleAnchor)
  }

  function selectSection(id) {
    setActiveSectionId(id)
    setOpenModules((prev) => ensureSectionHasOpenModule(prev, id))
    setQuery('')
    setSearchOpen(false)
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sectionOpenModules = useMemo(
    () =>
      new Set(
        [...openModules]
          .filter((k) => k.startsWith(`${activeSectionId}::`))
          .map((k) => k.slice(activeSectionId.length + 2)),
      ),
    [openModules, activeSectionId],
  )
  const sectionOpenFaqs = useMemo(
    () =>
      new Set(
        [...openFaqs].filter((k) => k.startsWith(`${activeSectionId}::`)).map((k) => k.slice(activeSectionId.length + 2)),
      ),
    [openFaqs, activeSectionId],
  )

  function toggleModule(anchor) {
    const key = moduleKey(activeSectionId, anchor)
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleFaq(itemId) {
    const key = moduleKey(activeSectionId, itemId)
    setOpenFaqs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <PageShell fullWidth>
      <style>{`
        .kb-flash { animation: kbFlash 1.6s ease-out; border-radius: 0.5rem; }
        @keyframes kbFlash {
          0% { background-color: rgba(251, 191, 36, 0.35); }
          100% { background-color: transparent; }
        }
      `}</style>
      <div className="mx-auto flex w-full max-w-[1360px] min-w-0 flex-1 flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4">
        {/* Hero / search header */}
        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-brand-50 via-white to-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                <BookOpen className="h-3.5 w-3.5" />
                Knowledge Base
              </div>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                How can we help you today?
              </h1>
            </div>
            <div ref={searchBoxRef} className="relative w-full shrink-0 sm:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search — e.g. “convert lead to invoice”"
                className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-9 text-sm text-ink shadow-sm outline-none placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {searchOpen && query.trim() ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[420px] overflow-y-auto rounded-xl border border-surface-border bg-white p-1.5 shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-ink-faint">
                      No matches for “{query}”. Try a different word.
                    </p>
                  ) : (
                    results.map((r, i) => (
                      <button
                        key={`${r.sectionId}-${r.moduleAnchor}-${r.itemId}-${i}`}
                        type="button"
                        onClick={() => goToResult(r)}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-brand-50"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                          {r.sectionLabel}
                        </span>
                        <span className="text-sm font-medium leading-snug text-ink">{r.text}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Body: category rail + content */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
          <nav className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:w-60 lg:flex-col lg:overflow-visible lg:pb-0">
            {KB_SECTIONS.map((section) => {
              const Icon = ICONS[section.icon] ?? BookOpen
              const active = section.id === activeSectionId
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors lg:w-full',
                    active
                      ? 'border-brand-300 bg-brand-50 shadow-sm'
                      : 'border-surface-border bg-white hover:border-brand-200 hover:bg-brand-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-md',
                      active ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className={cn('whitespace-nowrap text-[13px] font-medium lg:whitespace-normal', active ? 'text-brand-800' : 'text-ink')}>
                    {section.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1 rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-5">
            <KnowledgeAccordion
              intro={parsed.intro}
              modules={parsed.modules}
              openModules={sectionOpenModules}
              openFaqs={sectionOpenFaqs}
              onToggleModule={toggleModule}
              onToggleFaq={toggleFaq}
            />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
