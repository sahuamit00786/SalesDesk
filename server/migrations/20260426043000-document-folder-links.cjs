'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_folder_links', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'documents', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      folder_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'folders', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('document_folder_links', ['document_id', 'folder_id'], {
      unique: true,
      name: 'document_folder_links_document_folder_unique',
    })
    await queryInterface.addIndex('document_folder_links', ['folder_id'], {
      name: 'document_folder_links_folder_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('document_folder_links', 'document_folder_links_folder_idx')
    await queryInterface.removeIndex('document_folder_links', 'document_folder_links_document_folder_unique')
    await queryInterface.dropTable('document_folder_links')
  },
}
