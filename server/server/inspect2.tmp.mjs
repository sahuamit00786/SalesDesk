import dotenv from 'dotenv'
dotenv.config({ path: './.env' })
const { sequelize } = await import('./src/config/db.js')
const [rows] = await sequelize.query(
  "SELECT c.id, c.workspace_id AS call_ws, l.workspace_id AS lead_ws FROM call_logs c LEFT JOIN leads l ON l.id=c.lead_id WHERE c.lead_id='2476cd38-cca0-4d6f-9acc-f23ee68db0ee'",
)
console.log(JSON.stringify(rows, null, 1))
await sequelize.close()
