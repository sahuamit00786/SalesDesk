import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Check, LogOut } from '@/components/ui/icons'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { baseApi } from '@/features/api/baseApi'
import { logout } from '@/features/auth/authSlice'
import { useWorkspacesQuery } from '@/features/workspace/workspaceApi'
import { selectWorkspaceList, setActiveWorkspace } from '@/features/workspace/workspaceSlice'
import { DASHBOARD_PATH } from '@/constants/appRoutes'
import { cn } from '@/utils/cn'

function selectIsCompanyAdmin(state) {
  return state.auth.user?.isCompanyAdmin ?? false
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const staggerChild = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

/**
 * Post-login workspace picker. The server already scopes the list — company admins
 * get every workspace in the company, everyone else gets only their assignments —
 * so this renders whatever comes back without re-filtering by role.
 */
export function SelectWorkspacePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isCompanyAdmin = useAppSelector(selectIsCompanyAdmin)
  const userName = useAppSelector((s) => s.auth.user?.name)
  const companyName = useAppSelector((s) => s.auth.user?.company?.name)
  const lastPickedId = useAppSelector((s) => s.workspace.activeWorkspaceId)
  const fallbackWorkspaces = useAppSelector(selectWorkspaceList)
  const { data, isLoading } = useWorkspacesQuery()

  const workspaces = useMemo(() => {
    const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.data) ? data.data : []
    const live = items.filter((w) => !w.archived)
    return live.length ? live : fallbackWorkspaces
  }, [data, fallbackWorkspaces])

  const from = location.state?.from?.pathname
  const redirectTo = from && from !== '/select-workspace' ? from : DASHBOARD_PATH

  const choose = (id) => {
    dispatch(setActiveWorkspace(id))
    dispatch(baseApi.util.resetApiState())
    navigate(redirectTo, { replace: true })
  }

  const showEmpty = !isLoading && workspaces.length === 0

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-white via-violet-50/50 to-fuchsia-50/30 text-[#0a0714]">
      <div
        className="pointer-events-none absolute -left-32 top-[-10%] h-[min(520px,70vw)] w-[min(520px,70vw)] rounded-full bg-violet-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-[-8%] h-[min(440px,60vw)] w-[min(440px,60vw)] rounded-full bg-fuchsia-400/10 blur-3xl"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white/80 px-4 text-sm font-medium text-ink-muted backdrop-blur transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-8">
          <motion.div variants={staggerChild} className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
              {companyName ?? 'Your company'}
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Welcome back'}
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-zinc-500">
              {isCompanyAdmin
                ? 'Pick a workspace to work in. You can switch at any time from the top bar.'
                : 'Pick one of your assigned workspaces to continue.'}
            </p>
          </motion.div>

          {isLoading ? (
            <motion.div variants={staggerChild} className="flex flex-wrap justify-center gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 w-full animate-pulse rounded-2xl border border-surface-border bg-white/60 sm:w-[17rem]"
                />
              ))}
            </motion.div>
          ) : showEmpty ? (
            <motion.div
              variants={staggerChild}
              className="mx-auto max-w-md rounded-2xl border border-surface-border bg-white/80 p-8 text-center backdrop-blur"
            >
              <Building2 className="mx-auto h-10 w-10 text-ink-faint" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-ink">No workspace assigned</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                {isCompanyAdmin
                  ? 'This company has no active workspaces yet. Create one to get started.'
                  : 'Your account is not assigned to any workspace yet. Ask a company admin to add you.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerChild}
              className="flex flex-wrap justify-center gap-4"
              role="list"
              aria-label="Workspaces"
            >
              {workspaces.map((w) => {
                const accent = /^#[0-9A-Fa-f]{6}$/.test(w.themeColor ?? '') ? w.themeColor : null
                const isLast = w.id === lastPickedId
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="listitem"
                    onClick={() => choose(w.id)}
                    className={cn(
                      'group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl border bg-white/80 p-5 text-left backdrop-blur transition-all duration-150 sm:w-[17rem]',
                      'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500/25',
                      isLast ? 'border-brand-300 ring-1 ring-brand-500/20' : 'border-surface-border',
                    )}
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ background: accent ?? 'var(--brand-primary, #5b21b6)' }}
                      aria-hidden
                    />
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ background: accent ?? 'var(--brand-primary, #5b21b6)' }}
                      aria-hidden
                    >
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ink">{w.name}</span>
                        {isLast ? <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden /> : null}
                      </span>
                      {w.description ? (
                        <span className="line-clamp-2 block text-sm text-ink-muted">{w.description}</span>
                      ) : (
                        <span className="block text-sm text-ink-faint">No description</span>
                      )}
                    </span>
                    {isLast ? (
                      <span className="text-[11px] font-medium uppercase tracking-wider text-brand-600">
                        Last used
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  )
}

export default SelectWorkspacePage
