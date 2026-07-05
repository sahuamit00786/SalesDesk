function sequelizeDevHint(err) {
  if (process.env.NODE_ENV === 'production') return undefined
  const sql = err.parent?.sqlMessage || err.original?.sqlMessage
  if (sql) return sql
  if (err.name?.startsWith?.('Sequelize') && err.message) return err.message
  return undefined
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const code = err.code || 'INTERNAL'
  const devHint = sequelizeDevHint(err)

  let message = err.publicMessage || (status === 500 ? 'Something went wrong' : err.message)
  if (status === 500 && devHint && !err.publicMessage) {
    message = devHint
  }

  console.error('[debug-err]', req.method, req.originalUrl, status, code, err.message, '\n', err.stack)

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[api]', req.method, req.originalUrl, code, err.message, devHint || '')
    if (err.stack && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(err.stack)
    }
  }

  const details = status === 500 && process.env.NODE_ENV === 'production' ? undefined : err.details

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV !== 'production' && devHint ? { devHint } : {}),
    },
  })
}
