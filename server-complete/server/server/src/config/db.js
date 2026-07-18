import { Sequelize } from 'sequelize'

const database = process.env.DB_NAME
const username = process.env.DB_USER
const password = process.env.DB_PASSWORD ?? ''
const host = process.env.DB_HOST ?? '127.0.0.1'
const port = Number(process.env.DB_PORT) || 3306

export const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
})
