import { Op } from 'sequelize'
import { LeadTask } from '../models/LeadTask.js'
import { LeadTaskSubtask } from '../models/LeadTaskSubtask.js'

/**
 * Pending → in_progress when start/due has passed (unless user opted out via skipTimeAutoInProgress).
 * Mutates Sequelize task rows in memory after DB update.
 */
export async function promotePendingTasksByDueOrStart(tasks, { companyId, workspaceId }) {
  if (!Array.isArray(tasks) || !tasks.length || !companyId || !workspaceId) return
  const now = Date.now()
  const ids = []
  for (const t of tasks) {
    if (t.status !== 'pending') continue
    if (t.skipTimeAutoInProgress) continue
    const anchor = t.startAt || t.dueAt
    if (!anchor) continue
    const ts = new Date(anchor).getTime()
    if (!Number.isNaN(ts) && ts <= now) ids.push(t.id)
  }
  if (!ids.length) return
  await LeadTask.update(
    { status: 'in_progress' },
    {
      where: {
        id: { [Op.in]: ids },
        companyId,
        workspaceId,
        status: 'pending',
        skipTimeAutoInProgress: false,
      },
    },
  )
  for (const t of tasks) {
    if (ids.includes(t.id)) t.status = 'in_progress'
  }
}

function groupTasksByCompanyWorkspace(tasks) {
  const map = new Map()
  for (const t of tasks) {
    const cid = t.companyId
    const wid = t.workspaceId
    if (!cid || !wid) continue
    const key = `${cid}\0${wid}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(t)
  }
  return [...map.values()]
}

/** Run time-based promotion for arbitrary task lists (e.g. lead list / all tasks). */
export async function promotePendingTasksByDueOrStartMany(tasks) {
  for (const group of groupTasksByCompanyWorkspace(tasks)) {
    await promotePendingTasksByDueOrStart(group, {
      companyId: group[0].companyId,
      workspaceId: group[0].workspaceId,
    })
  }
}

/**
 * If task is pending and at least one subtask is done → in_progress (always; overrides skip_time flag).
 * Mutates `taskRow` when it is a Sequelize instance with .set / fields.
 */
export async function maybePromotePendingTaskFromSubtasks(taskRow) {
  if (!taskRow?.id) return
  if (taskRow.status !== 'pending') return
  const doneCount = await LeadTaskSubtask.count({
    where: { leadTaskId: taskRow.id, done: true },
  })
  if (!doneCount) return
  const [affected] = await LeadTask.update(
    { status: 'in_progress', skipTimeAutoInProgress: false },
    {
      where: {
        id: taskRow.id,
        companyId: taskRow.companyId,
        workspaceId: taskRow.workspaceId,
        status: 'pending',
      },
    },
  )
  if (affected > 0 && typeof taskRow.reload === 'function') await taskRow.reload()
}
