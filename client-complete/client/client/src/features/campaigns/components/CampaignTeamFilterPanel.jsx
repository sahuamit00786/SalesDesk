import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

/**
 * Filter panel for team member pickers (campaign create / edit).
 */
export function CampaignTeamFilterPanel({ users = [], filters, onChange, onApply, onReset }) {
  const roleOptions = useMemo(() => {
    const map = new Map()
    for (const u of users) {
      const role = u.companyRole
      if (role?.id) map.set(role.id, role.name || 'Role')
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [users])

  const departments = useMemo(() => {
    const set = new Set()
    for (const u of users) {
      const d = String(u.department || '').trim()
      if (d) set.add(d)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [users])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink">Role</span>
          <Select
            className="mt-1 h-10 rounded-lg text-sm"
            value={filters.roleId}
            onChange={(e) => onChange({ roleId: e.target.value })}
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink">Department</span>
          <Select
            className="mt-1 h-10 rounded-lg text-sm"
            value={filters.department}
            onChange={(e) => onChange({ department: e.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-border bg-surface-subtle/50 px-3 py-2.5">
        <input
          type="checkbox"
          checked={filters.includeInactive}
          onChange={(e) => onChange({ includeInactive: e.target.checked })}
          className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
        />
        <span className="text-xs font-medium text-ink">Include inactive users</span>
      </label>

      <div className="flex justify-end gap-2 border-t border-surface-border pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button type="button" size="sm" onClick={onApply}>
          Apply filters
        </Button>
      </div>
    </div>
  )
}

export const CAMPAIGN_TEAM_FILTER_INITIAL = {
  roleId: '',
  department: '',
  includeInactive: false,
}

export function countCampaignTeamFilters(filters) {
  let n = 0
  if (filters.roleId) n += 1
  if (filters.department) n += 1
  if (filters.includeInactive) n += 1
  return n
}

export function filterCampaignTeamUsers(users, { search = '', roleId = '', department = '', includeInactive = false }) {
  const q = search.trim().toLowerCase()
  return users.filter((u) => {
    if (!includeInactive && u.isActive === false) return false
    if (roleId && u.companyRole?.id !== roleId) return false
    if (department && String(u.department || '').trim() !== department) return false
    if (!q) return true
    return `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
  })
}
