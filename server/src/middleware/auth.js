import { verifyAccessToken } from '../services/tokenService.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing token' },
    })
  }

  try {
    const decoded = verifyAccessToken(token)
    req.user = {
      id: String(decoded.sub),
      email: decoded.email,
      role: decoded.role,
      companyRoleId: decoded.companyRoleId ?? null,
      isCompanyAdmin: Boolean(decoded.isCompanyAdmin),
      companyId: decoded.companyId ?? null,
    }
    return next()
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    })
  }
}
