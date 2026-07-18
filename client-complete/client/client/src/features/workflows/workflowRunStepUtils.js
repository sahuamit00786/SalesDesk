/**
 * Collapse API steps to one summary per graph node id (last row per node wins — server order is chronological).
 * @param {Array<{ nodeId?: string, node_id?: string, status?: string, errorMessage?: string, error_message?: string, startedAt?: string, started_at?: string, finishedAt?: string, finished_at?: string }>} steps
 * @returns {Record<string, { status: string, errorMessage?: string | null, startedAt?: string | null, finishedAt?: string | null }>}
 */
export function stepsToByNodeId(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return {}
  const acc = {}
  for (const raw of steps) {
    const nodeId = String(raw.nodeId ?? raw.node_id ?? '').trim()
    if (!nodeId) continue
    acc[nodeId] = {
      status: String(raw.status || ''),
      errorMessage: raw.errorMessage ?? raw.error_message ?? null,
      startedAt: raw.startedAt ?? raw.started_at ?? null,
      finishedAt: raw.finishedAt ?? raw.finished_at ?? null,
    }
  }
  return acc
}
