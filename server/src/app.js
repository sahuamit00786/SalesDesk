import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'
import v1 from './routes/v1/index.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

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
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/api/v1', v1)

app.use(errorHandler)

export default app
