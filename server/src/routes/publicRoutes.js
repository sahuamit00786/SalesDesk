import { Router } from 'express'
import multer from 'multer'
import * as publicFormController from '../controllers/publicFormController.js'

const router = Router()
const upload = multer({
  dest: 'uploads/webforms',
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
})

router.get('/forms/:token', publicFormController.publicFormSchema)
router.post('/forms/:token/submit', upload.any(), publicFormController.submitForm)
router.post('/forms/:token/view', publicFormController.trackView)

export default router
