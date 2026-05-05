import { Router } from 'express'
import * as ctrl from '../controllers/googleController.js'

const router = Router()

// Google OAuth callback
router.get('/callback', ctrl.googleCallback)

export default router