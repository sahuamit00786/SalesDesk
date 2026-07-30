import { verifyAccessToken } from '../services/tokenService.js'
import { User, CompanyRole } from '../models/index.js'

/**
 * SECURITY FIX (§6.3 of the bug audit) — access tokens could not be revoked.
 *
 * requireAuth used to trust the JWT's claims wholesale for the full 15-minute access
 * window: no DB lookup, no isActive check, no version check. A deactivated/fired user,
 * a demoted admin, or someone removed from a workspace kept full API access — with
 * isCompanyAdmin still true in their case — until the token happened to expire.
 *
 * Now every request re-checks isActive and a version counter (the same
 * refreshTokenVersion column already bumped on password change / logout-all) against
 * the live User row, and privilege-bearing fields (isCompanyAdmin, companyRoleId,
 * userRoleKind) are read fresh from the DB rather than from the (possibly stale) token.
 */
export async function requireAuth(req, res, next) {
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
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'email', 'companyId', 'companyRoleId', 'isCompanyAdmin', 'isActive', 'refreshTokenVersion'],
      include: [{ model: CompanyRole, as: 'companyRole', attributes: ['userRoleKind'] }],
    })

    const tokenVersion = Number(decoded.rtv) || 0
    const currentVersion = Number(user?.refreshTokenVersion) || 0
    if (!user || !user.isActive || tokenVersion !== currentVersion) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      })
    }

    req.user = {
      id: String(user.id),
      email: user.email,
      role: user.isCompanyAdmin ? 'company_admin' : 'member',
      companyRoleId: user.companyRoleId ?? null,
      userRoleKind: user.companyRole?.userRoleKind ?? null,
      isCompanyAdmin: Boolean(user.isCompanyAdmin),
      companyId: user.companyId ?? null,
    }
    return next()
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    })
  }
}
