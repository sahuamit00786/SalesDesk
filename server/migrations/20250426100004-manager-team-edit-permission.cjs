'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    // Manager `team:edit` is seeded in 20250426100000. This migration remains as a no-op for
    // environments that already recorded it in SequelizeMeta.
  },

  async down() {},
}
