import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { cn } from '@/utils/cn'
import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme'

export function PageShell({ children, fullWidth = false, flush = false, mainClassName }) {
  useWorkspaceTheme()
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="cx-page-bg flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-surface-muted">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition lg:hidden',
          mobileNav ? 'block' : 'hidden',
        )}
        onClick={() => setMobileNav(false)}
        onKeyDown={(e) => e.key === 'Escape' && setMobileNav(false)}
        role="presentation"
      />
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[220px] flex-col overflow-hidden shadow-xl transition-transform duration-200 lg:hidden',
          mobileNav ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <Sidebar
          isMobile
          collapsed={false}
          className="min-h-0 flex-1"
          onNavigate={() => setMobileNav(false)}
        />

      </div>
      <div
        className={cn(
          'hidden min-h-0 shrink-0 self-stretch overflow-hidden border-r transition-[width] duration-200 ease-out lg:flex lg:flex-col',
          sidebarCollapsed ? 'w-[52px]' : 'w-[220px]',
        )}
        style={{ borderColor: 'var(--brand-primary-dark)' }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          className="min-h-0 flex-1"
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMobileNav(true)} />
        <main
          className={cn(
            'cx-page-bg scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted',
            fullWidth ? 'px-0' : 'px-4 sm:px-6',
            fullWidth ? (flush ? 'py-0' : 'pt-0 pb-4 sm:pb-6') : 'py-4 sm:py-6',
            mainClassName,
          )}
        >
          <div
            className={cn(
              'flex w-full min-w-0 max-w-none flex-col',
              flush ? 'h-full gap-0' : 'gap-6',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
