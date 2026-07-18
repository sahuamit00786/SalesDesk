'use strict'

const { randomUUID } = require('node:crypto')

/**
 * Fixes the core permission-enforcement bug: menu_master.resource was a shared,
 * mostly-dead string ('leads'/'reports'/'team'/'settings'/'documents'/NULL) instead
 * of a unique-per-menu key, so most sidebar menus silently piggybacked on whichever
 * of those 5 strings a route happened to check (or nothing at all, e.g. HR).
 *
 * Fix: resource := key (already unique per menu_master row) for every row.
 * Any future menu-seeding migration must insert new rows with resource = key,
 * not a placeholder string, or this bug will regenerate itself.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (!tables.includes('menu_master')) return

    await queryInterface.sequelize.query(
      'UPDATE menu_master SET resource = `key` WHERE resource IS NULL OR resource <> `key`',
    )

    // Two API-facing sub-features have no menu_master row yet (no NAV_SECTIONS entry of
    // their own) but are now gated by requirePermission — add rows for them.
    const now = new Date()
    const rowsToAdd = [
      { key: 'settings.billing_profile', label: 'Billing profile', route: '/billing-profile', parentKey: 'settings' },
      { key: 'automate.email_sequences', label: 'Email sequences', route: '/email-sequences', parentKey: 'automate' },
    ]

    for (const entry of rowsToAdd) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM menu_master WHERE `key` = :key LIMIT 1',
        { replacements: { key: entry.key } },
      )
      if (existing?.length) continue

      const [parentRows] = await queryInterface.sequelize.query(
        'SELECT id FROM menu_master WHERE `key` = :parentKey LIMIT 1',
        { replacements: { parentKey: entry.parentKey } },
      )
      const parentId = parentRows?.[0]?.id || null
      const [maxSortRows] = await queryInterface.sequelize.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
      )
      const sortOrder = Number(maxSortRows[0]?.maxSort || 0) + 1
      await queryInterface.bulkInsert('menu_master', [
        {
          id: randomUUID(),
          key: entry.key,
          label: entry.label,
          route: entry.route,
          parent_id: parentId,
          sort_order: sortOrder,
          is_active: true,
          resource: entry.key,
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },

  async down() {
    // Non-destructive: leaving resource=key in place on rollback is safe (it's a superset
    // of correctness vs the old collapsed values). Not reverting the billing_profile row either.
  },
}
