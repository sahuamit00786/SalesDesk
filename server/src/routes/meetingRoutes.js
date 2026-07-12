import { Router } from 'express'
import * as ctrl from '../controllers/meetingController.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = Router()

// Mount point (routes/v1/index.js) already applies loadPermissions + 'engage.meetings':'view'
// for the whole sub-router; these add the write-level distinction on top.
router.post('/', requirePermission('engage.meetings', 'create'), ctrl.createMeeting)
router.get('/', ctrl.getMeetings)
router.get('/:id', ctrl.getMeeting)
router.patch('/:id', requirePermission('engage.meetings', 'update'), ctrl.updateMeeting)
router.delete('/:id', requirePermission('engage.meetings', 'delete'), ctrl.deleteMeeting)

// router.post('/:id/join',requireAuth,ctrl.joinMeeting)
// router.post('/:id/cancel',requireAuth,ctrl.cancelMeeting)
// router.post('/:id/reschedule',requireAuth,ctrl.rescheduleMeeting)

export default router