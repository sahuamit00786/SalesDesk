import { Router } from 'express'
import * as ctrl from '../controllers/copilotController.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()
const copilotMessageLimiter = rateLimit({ routeKey: 'copilot-message', windowSec: 60, max: 20 })

router.post('/sessions', ctrl.createSessionHandler)
router.get('/sessions', ctrl.listSessions)
router.get('/sessions/:id/messages', ctrl.getSessionMessages)
router.post('/sessions/:id/messages', copilotMessageLimiter, ctrl.sendMessage)
router.delete('/sessions/:id', ctrl.deleteSession)

export default router
