import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { NAV_SECTIONS } from '@/components/layout/navConfig'
import { useAppSelector } from '@/app/hooks'
import { useHrRole } from '@/features/hr/useHrRole'
import { buildAllowedRouteSet, isMenuPathAllowed } from '@/utils/menuAccess'
import { selectActiveWorkspaceName } from '@/features/workspace/workspaceSlice'
import { useGetMailboxInboxBadgeQuery } from '@/features/email/emailApi'
import { useGetGoogleEmailStatusQuery } from '@/features/leads/leadsApi'
import { useGetNavBadgesQuery } from '@/features/analytics/analyticsApi'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'

const SIDEBAR_BG = 'var(--brand-primary)'
const SIDEBAR_ACTIVE_BG = 'bg-white/15'
const SIDEBAR_HOVER_BG = 'hover:bg-white/10'
const SIDEBAR_BORDER = 'border-white/15'
const ACTIVE_BORDER = 'border-r-white'
const PEEK_CLOSE_MS = 200
const SIDEBAR_SCROLL_KEY = 'leadflow.sidebar.scrollTop'

const navLinkClass = ({ isActive }, narrow) =>
  cn(
    'relative flex items-center gap-2.5 border-r-[3px] border-transparent py-2 text-[13px] text-white/90 transition-colors duration-100',
    SIDEBAR_HOVER_BG,
    'hover:text-white',
    narrow ? 'justify-center px-0' : 'pl-4 pr-2',
    isActive && cn(SIDEBAR_ACTIVE_BG, 'font-medium text-white', ACTIVE_BORDER),
    // Active item keeps its module tone and just burns brighter — the white pill
    // and border already carry the "selected" signal.
    '[&[aria-current=page]_svg]:opacity-100',
  )

const sidebarChromeBtn =
  'flex h-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors duration-150 hover:bg-white/15 hover:border-white/30'

