import { randomUUID } from 'node:crypto'

/**
 * DROP-IN REPLACEMENT for src/middleware/errorHandler.js
 *
 * Goal (your requirement #5): no request ever answers with a vague
 * "Something went wrong". Every known failure class is translated into a
 * stable machine code + a human sentence that says what is wrong and, where
 * possible, which field caused it. Unknown failures return a requestId the
 * user can quote, and the full detail is in the server log under that id.
 *
 * Response envelope is UNCHANGED: { success:false, error:{ code, message, details? } }
 * so neither client needs any change to keep working — they just start
 * receiving better messages. (`requestId` is an additive key.)
 */

const SEQUELIZE_FK_HINT =
  'A related record this refers to does not exist or was deleted. Refresh and try again.'

/** field path → readable label, e.g. "customFields.budget" → "Budget" */
function fieldLabel(path) {
  const last = String(path || '').split('.').pop() || ''
  return last
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

/** Joi ValidationError → { message, details:[{field,message}] } */
function fromJoi(err) {
  const details = (err.details || []).map((d) => ({
    field: d.path?.join('.') || d.context?.key || '',
    message: d.message.replace(/"/g, ''),
  }))
  const first = details[0]
  return {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: first
      ? `${fieldLabel(first.field)}: ${first.message}`
      : 'Some fields are invalid. Please review and try again.',
    details,
  }
}

/** Sequelize errors → precise user-facing failures */
function fromSequelize(err) {
  switch (err.name) {
    case 'SequelizeUniqueConstraintError': {
      const item = err.errors?.[0]
      const label = fieldLabel(item?.path)
      return {
        status: 409,
        code: 'DUPLICATE',
        message: item?.path
          ? `${label} "${item.value}" is already in use. Use a different ${label.toLowerCase()}.`
          : 'This record already exists.',
        details: (err.errors || []).map((e) => ({ field: e.path, message: e.message })),
      }
    }
    case 'SequelizeValidationError': {
      const item = err.errors?.[0]
      return {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: item
          ? `${fieldLabel(item.path)}: ${item.message}`
          : 'Some fields are invalid.',
        details: (err.errors || []).map((e) => ({ field: e.path, message: e.message })),
      }
    }
    case 'SequelizeForeignKeyConstraintError':
      return { status: 400, code: 'INVALID_REFERENCE', message: SEQUELIZE_FK_HINT }
    case 'SequelizeDatabaseError': {
      const sqlMsg = err.parent?.sqlMessage || ''
      if (/Data too long/i.test(sqlMsg)) {
        return {
          status: 400,
          code: 'VALUE_TOO_LONG',
          message: 'One of the values is too long for this field. Shorten it and try again.',
        }
      }
      if (/Incorrect .* value/i.test(sqlMsg)) {
        return {
          status: 400,
          code: 'INVALID_VALUE',
          message: 'One of the values has the wrong format for this field.',
        }
      }
      return null // fall through to generic 500 path (logged with requestId)
    }
    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeHostNotFoundError':
    case 'SequelizeConnectionTimedOutError':
      return {
        status: 503,
        code: 'DB_UNAVAILABLE',
        message: 'The database is temporarily unreachable. Please try again in a moment.',
      }
    case 'SequelizeTimeoutError':
      return {
        status: 504,
        code: 'DB_TIMEOUT',
        message: 'The request took too long. Try a narrower filter or try again.',
      }
    default:
      return null
  }
}

/** Errors thrown before the route (body parser, multer, auth libs) */
function fromInfra(err) {
  // express.json() parse failure
  if (err.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'The request body is not valid JSON.' }
  }
  if (err.type === 'entity.too.large') {
    return {
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request is too large. Reduce the payload or attachment size.',
    }
  }
  // multer
  if (err.name === 'MulterError') {
    const map = {
      LIMIT_FILE_SIZE: 'The file is too large.',
      LIMIT_FILE_COUNT: 'Too many files in one upload.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field in the upload.',
    }
    return {
      status: 400,
      code: `UPLOAD_${err.code || 'ERROR'}`,
      message: map[err.code] || `Upload failed: ${err.message}`,
    }
  }
  // jsonwebtoken (when thrown outside requireAuth's own catch)
  if (err.name === 'TokenExpiredError') {
    return { status: 401, code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please sign in again.' }
  }
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, code: 'UNAUTHORIZED', message: 'Invalid session. Please sign in again.' }
  }
  return null
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // 1) Errors thrown intentionally by services with a public shape win.
  //    (status/code/publicMessage pattern already used across the codebase,
  //     and the httpError() helper in src/utils/httpError.js)
  if (err.publicMessage || (err.status && err.status < 500)) {
    return res.status(err.status || 400).json({
      success: false,
      error: {
        code: err.code || 'REQUEST_ERROR',
        message: err.publicMessage || err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  // 2) Known failure classes → precise translation.
  const translated =
    (err.isJoi ? fromJoi(err) : null) || fromSequelize(err) || fromInfra(err)

  if (translated) {
    if (translated.status >= 500) {
      // eslint-disable-next-line no-console
      console.error('[api]', req.method, req.originalUrl, translated.code, err.message)
    }
    return res.status(translated.status).json({
      success: false,
      error: {
        code: translated.code,
        message: translated.message,
        ...(translated.details ? { details: translated.details } : {}),
      },
    })
  }

  // 3) Truly unknown → 500 with a correlatable requestId; details go to the
  //    log, never to the client (in production).
  const requestId = randomUUID().slice(0, 8)
  // eslint-disable-next-line no-console
  console.error(
    `[api][${requestId}]`,
    req.method,
    req.originalUrl,
    err.name || 'Error',
    err.message,
    process.env.NODE_ENV !== 'production' ? `\n${err.stack}` : '',
  )
  const dev = process.env.NODE_ENV !== 'production'
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message: `Something failed on our side. Quote error id ${requestId} when reporting this.`,
      requestId,
      ...(dev ? { devHint: err.parent?.sqlMessage || err.message } : {}),
    },
  })
}
