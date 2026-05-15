import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { getRouteMeta } from '@/components/layout/navConfig'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { MeetingBotConsentBanner } from '@/features/meetings/components/MeetingBotConsentBanner'
import { CheckInOutButton } from '@/features/attendance/components/CheckInOutButton'
import { HrNotificationBell } from '@/features/leave/components/HrNotificationBell'
import { ProfileMenuDropdown } from '@/components/layout/ProfileMenuDropdown'

export function Topbar({ onMenu }) {
  const { pathname } = useLocation()
  const meta = getRouteMeta(pathname)

  return (
    <>
      <MeetingBotConsentBanner />
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
            {meta.sub ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-muted sm:line-clamp-none">{meta.sub}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <CheckInOutButton />
          <WorkspaceSwitcher />
          <HrNotificationBell />
          <ProfileMenuDropdown />
        </div>
      </header>
    </>
  )
}