function NavBadge({ children, variant = 'default', collapsed }) {
  if (collapsed || children == null) return null
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        variant === 'info' ? 'bg-white/20 text-white' : 'bg-danger/20 text-red-100',
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
        variant === 'info' ? 'bg-brand-100 text-brand-700' : 'bg-danger/10 text-danger',
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
      className="pointer-events-auto fixed z-[100] min-w-[196px] rounded-xl border border-brand-200 bg-white px-3 py-2 shadow-2xl"
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
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)
  const { data: googleEmailStatus, isSuccess: googleEmailStatusOk } = useGetGoogleEmailStatusQuery(undefined, { skip: !accessToken })
  const skipMailboxBadge = !accessToken || !googleEmailStatusOk || googleEmailStatus?.data?.readMailbox === false
  const { data: mailboxBadgeRes } = useGetMailboxInboxBadgeQuery(undefined, {
    skip: skipMailboxBadge,
    pollingInterval: 45000,
  })
  const emailUnread = Number(mailboxBadgeRes?.data?.unread || 0)
  const emailUnreadApprox = Boolean(mailboxBadgeRes?.data?.unreadApproximate)
  const emailNavBadge =
    emailUnread > 0 ? (emailUnreadApprox ? `${emailUnread}+` : String(emailUnread)) : null

  const { data: navBadgesRes } = useGetNavBadgesQuery(undefined, {
    skip: !accessToken,
    pollingInterval: 60000,
  })
  const nb = navBadgesRes?.data || {}
  function fmtBadge(n) { return n > 0 ? String(n) : null }
  const navBadgeMap = {
    '/leads': fmtBadge(nb.leads),
    '/opportunities': fmtBadge(nb.opportunities),
    '/lead-distribution': fmtBadge(nb.leadDistribution),
    '/calendar': fmtBadge(nb.calendar),
    '/meetings': fmtBadge(nb.meetings),
    '/campaigns': fmtBadge(nb.campaigns),
    '/team': fmtBadge(nb.team),
    '/tasks': fmtBadge(nb.tasks),
    '/followups': fmtBadge(nb.followups),
  }
  const hrRole = useHrRole()
  const allowedRoutes = buildAllowedRouteSet(user?.allowedMenus, {
    isCompanyAdmin: user?.isCompanyAdmin,
  })
  const navSections = (user?.isCompanyAdmin
    ? NAV_SECTIONS
    : NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (section.label === 'HR') {
            if (item.to === '/leave/config' && hrRole !== 'admin') return false
            if (item.to === '/leave/approval' && hrRole !== 'admin' && hrRole !== 'manager') return false
          }
          return isMenuPathAllowed(item.to, allowedRoutes)
        }),
      })).filter((section) => section.items.length > 0)
  ).filter((section) => !section.hidden)
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
        'cx-sidebar flex min-h-0 flex-1 flex-col',
        narrow ? 'w-[52px]' : 'w-[220px]',
        className,
      )}
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      <div
        className={cn(
          'cx-chrome-header flex shrink-0 items-center border-b py-2.5',
          SIDEBAR_BORDER,
          narrow ? 'justify-center px-2' : 'px-3',
        )}
      >
        {narrow ? (
          <LeadNestLogo variant="sidebar-wordmark-collapsed" />
        ) : (
          <div className="min-w-0 py-0.5">
            <LeadNestLogo variant="sidebar-wordmark" />
            <p className="mt-1.5 truncate text-[11px] leading-tight text-white/70">
              {workspaceName ? `${workspaceName} workspace` : 'workspace'}
            </p>
          </div>
        )}
      </div>

      <nav
        ref={navScrollRef}
        className="cx-icon-tone-dark scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-1"
      >
        {navSections.map((section) => (
          <div key={section.label} className="pb-1 pt-2.5">
            {!narrow ? (
              <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-white/55">
                {section.label}
              </p>
            ) : null}
            <div className="flex flex-col">
              {section.items.map(({ to, label, icon: Icon, badge, badgeVariant, end }) => {
                const liveBadge = to === '/email' ? emailNavBadge : navBadgeMap[to] ?? null
                const resolvedBadge = liveBadge !== null ? liveBadge : badge
                const resolvedVariant = to === '/email' && emailNavBadge ? 'default' : badgeVariant
                return narrow ? (
                  <div
                    key={to}
                    id={`nav-peek-${to}`}
                    className="relative"
                    onMouseEnter={(e) => openPeek(to, label, resolvedBadge, resolvedVariant, e.currentTarget)}
                    onMouseLeave={schedulePeekClose}
                  >
                    {to === '/email' && emailUnread > 0 ? (
                      <span className="pointer-events-none absolute right-0.5 top-0.5 z-[1] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 bg-red-500 px-[5px] text-[9px] font-bold leading-none text-white shadow-sm">
                        {emailUnread > 99 ? '99+' : emailUnread}
                      </span>
                    ) : null}
                    <NavLink
                      to={to}
                      end={Boolean(end)}
                      title={label}
                      onClick={() => isMobile && onNavigate?.()}
                      className={({ isActive }) => navLinkClass({ isActive }, true)}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90 transition-opacity" aria-hidden />
                    </NavLink>
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={Boolean(end)}
                    onClick={() => isMobile && onNavigate?.()}
                    className={({ isActive }) => navLinkClass({ isActive }, false)}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90 transition-opacity" aria-hidden />
                    <span className="min-w-0 truncate">{label}</span>
                    <NavBadge variant={resolvedVariant} collapsed={false}>
                      {resolvedBadge}
                    </NavBadge>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <CollapsedItemPeek peek={narrow ? peek : null} onPeekEnter={cancelPeekClose} onPeekLeave={schedulePeekClose} />

      {!isMobile ? (
        <div className={cn('mt-auto shrink-0 border-t px-2 py-3', SIDEBAR_BORDER)}>
          <div className={cn('flex', narrow ? 'justify-center' : 'w-full')}>
            <button
              type="button"
              className={cn(sidebarChromeBtn, narrow ? 'w-9' : 'w-full')}
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
            <p className="mt-2 text-center text-[10px] font-medium text-white/50">Version 0.1</p>
          ) : (
            <p className="mt-2 text-center text-[9px] font-medium leading-tight text-white/50">0.1</p>
          )}
        </div>
      ) : null}
    </aside>
  )
}
