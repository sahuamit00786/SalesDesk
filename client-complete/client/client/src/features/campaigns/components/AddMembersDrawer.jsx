import { useMemo, useState } from 'react'
import { Search, UserPlus } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Button } from '@/components/ui/Button'
import { useAssignableUsersQuery } from '@/features/team/teamApi'
import { useAddCampaignMembersMutation } from '@/features/campaigns/campaignsApi'
import { cn } from '@/utils/cn'

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?'
}

export function AddMembersDrawer({ open, onClose, campaignId, existingMemberIds = [] }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const existingSet = useMemo(() => new Set(existingMemberIds.map(String)), [existingMemberIds])

  const { data: usersRes, isLoading } = useAssignableUsersQuery(undefined, { skip: !open })
  const allUsers = usersRes?.data?.items || []

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase()
    return allUsers.filter((u) => {
      if (existingSet.has(String(u.id))) return false
      if (!search) return true
      return `${u.name || ''} ${u.email || ''} ${u.department || ''}`.toLowerCase().includes(search)
    })
  }, [allUsers, existingSet, q])

  const [addMembers, { isLoading: adding }] = useAddCampaignMembersMutation()

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === rows.length && rows.length > 0) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  const handleClose = () => {
    setQ('')
    setSelected(new Set())
    onClose()
  }

  const handleAdd = async () => {
    if (!selected.size) return
    try {
      await addMembers({ campaignId, userIds: [...selected] }).unwrap()
      toast.success(`${selected.size} member${selected.size !== 1 ? 's' : ''} added to campaign`)
      handleClose()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not add members')
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length

  return (
    <RightDrawer
      open={open}
      onClose={handleClose}
      title="Add team members"
      description="Add users to this campaign team. New unassigned leads will be distributed to them."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {selected.size > 0 ? <span className="font-semibold text-ink">{selected.size} selected</span> : 'None selected'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!selected.size || adding} onClick={handleAdd}>
              <UserPlus className="h-4 w-4" />
              {adding ? 'Adding…' : `Add ${selected.size || ''} member${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            placeholder="Search by name, email, department…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* User list */}
        <div className="overflow-hidden rounded-xl border border-surface-border">
          <div className="flex items-center gap-3 border-b border-surface-border bg-surface-subtle/60 px-3 py-2">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-brand-700"
              checked={allChecked}
              onChange={toggleAll}
              disabled={rows.length === 0}
            />
            <span className="text-xs font-semibold text-ink-muted">
              {isLoading ? 'Loading…' : `${rows.length} user${rows.length !== 1 ? 's' : ''} available`}
            </span>
          </div>

          <div className="max-h-[min(60vh,540px)] divide-y divide-surface-border overflow-y-auto">
            {rows.length === 0 && !isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                {existingSet.size > 0 && allUsers.length === existingSet.size
                  ? 'All users are already on this campaign.'
                  : 'No users found.'}
              </p>
            ) : null}

            {rows.map((user) => {
              const isSelected = selected.has(user.id)
              const role = user.companyRole?.name || user.userRoleKind || ''
              return (
                <label
                  key={user.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                    isSelected ? 'bg-brand-50' : 'hover:bg-surface-subtle/50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-neutral-300 text-brand-700"
                    checked={isSelected}
                    onChange={() => toggle(user.id)}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-xs font-bold text-emerald-800">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{user.name || user.email}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {[user.email, role, user.department].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </RightDrawer>
  )
}
