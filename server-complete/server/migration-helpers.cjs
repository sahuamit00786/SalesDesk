'use strict'

/**
 * MySQL: skip addIndex when the index name already exists (partial / restored DBs).
 */
async function indexExists(queryInterface, tableName, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 AS ok
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = :tableName
       AND index_name = :indexName
     LIMIT 1`,
    { replacements: { tableName, indexName } },
  )
  return Array.isArray(rows) && rows.length > 0
}

async function addIndexIfMissing(queryInterface, tableName, columns, options) {
  const name = options?.name
  if (!name) throw new Error('addIndexIfMissing requires options.name')
  if (await indexExists(queryInterface, tableName, name)) return
  await queryInterface.addIndex(tableName, columns, options)
}

module.exports = { indexExists, addIndexIfMissing }
