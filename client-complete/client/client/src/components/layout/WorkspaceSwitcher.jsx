import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Building2, Check, ChevronDown, Settings } from '@/components/ui/icons'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { baseApi } from '@/features/api/baseApi'
import { useWorkspacesQuery } from '@/features/workspace/workspaceApi'
import {
  selectActiveWorkspace,
  selectWorkspaceList,
  setActiveWorkspace,
} from '@/features/workspace/workspaceSlice'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import { cn } from '@/utils/cn'

function selectIsCompanyAdmin(state) {
  return state.auth.user?.isCompanyAdmin ?? false
}

export function WorkspaceSwitcher({ onWorkspaceSettingsClick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const fallbackWorkspaces = useAppSelector(selectWorkspaceList)
  const persistedActiveId = useAppSelector((s) => s.workspace.activeWorkspaceId)
  const fallbackActive = useAppSelector(selectActiveWorkspace) ?? { id: '', name: 'Workspace' }
  const isCompanyAdmin = useAppSelector(selectIsCompanyAdmin)
  const { data } = useWorkspacesQuery()

  const liveItems = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.data) ? data.data : []
  const liveWorkspaces = liveItems
    .filter((w) => !w.archived)
    .map((w) => ({ id: w.id, name: w.name }))

  const workspaces = liveWorkspaces.length ? liveWorkspaces : fallbackWorkspaces
  const activeId =
    persistedActiveId && workspaces.some((w) => w.id === persistedActiveId) ? persistedActiveId : (workspaces[0]?.id ?? null)
  const active = workspaces.find((w) => w.id === activeId) ?? fallbackActive

  useOutsideClick(rootRef, () => setOpen(false), open)

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 max-w-[140px] items-center gap-2 rounded-xl border border-surface-border bg-white px-3.5 text-left text-sm text-ink outline-none transition-all duration-150 hover:border-brand-300 hover:bg-surface-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:max-w-[220px]"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch workspace"
      >
        <Building2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 truncate font-medium">{active.name}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-[110] mt-1 w-60 rounded-xl border border-surface-border bg-white py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          role="listbox"
          aria-label="Workspaces"
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Workspaces</p>
          <div className="flex flex-col gap-0.5 px-1 pb-1">
            {workspaces.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-muted">No workspaces linked yet.</p>
            ) : (
              workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="option"
                  aria-selected={w.id === activeId}
                  onClick={() => {
                    dispatch(setActiveWorkspace(w.id))
                    dispatch(baseApi.util.resetApiState())
                    setOpen(false)
                  }}
                  className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-ink transition-colors duration-150 hover:bg-surface-muted',
                    w.id === activeId && 'bg-surface-subtle font-medium',
                  )}
                >
                  {w.id === activeId ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                  ) : (
                    <span className="inline-block w-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 truncate">{w.name}</span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-surface-border px-1 py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/select-workspace')
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
              <span>Switch workspace</span>
            </button>
            {isCompanyAdmin && (
              <button
                type="button"
                onClick={() => {
                  onWorkspaceSettingsClick?.()
                  setOpen(false)
                }}
                className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
              >
                <Settings className="h-4 w-4 shrink-0" aria-hidden />
                <span>Workspace settings</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
