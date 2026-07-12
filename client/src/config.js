export const API_BASE_URL = 'https://api-leadfin.upgrowventures.com/api/v1'

// export const API_BASE_URL = 'http://localhost:4000/api/v1'

// Socket.IO connects to the server origin, not the /api/v1 REST path.
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
