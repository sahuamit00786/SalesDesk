'use strict'

const { indexExists, addIndexIfMissing } = require('../migration-helpers.cjs')

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users')
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    const tables = await queryInterface.showAllTables()

    if (!tables.includes('folders')) {
      await queryInterface.createTable('folders', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        name: { type: Sequelize.STRING(180), allowNull: false },
        parent_folder_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'folders', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        entity_type: { type: Sequelize.ENUM('lead', 'contact', 'company', 'deal'), allowNull: true },
        entity_id: { type: Sequelize.STRING(64), allowNull: true },
        created_by: { type: userFkType, allowNull: false },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }

    if (!tables.includes('documents')) {
      await queryInterface.createTable('documents', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        name: { type: Sequelize.STRING(255), allowNull: false },
        file_type: { type: Sequelize.STRING(120), allowNull: false },
        file_size: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        file_path: { type: Sequelize.STRING(1024), allowNull: false },
        uploaded_by: { type: userFkType, allowNull: false },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        is_current: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        folder_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'folders', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        source: { type: Sequelize.ENUM('manual', 'gmail'), allowNull: false, defaultValue: 'manual' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }

    if (!tables.includes('document_links')) {
      await queryInterface.createTable('document_links', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        document_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'documents', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        entity_type: { type: Sequelize.ENUM('lead', 'contact', 'company', 'deal'), allowNull: false },
        entity_id: { type: Sequelize.STRING(64), allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }

    await addIndexIfMissing(queryInterface, 'document_links', ['document_id', 'entity_type', 'entity_id'], {
      unique: true,
      name: 'document_links_document_entity_unique',
    })
    await addIndexIfMissing(queryInterface, 'document_links', ['entity_type', 'entity_id'], {
      name: 'document_links_entity_lookup_idx',
    })
    await addIndexIfMissing(queryInterface, 'documents', ['workspace_id', 'created_at'], {
      name: 'documents_workspace_created_at_idx',
    })
    await addIndexIfMissing(queryInterface, 'documents', ['workspace_id', 'file_type'], {
      name: 'documents_workspace_file_type_idx',
    })
    await addIndexIfMissing(queryInterface, 'documents', ['workspace_id', 'folder_id', 'name'], {
      name: 'documents_workspace_folder_name_idx',
    })
    await addIndexIfMissing(queryInterface, 'folders', ['workspace_id', 'parent_folder_id'], {
      name: 'folders_workspace_parent_idx',
    })

    if (!tables.includes('document_shares')) {
      await queryInterface.createTable('document_shares', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        document_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'documents', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        recipient_email: { type: Sequelize.STRING(255), allowNull: false },
        token: { type: Sequelize.STRING(180), allowNull: false, unique: true },
        sent_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        first_opened_at: { type: Sequelize.DATE, allowNull: true },
        last_opened_at: { type: Sequelize.DATE, allowNull: true },
        total_open_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        total_time_spent_seconds: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()
    if (tables.includes('document_shares')) await queryInterface.dropTable('document_shares')
    if (tables.includes('folders') && (await indexExists(queryInterface, 'folders', 'folders_workspace_parent_idx'))) {
      await queryInterface.removeIndex('folders', 'folders_workspace_parent_idx')
    }
    if (tables.includes('documents')) {
      for (const idx of [
        'documents_workspace_folder_name_idx',
        'documents_workspace_file_type_idx',
        'documents_workspace_created_at_idx',
      ]) {
        if (await indexExists(queryInterface, 'documents', idx)) {
          await queryInterface.removeIndex('documents', idx)
        }
      }
    }
    if (tables.includes('document_links')) {
      for (const idx of ['document_links_entity_lookup_idx', 'document_links_document_entity_unique']) {
        if (await indexExists(queryInterface, 'document_links', idx)) {
          await queryInterface.removeIndex('document_links', idx)
        }
      }
    }
    if (tables.includes('document_links')) await queryInterface.dropTable('document_links')
    if (tables.includes('documents')) await queryInterface.dropTable('documents')
    if (tables.includes('folders')) await queryInterface.dropTable('folders')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_document_links_entity_type;')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_folders_entity_type;')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_documents_source;')
  },
}
