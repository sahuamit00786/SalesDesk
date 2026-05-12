import { Router } from 'express'
import * as ctrl from '../controllers/meetingController.js'

const router = Router()

router.get('/bot-requirements', ctrl.getMeetingBotRequirements)
router.post('/', ctrl.createMeeting)
router.get('/', ctrl.getMeetings)
router.patch('/:id/bot-consent', ctrl.patchMeetingBotConsent)
router.get('/:id', ctrl.getMeeting)
router.patch('/:id', ctrl.updateMeeting)
router.delete('/:id', ctrl.deleteMeeting)

// router.post('/:id/join',requireAuth,ctrl.joinMeeting)
// router.post('/:id/cancel',requireAuth,ctrl.cancelMeeting)
// router.post('/:id/reschedule',requireAuth,ctrl.rescheduleMeeting)

export default router