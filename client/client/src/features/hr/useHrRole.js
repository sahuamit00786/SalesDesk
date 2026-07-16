import { useAppSelector } from '@/app/hooks'

export function useHrRole() {
  const user = useAppSelector((s) => s.auth.user)
  if (user?.isCompanyAdmin) return 'admin'
  const kind = String(user?.companyRole?.userRoleKind || '').toLowerCase()
  if (kind === 'manager' || kind === 'workspace_admin') return 'manager'
  return 'employee'
}

export function useIsHrManagerOrAdmin() {
  const role = useHrRole()
  return role === 'admin' || role === 'manager'
}
