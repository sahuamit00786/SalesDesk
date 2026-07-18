import { format, isValid, parseISO } from 'date-fns'
import { PRIORITY_SECTIONS, STATUS_SECTIONS } from './taskConstants'

export function localDateToIso(dateStr, endOfDay = false) {
  if (!dateStr) return undefined
  const [y, m, d] = dateStr.split('-').map(Number)
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
    : new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

export function todayLocalDateKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function tomorrowLocalDateKey() {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function initialsFromName(name) {
  const n = String(name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDueLabel(dueAt) {
  if (!dueAt) return '—'
  const d = dueAt instanceof Date ? dueAt : parseISO(String(dueAt))
  if (!isValid(d)) return '—'
  return format(d, 'MMM d, yyyy')
}

/** Calendar-day distance to the due date, e.g. "3d left", "Due today", "2d over". */
export function dueRemainingLabel(dueAt) {
  if (!dueAt) return ''
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return ''
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000)
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1) return `${diffDays}d left`
  return `${Math.abs(diffDays)}d over`
}

export function isOpenTaskStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'pending' || s === 'in_progress'
}

export function isTaskOverdueRow(task) {
  if (!task || !isOpenTaskStatus(task.status)) return false
  if (typeof task.isOverdue === 'boolean') return task.isOverdue
  if (!task.dueAt) return false
  const t = new Date(task.dueAt).getTime()
  if (Number.isNaN(t)) return false
  return t < Date.now()
}

export function isSubtaskOverdueRow(parent, subtask) {
  if (!parent || !subtask || subtask.done) return false
  return isTaskOverdueRow(parent)
}

export function computeTaskProgress(task) {
  if (!task) return { pct: 0, label: '—' }
  if (task.status === 'completed') return { pct: 100, label: 'Done' }
  if (task.status === 'cancelled') return { pct: 0, label: 'Cancelled' }
  const subs = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subs.length === 0) return { pct: 0, label: 'No checklist' }
  const done = subs.filter((s) => s.done).length
  const pct = Math.round((done / subs.length) * 100)
  return { pct, label: `${done}/${subs.length}` }
}

export function buildTaskSections(rows, groupBy) {
  if (groupBy === 'priority') {
    const byPri = { urgent: [], high: [], medium: [], low: [] }
    for (const t of rows) {
      const p = String(t.priority || 'medium').toLowerCase()
      const key = byPri[p] != null ? p : 'medium'
      byPri[key].push(t)
    }
    return PRIORITY_SECTIONS.map((meta) => ({ ...meta, tasks: byPri[meta.id] || [], count: (byPri[meta.id] || []).length }))
  }
  const byStatus = { pending: [], in_progress: [], completed: [], cancelled: [] }
  for (const t of rows) {
    const key = t.status && byStatus[t.status] != null ? t.status : 'pending'
    byStatus[key].push(t)
  }
  return STATUS_SECTIONS.map((meta) => ({ ...meta, tasks: byStatus[meta.id] || [], count: (byStatus[meta.id] || []).length }))
}
