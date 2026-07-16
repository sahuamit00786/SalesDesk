import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { selectWorkspaceConfirmed } from '@/features/workspace/workspaceSlice'

export const SELECT_WORKSPACE_PATH = '/select-workspace'

/**
 * Sends users to the workspace picker until they choose one for this session.
 * Nest inside `RequireOnboarded`, and keep `/select-workspace` outside of it
 * so the picker itself is reachable.
 */
export function RequireWorkspace() {
  const confirmed = useAppSelector(selectWorkspaceConfirmed)
  const location = useLocation()

  if (!confirmed) {
    return <Navigate to={SELECT_WORKSPACE_PATH} replace state={{ from: location }} />
  }

  return <Outlet />
}
