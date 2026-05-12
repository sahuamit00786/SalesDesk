import multer from 'multer'
import { Router } from 'express'

import * as ctrl from '../controllers/transcriptionController.js'

const upload = multer({
  dest: 'recordings/',
})

const router = Router()

router.post(
  '/upload',
  upload.single('audio'),
  ctrl.uploadTranscription
)

export default router