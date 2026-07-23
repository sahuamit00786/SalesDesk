import { useState } from 'react'
import { Menu } from '@/components/ui/icons'
import { useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import { getRouteMeta } from '@/components/layout/navConfig'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { WorkspaceManagementModal } from '@/components/layout/WorkspaceManagementModal'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { ProfileMenuDropdown } from '@/components/layout/ProfileMenuDropdown'
import { useHrRole } from '@/features/hr/useHrRole'
import { useNotificationsSocket } from '@/features/notifications/useNotificationsSocket'

function selectIsCompanyAdmin(state) {
  return state.auth.user?.isCompanyAdmin ?? false
}

export function Topbar({ onMenu }) {
  const { pathname } = useLocation()
  const meta = getRouteMeta(pathname)
  const hrRole = useHrRole()
  const isCompanyAdmin = useAppSelector(selectIsCompanyAdmin)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  useNotificationsSocket()

  return (
    <>
      <header className="cx-chrome-header flex shrink-0 items-center justify-between gap-3 border-b border-surface-border bg-white px-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
          <Button
            variant="icon"
            type="button"
            className="shrink-0 lg:hidden text-ink"
            onClick={onMenu}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-h-0 min-w-0 flex-1">
            <h1 className="truncate text-base font-medium leading-tight text-ink">{meta.title}</h1>
            {meta.sub ? (
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-ink-muted">{meta.sub}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <WorkspaceSwitcher onWorkspaceSettingsClick={() => setWorkspaceModalOpen(true)} />
          <NotificationBell />
          <ProfileMenuDropdown />
        </div>
      </header>
      {isCompanyAdmin && (
        <WorkspaceManagementModal open={workspaceModalOpen} onClose={() => setWorkspaceModalOpen(false)} />
      )}
    </>
  )
}
