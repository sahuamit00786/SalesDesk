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

const _isDev = process.env.NODE_ENV !== 'production'
const _clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim())
const _allowedOrigins = new Set([
  ..._clientOrigins,
  ...(_isDev ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'] : []),
])

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
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use('/uploads', express.static(path.join(appRoot, 'uploads')))

app.use(
  '/pdfs',
  express.static(
    path.join(appRoot, 'pdfs')
  )
)

app.use(
  '/recordings',
  express.static(
    path.join(appRoot, 'recordings')
  )
)

app.use('/api/v1', v1)
app.use('/api/public', cors({ origin: true, credentials: false }), publicRoutes)
app.get('/embed/form.js', cors({ origin: true, credentials: false }), publicFormController.embedScript)
app.get('/f/:token', cors({ origin: true, credentials: false }), publicFormController.hostedFormPage)

app.use(errorHandler)

export default app
