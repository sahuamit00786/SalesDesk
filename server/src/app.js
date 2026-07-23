import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import v1 from './routes/v1/index.js'
import publicRoutes from './routes/publicRoutes.js'
import * as publicFormController from './controllers/publicFormController.js'
import { errorHandler } from './middleware/errorHandler.js'
import { auditLog } from './middleware/auditLog.js'
import { allowedOrigins as _allowedOrigins } from './config/corsOrigins.js'

const app = express()
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}


app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || randomUUID()
  res.setHeader('X-Request-Id', id)
  req.id = id
  next()
})

app.use(helmet())

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = server-to-server / same-origin request — always allow
      if (!origin) return callback(null, true)
      if (_allowedOrigins.has(origin)) return callback(null, true)
      return callback(new Error(`CORS: origin '${origin}' is not allowed`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
const staticAssetHeaders = helmet.crossOriginResourcePolicy({ policy: 'cross-origin' })

app.use('/uploads', staticAssetHeaders, express.static(path.join(appRoot, 'uploads')))

app.use(
  '/pdfs',
  staticAssetHeaders,
  express.static(
    path.join(appRoot, 'pdfs')
  )
)

app.use('/api/v1', auditLog, v1)
app.use('/api/public', cors({ origin: true, credentials: false }), publicRoutes)
app.get('/embed/form.js', cors({ origin: true, credentials: false }), publicFormController.embedScript)
app.get('/f/:token', cors({ origin: true, credentials: false }), publicFormController.hostedFormPage)

app.use(errorHandler)

export default app
