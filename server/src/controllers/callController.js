import * as callService from '../services/callService.js'

function workspaceIdOf(req) {
  return req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId || null
}

export async function createCall(req, res, next) {
  try {
    const call = await callService.createCall(req.user, req.body, workspaceIdOf(req))
    return res.status(201).json({ success: true, data: call })
  } catch (err) {
    next(err)
  }
}

export async function getCalls(req, res, next) {
  try {
    const filters = { ...req.query, workspaceId: workspaceIdOf(req) }
    const result = await callService.getCalls(req.user, filters)
    res.json({ success: true, data: result.data, meta: result.meta })
  } catch (err) {
    next(err)
  }
}

export async function getCallById(req, res, next) {
  try {
    const data = await callService.getCallById(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function updateCall(req, res, next) {
  try {
    const data = await callService.updateCall(req.user, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function deleteCall(req, res, next) {
  try {
    await callService.deleteCall(req.user, req.params.id)
    res.json({ success: true, message: 'Call deleted' })
  } catch (err) {
    next(err)
  }
}

export async function convertCall(req, res, next) {
  try {
    const data = await callService.convertCall(req.user, req.params.id, workspaceIdOf(req), req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function bulkSyncCalls(req, res, next) {
  try {
    const rows = Array.isArray(req.body?.calls) ? req.body.calls : null
    if (!rows || !rows.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'calls must be a non-empty array' },
      })
    }
    if (rows.length > 200) {
      return res.status(400).json({
        success: false,
        error: { code: 'BATCH_TOO_LARGE', message: 'Sync at most 200 calls per request' },
      })
    }
    const result = await callService.bulkSyncCalls(req.user, rows, workspaceIdOf(req))
    return res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
