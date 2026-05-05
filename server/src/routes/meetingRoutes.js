import {Router} from 'express'
import * as ctrl from '../controllers/meetingController.js'
// import auth from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router=Router()

router.post('/',requireAuth,ctrl.createMeeting)
router.get('/',requireAuth,ctrl.getMeetings)
router.get('/:id', requireAuth, ctrl.getMeeting)
router.patch('/:id', requireAuth, ctrl.updateMeeting)
router.delete('/:id', requireAuth, ctrl.deleteMeeting)

// router.post('/:id/join',requireAuth,ctrl.joinMeeting)
// router.post('/:id/cancel',requireAuth,ctrl.cancelMeeting)
// router.post('/:id/reschedule',requireAuth,ctrl.rescheduleMeeting)

export default router