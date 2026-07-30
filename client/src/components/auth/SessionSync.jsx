import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useMeQuery } from '@/features/auth/authApi'
import { updateSessionUser } from '@/features/auth/authSlice'
import {
  clearAccessRevokedNotice,
  selectAccessRevokedNotice,
  selectWorkspaceList,
} from '@/features/workspace/workspaceSlice'

/**
 * Refreshes `auth.user` from GET /auth/me so `company.workspaces` (and permissions menus)
 * stay in sync with the server. Members especially need this so `x-workspace-id` resolves.
 */
export function SessionSync() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.accessToken)
  const { data, isSuccess } = useMeQuery(undefined, { skip: !token })

  useEffect(() => {
    if (!isSuccess || !data?.data) return
    dispatch(updateSessionUser(data.data))
  }, [isSuccess, data, dispatch])

  // §5.6 of the bug audit — an admin revoking a user's access to their active workspace
  // used to silently swap them onto another workspace mid-session with zero indication;
  // they'd just see different data with no explanation. Surface it once, here.
  const accessRevokedNotice = useAppSelector(selectAccessRevokedNotice)
  const workspaceList = useAppSelector(selectWorkspaceList)
  useEffect(() => {
    if (!accessRevokedNotice) return
    const nextName = workspaceList.find((w) => w.id === accessRevokedNotice.nextId)?.name
    toast(
      nextName
        ? `Your access to that workspace was removed. Switched you to "${nextName}".`
        : 'Your access to that workspace was removed.',
      { icon: '⚠️' },
    )
    dispatch(clearAccessRevokedNotice())
  }, [accessRevokedNotice, workspaceList, dispatch])

  return <Outlet />
}
