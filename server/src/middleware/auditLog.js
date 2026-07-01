import { AuditLog } from '../models/index.js'

// Infer resource type and id from the request path
function inferResource(req) {
  const parts = req.path.replace(/^\//, '').split('/')
  // e.g. /leads/abc-123 → { type: 'lead', id: 'abc-123' }
  const resourceMap = {
    leads: 'lead', deals: 'deal', opportunities: 'opportunity',
    meetings: 'meeting', tasks: 'task', invoices: 'invoice',
    quotations: 'quotation', campaigns: 'campaign', workflows: 'workflow',
    users: 'user', leave: 'leave_request', documents: 'document',
  }
  const type = resourceMap[parts[0]] || parts[0]
  const id = parts[1] && /^[0-9a-f-]{36}$/i.test(parts[1]) ? parts[1] : null
  return { type, id }
}

function inferAction(method, path) {
  if (method === 'POST') return path.includes('/delete') ? 'DELETE' : 'CREATE'
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE'
  if (method === 'DELETE') return 'DELETE'
  return method
}

export function auditLog(req, res, next) {
  // Only log mutating operations (not GETs)
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next()
  }

  const originalJson = res.json.bind(res)
  res.json = function(body) {
    // Fire-and-forget audit log (non-fatal)
    if (res.statusCode < 400 && req.user) {
      const { type, id } = inferResource(req)
      AuditLog.create({
        companyId: req.user.companyId,
        userId: req.user.id,
        userEmail: req.user.email,
        action: `${inferAction(req.method, req.path)}_${type.toUpperCase()}`,
        resourceType: type,
        resourceId: id,
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
      }).catch(() => {}) // Never block the response
    }
    return originalJson(body)
  }

  next()
}
