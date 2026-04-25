import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { NAV_SECTIONS } from '@/components/layout/navConfig'
import { useAppSelector } from '@/app/hooks'
import { selectActiveWorkspaceName } from '@/features/workspace/workspaceSlice'

const ACTIVE_BORDER = 'border-[#534AB7]'
const PEEK_CLOSE_MS = 200
const SIDEBAR_SCROLL_KEY = 'leadflow.sidebar.scrollTop'

function NavBadge({ children, variant = 'default', collapsed }) {
  if (collapsed || children == null) return null
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        variant === 'info' ? 'bg-info/15 text-info' : 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </span>
  )
}

function PeekBadge({ children, variant = 'default' }) {
  if (children == null) return null
  return (
    <span
      className={cn(
        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
        variant === 'info' ? 'bg-info/15 text-info' : 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </span>
  )
}

function CollapsedItemPeek({ peek, onPeekEnter, onPeekLeave }) {
  if (!peek) return null

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-auto fixed z-[100] min-w-[196px] rounded-xl border border-surface-border bg-white px-3 py-2 shadow-2xl"
      style={{
        top: peek.top,
        left: peek.right + 4,
      }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
    >
      <p className="text-sm font-medium text-ink">{peek.label}</p>
      <PeekBadge variant={peek.badgeVariant}>{peek.badge}</PeekBadge>
    </div>,
    document.body,
  )
}

export function Sidebar({ className, collapsed = false, onToggleCollapse, isMobile = false, onNavigate }) {
  const workspaceName = useAppSelector(selectActiveWorkspaceName)
  const user = useAppSelector((s) => s.auth.user)
  const allowedRoutes = new Set((user?.allowedMenus || []).map((m) => m.route).filter(Boolean))
  const navSections = user?.isCompanyAdmin
    ? NAV_SECTIONS
    : NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => allowedRoutes.has(item.to)),
      })).filter((section) => section.items.length > 0)
  const narrow = collapsed && !isMobile
  const [peek, setPeek] = useState(null)
  const closeTimerRef = useRef(null)
  const navScrollRef = useRef(null)

  const cancelPeekClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const schedulePeekClose = useCallback(() => {
    cancelPeekClose()
    closeTimerRef.current = window.setTimeout(() => {
      setPeek(null)
      closeTimerRef.current = null
    }, PEEK_CLOSE_MS)
  }, [cancelPeekClose])

  useEffect(() => {
    if (!peek?.to) return undefined

    const el = document.getElementById(`nav-peek-${peek.to}`)
    const update = () => {
      if (!el) return
      const r = el.getBoundingClientRect()
      setPeek((p) => (p && p.to === peek.to ? { ...p, top: r.top, right: r.right } : p))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    const nav = el?.closest('nav')
    nav?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      nav?.removeEventListener('scroll', update)
    }
  }, [peek?.to])

  useEffect(() => () => cancelPeekClose(), [cancelPeekClose])

  useEffect(() => {
    const el = navScrollRef.current
    if (!el) return
    try {
      const raw = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
      const top = Number(raw)
      if (Number.isFinite(top) && top >= 0) {
        el.scrollTop = top
      }
    } catch {
      // ignore storage issues
    }
  }, [])

  useEffect(() => {
    const el = navScrollRef.current
    if (!el) return undefined
    const onScroll = () => {
      try {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop))
      } catch {
        // ignore storage issues
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const openPeek = (to, label, badge, badgeVariant, el) => {
    cancelPeekClose()
    const r = el.getBoundingClientRect()
    setPeek({ to, label, badge, badgeVariant, top: r.top, right: r.right })
  }

  return (
    <aside
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-surface-muted',
        narrow ? 'w-[52px]' : 'w-[220px]',
        className,
      )}
    >
      <div
        className={cn(
          'shrink-0 border-b border-surface-border',
          narrow ? 'px-2 py-3' : 'px-4 py-3.5',
        )}
      >
        {narrow ? (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-white text-xs font-semibold text-ink">
              LF
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">LeadFlow CRM</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{workspaceName} workspace</p>
          </>
        )}
      </div>

      <nav ref={navScrollRef} className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-1">
        {navSections.map((section) => (
          <div key={section.label} className="pb-1 pt-2.5">
            {!narrow ? (
              <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-ink-faint">
                {section.label}
              </p>
            ) : null}
            <div className="flex flex-col">
              {section.items.map(({ to, label, icon: Icon, badge, badgeVariant, end }) =>
                narrow ? (
                  <div
                    key={to}
                    id={`nav-peek-${to}`}
                    className="relative"
                    onMouseEnter={(e) => openPeek(to, label, badge, badgeVariant, e.currentTarget)}
                    onMouseLeave={schedulePeekClose}
                  >
                    <NavLink
                      to={to}
                      end={Boolean(end)}
                      title={label}
                      onClick={() => isMobile && onNavigate?.()}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-2.5 border-r-2 border-transparent py-2 text-[13px] text-ink-muted transition-colors duration-100 hover:bg-white hover:text-ink',
                          'justify-center px-0',
                          isActive && cn('bg-white font-medium text-ink', ACTIVE_BORDER),
                          'text-ink-muted [&[aria-current=page]]:text-[#534AB7] [&[aria-current=page]_svg]:text-[#534AB7]',
                          '[&[aria-current=page]_svg]:opacity-100',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-60 transition-opacity" aria-hidden />
                    </NavLink>
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={Boolean(end)}
                    onClick={() => isMobile && onNavigate?.()}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2.5 border-r-2 border-transparent py-2 text-[13px] text-ink-muted transition-colors duration-100 hover:bg-white hover:text-ink',
                        'pl-4 pr-2',
                        isActive && cn('bg-white font-medium text-ink', ACTIVE_BORDER),
                        '[&[aria-current=page]_svg]:opacity-100',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-60 transition-opacity" aria-hidden />
                    <span className="min-w-0 truncate">{label}</span>
                    <NavBadge variant={badgeVariant} collapsed={false}>
                      {badge}
                    </NavBadge>
                  </NavLink>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <CollapsedItemPeek peek={narrow ? peek : null} onPeekEnter={cancelPeekClose} onPeekLeave={schedulePeekClose} />

      {!isMobile ? (
        <div className="mt-auto shrink-0 border-t border-surface-border px-2 py-3">
          <div className={cn('flex', narrow ? 'justify-center' : 'w-full')}>
            <button
              type="button"
              className={cn(
                'flex h-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-white text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink',
                narrow ? 'w-9' : 'w-full',
              )}
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          {!narrow ? (
            <p className="mt-2 text-center text-[10px] font-medium text-ink-faint">Version 0.1</p>
          ) : (
            <p className="mt-2 text-center text-[9px] font-medium leading-tight text-ink-faint">0.1</p>
          )}
        </div>
      ) : (
        <div className="mt-auto shrink-0 border-t border-surface-border px-4 py-3">
          <p className="text-center text-[10px] font-medium text-ink-faint">Version 0.1</p>
        </div>
      )}
    </aside>
  )
}
