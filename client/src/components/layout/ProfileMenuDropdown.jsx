import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { useHrRole } from '@/features/hr/useHrRole'

function roleLabel(role) {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Manager'
  return 'Employee'
}

export function ProfileMenuDropdown() {
  const user = useAppSelector((s) => s.auth.user)
  const hrRole = useHrRole()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const initial = String(user?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-2 py-1.5 hover:bg-surface-subtle"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-left text-sm sm:block">
          <span className="block font-medium text-ink">{user?.name}</span>
          <span className="block text-[10px] text-ink-muted">{roleLabel(hrRole)}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:block" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-surface-border bg-white py-1 shadow-xl">
          {user?.id ? (
            <Link
              to={`/team/${user.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          ) : null}
          <Link
            to="/workspace"
            className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-surface-subtle"
            onClick={() => {
              dispatch(logout())
              navigate('/login', { replace: true })
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
