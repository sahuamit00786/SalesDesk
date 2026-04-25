import { Router } from 'express'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { requireCompany } from '../../middleware/requireCompany.js'
import { requirePermission } from '../../middleware/requirePermission.js'
import { loadPermissions } from '../../middleware/loadPermissions.js'
import * as authController from '../../controllers/authController.js'
import * as analyticsController from '../../controllers/analyticsController.js'
import * as leadsController from '../../controllers/leadsController.js'
import * as companyController from '../../controllers/companyController.js'
import * as workspaceController from '../../controllers/workspaceController.js'
import * as teamController from '../../controllers/teamController.js'

const router = Router()

const authLimiter = rateLimit({ routeKey: 'auth', windowSec: 60, max: 30 })
const apiLimiter = rateLimit({ routeKey: 'api', windowSec: 60, max: 200 })

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, meta: {} })
})

router.post('/auth/register', authLimiter, authController.register)
router.post('/auth/verify-email', authLimiter, authController.verifyEmail)
router.post('/auth/resend-verification', authLimiter, authController.resendVerification)
router.post('/auth/login', authLimiter, authController.login)
router.post('/auth/refresh', authLimiter, authController.refresh)
router.post('/auth/invitations/accept', authLimiter, teamController.acceptInvitation)
router.post('/auth/sso/google', authLimiter, teamController.googleSsoPlaceholder)
router.get('/auth/me', requireAuth, apiLimiter, authController.me)
router.patch('/company/me', requireAuth, apiLimiter, companyController.patchMyCompany)

router.get('/workspaces', requireAuth, apiLimiter, workspaceController.listWorkspaces)
router.post('/workspaces', requireAuth, apiLimiter, workspaceController.createWorkspace)
router.patch('/workspaces/:id', requireAuth, apiLimiter, workspaceController.patchWorkspace)
router.delete('/workspaces/:id', requireAuth, apiLimiter, workspaceController.deleteWorkspace)

router.get('/analytics/dashboard', requireAuth, apiLimiter, analyticsController.dashboardStats)

router.get(
  '/leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  leadsController.list,
)

router.get(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listRoles,
)
router.get(
  '/team/menus',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.listMenuMaster,
)
router.post(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.createCompanyRole,
)
router.patch(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchCompanyRole,
)
router.delete(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deleteCompanyRole,
)
router.get(
  '/team/permissions',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings', 'admin'),
  teamController.getPermissionMatrix,
)
router.get(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listInvitations,
)
router.post(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.createInvitation,
)
router.delete(
  '/team/invitations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.cancelInvitation,
)
router.get(
  '/team/users',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listCompanyUsers,
)
router.patch(
  '/team/users/:id/role',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchUserRole,
)
router.get(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.getUserWorkspaces,
)
router.put(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.replaceUserWorkspaces,
)
router.post(
  '/team/users/:id/deactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deactivateUser,
)
router.post(
  '/team/users/:id/reassign-leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.reassignUserLeads,
)
router.get(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listTeams,
)
router.post(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.createTeam,
)
router.patch(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.patchTeam,
)
router.delete(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deleteTeam,
)
router.post(
  '/team/teams/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.addTeamMember,
)
router.delete(
  '/team/teams/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.removeTeamMember,
)

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

export default router
