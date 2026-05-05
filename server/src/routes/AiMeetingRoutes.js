import {Router} from 'express'
import * as ctrl from '../controllers/aiMeetingController.js'

const router=Router()

router.post('/:id/summarize',ctrl.summarizeMeeting)
router.post('/:id/actions',ctrl.actionItems)
router.post('/:id/sentiment',ctrl.sentiment)

export default router