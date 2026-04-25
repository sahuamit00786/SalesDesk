const path = require('path')

// Align with server/loadEnv.js: repo-root `.env` (parent of `server/`)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
}

module.exports = {
  development: { ...common },
  test: { ...common },
  production: { ...common },
}
