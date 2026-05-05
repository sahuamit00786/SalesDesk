import { Bell, LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { getRouteMeta } from '@/components/layout/navConfig'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import {MeetingNotificationBell}
from '@/features/meetings/components/MeetingNotificationBell'

export function Topbar({ onMenu }) {
  const { pathname } = useLocation()
  const meta = getRouteMeta(pathname)
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const onSignOut = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-auto min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Button
          variant="icon"
          type="button"
          className="shrink-0 lg:hidden text-ink"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1 py-0.5">
          <h1 className="truncate text-base font-medium text-ink">{meta.title}</h1>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-muted sm:line-clamp-none">{meta.sub}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <WorkspaceSwitcher />
        {/* <Button variant="icon" type="button" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </Button> */}
        <MeetingNotificationBell />
        <div className="hidden h-10 max-w-[140px] items-center truncate rounded-xl border border-surface-border px-3 text-sm text-ink-muted sm:flex">
          {user?.name ?? 'Signed out'}
        </div>
        <Button variant="icon" type="button" aria-label="Sign out" onClick={onSignOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
