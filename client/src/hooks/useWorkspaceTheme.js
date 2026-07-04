import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectActiveWorkspace } from '@/features/workspace/workspaceSlice'

export function darkenHex(hex, amount = 18) {
  const clean = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#4c1d95'
  const n = parseInt(clean, 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function useWorkspaceTheme() {
  const workspace = useSelector(selectActiveWorkspace)

  useEffect(() => {
    const theme = workspace?.themeColor || '#6D29D9'
    const text = workspace?.sidebarTextColor || '#ffffff'
    document.documentElement.style.setProperty('--brand-primary', theme)
    document.documentElement.style.setProperty('--brand-primary-dark', darkenHex(theme))
    document.documentElement.style.setProperty('--sidebar-text', text)
  }, [workspace?.id, workspace?.themeColor, workspace?.sidebarTextColor])
}
