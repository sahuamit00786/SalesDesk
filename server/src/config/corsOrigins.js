const isDev = process.env.NODE_ENV !== 'production'
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim())

export const allowedOrigins = new Set([
  ...clientOrigins,
  ...(isDev ? ['http://localhost:5173','http://localhost:5175', 'http://localhost:3000', 'http://127.0.0.1:5173'] : []),
])

/** Single origin to build outbound links (emails, invites) from. CLIENT_ORIGIN may list several allowed CORS origins comma-separated — this is always the first. */
export const primaryClientOrigin = clientOrigins[0].replace(/\/$/, '')

/**
 * Origin to navigate to when headlessly rendering a page (PDF export). CLIENT_ORIGIN often
 * lists the production domain first — in dev that would tell the headless browser to render
 * prod instead of the local Vite server, so prefer a localhost entry while developing.
 */
export const pdfRenderOrigin = (
  isDev ? clientOrigins.find((o) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(o)) || clientOrigins[0] : clientOrigins[0]
).replace(/\/$/, '')
