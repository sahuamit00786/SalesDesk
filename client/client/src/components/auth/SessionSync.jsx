import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useMeQuery } from '@/features/auth/authApi'
import { updateSessionUser } from '@/features/auth/authSlice'

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

  return <Outlet />
}
