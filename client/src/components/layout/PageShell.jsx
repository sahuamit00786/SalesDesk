import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { cn } from '@/utils/cn'

export function PageShell({ children, fullWidth = false }) {
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-surface-muted">
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
          'fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[220px] flex-col overflow-hidden bg-surface-muted shadow-xl transition-transform duration-200 lg:hidden',
          mobileNav ? 'translate-x-0' : '-translate-x-full',
        )}
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
          'hidden min-h-0 shrink-0 self-stretch overflow-hidden border-r border-surface-border transition-[width] duration-200 ease-out lg:flex lg:flex-col',
          sidebarCollapsed ? 'relative z-[60] w-[52px]' : 'w-[220px]',
        )}
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
            'scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain',
            fullWidth ? 'pt-0 pb-4 sm:pb-6' : 'py-4 sm:py-6',
            fullWidth ? 'px-0' : 'px-4 sm:px-6',
          )}
        >
          <div className={cn('flex w-full flex-col gap-6', fullWidth ? 'max-w-none' : 'mx-auto max-w-6xl')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
