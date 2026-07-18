'use strict'

const { randomUUID } = require('node:crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const usersDesc = await queryInterface.describeTable('users').catch(() => null)
    const usersIdType = String(usersDesc?.id?.type || '').toLowerCase()
    const userFkType = usersIdType.includes('int') ? Sequelize.INTEGER.UNSIGNED : Sequelize.UUID

    const tables = await queryInterface.showAllTables()

    if (!tables.includes('workspace_billing_profiles')) {
      await queryInterface.createTable('workspace_billing_profiles', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        legal_name: { type: Sequelize.STRING(240), allowNull: true },
        logo_url: { type: Sequelize.STRING(512), allowNull: true },
        tax_id_label: { type: Sequelize.STRING(64), allowNull: true },
        tax_id_value: { type: Sequelize.STRING(64), allowNull: true },
        address_line1: { type: Sequelize.STRING(255), allowNull: true },
        address_line2: { type: Sequelize.STRING(255), allowNull: true },
        city: { type: Sequelize.STRING(120), allowNull: true },
        state: { type: Sequelize.STRING(120), allowNull: true },
        postal_code: { type: Sequelize.STRING(32), allowNull: true },
        country: { type: Sequelize.STRING(2), allowNull: true },
        phone: { type: Sequelize.STRING(64), allowNull: true },
        email: { type: Sequelize.STRING(190), allowNull: true },
        website: { type: Sequelize.STRING(255), allowNull: true },
        bank_name: { type: Sequelize.STRING(160), allowNull: true },
        bank_account_number: { type: Sequelize.STRING(64), allowNull: true },
        bank_ifsc: { type: Sequelize.STRING(32), allowNull: true },
        bank_swift: { type: Sequelize.STRING(32), allowNull: true },
        upi_id: { type: Sequelize.STRING(120), allowNull: true },
        payment_link_url: { type: Sequelize.STRING(512), allowNull: true },
        payment_instructions: { type: Sequelize.TEXT, allowNull: true },
        signature_image_url: { type: Sequelize.STRING(512), allowNull: true },
        stamp_image_url: { type: Sequelize.STRING(512), allowNull: true },
        quotation_prefix: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'QT' },
        quotation_next_seq: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1001 },
        invoice_prefix: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'INV' },
        invoice_next_seq: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1001 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('workspace_billing_profiles', ['company_id'], {
        name: 'workspace_billing_profiles_company_idx',
      })
    }

    if (!tables.includes('quotation_templates')) {
      await queryInterface.createTable('quotation_templates', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(200), allowNull: false },
        code: { type: Sequelize.STRING(64), allowNull: false },
        category: { type: Sequelize.STRING(64), allowNull: true },
        default_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
        language: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'en' },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
        default_tax_type: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'none' },
        default_validity_days: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 30 },
        default_payment_terms: { type: Sequelize.TEXT, allowNull: true },
        watermark: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'none' },
        theme_color: { type: Sequelize.STRING(16), allowNull: true },
        font_family: { type: Sequelize.STRING(120), allowNull: true },
        layout_preset: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        section_settings: { type: Sequelize.JSON, allowNull: true },
        logo_override_url: { type: Sequelize.STRING(512), allowNull: true },
        accent_override: { type: Sequelize.STRING(16), allowNull: true },
        default_terms_blocks: { type: Sequelize.JSON, allowNull: true },
        default_notes: { type: Sequelize.TEXT, allowNull: true },
        show_sku: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        show_hsn: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        show_discount: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        show_tax_per_line: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        approval_rules: { type: Sequelize.JSON, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('quotation_templates', ['workspace_id', 'code'], {
        name: 'quotation_templates_workspace_code_uq',
        unique: true,
      })
    }

    if (!tables.includes('quotations')) {
      await queryInterface.createTable('quotations', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        quotation_template_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'quotation_templates', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        lead_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leads', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        owner_user_id: { type: userFkType, allowNull: true },
        quotation_number: { type: Sequelize.STRING(64), allowNull: false },
        issue_date: { type: Sequelize.DATEONLY, allowNull: false },
        expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
        reference: { type: Sequelize.STRING(120), allowNull: true },
        purchase_order_ref: { type: Sequelize.STRING(120), allowNull: true },
        customer_snapshot: { type: Sequelize.JSON, allowNull: false },
        subtotal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        discount_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        shipping: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        adjustment: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        grand_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        tax_breakdown: { type: Sequelize.JSON, allowNull: true },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
        status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'draft' },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        viewed_at: { type: Sequelize.DATE, allowNull: true },
        converted_invoice_id: { type: Sequelize.UUID, allowNull: true },
        pdf_storage_key: { type: Sequelize.STRING(512), allowNull: true },
        terms_snapshot: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        layout_preset: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        prepared_by_name: { type: Sequelize.STRING(160), allowNull: true },
        approval_status: { type: Sequelize.STRING(24), allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('quotations', ['workspace_id', 'quotation_number'], {
        name: 'quotations_workspace_number_uq',
        unique: true,
      })
      await queryInterface.addIndex('quotations', ['workspace_id', 'lead_id'], {
        name: 'quotations_workspace_lead_idx',
      })
    }

    if (!tables.includes('quotation_items')) {
      await queryInterface.createTable('quotation_items', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        quotation_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'quotations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sort_order: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
        name: { type: Sequelize.STRING(255), allowNull: false },
        sku: { type: Sequelize.STRING(120), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        hsn_sac: { type: Sequelize.STRING(32), allowNull: true },
        quantity: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 1 },
        unit_price: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
        discount_pct: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
        discount_amount: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
        tax_pct: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
        tax_type: { type: Sequelize.STRING(16), allowNull: true },
        line_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        billing_period: { type: Sequelize.STRING(64), allowNull: true },
        duration: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('quotation_items', ['quotation_id', 'sort_order'], {
        name: 'quotation_items_quotation_sort_idx',
      })
    }

    if (!tables.includes('invoice_templates')) {
      await queryInterface.createTable('invoice_templates', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(200), allowNull: false },
        code: { type: Sequelize.STRING(64), allowNull: false },
        template_type: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'general' },
        number_prefix: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'INV' },
        next_number: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1001 },
        default_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
        layout_preset: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        theme_style: { type: Sequelize.STRING(32), allowNull: true },
        auto_numbering: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        default_payment_terms: { type: Sequelize.TEXT, allowNull: true },
        section_settings: { type: Sequelize.JSON, allowNull: true },
        tax_profile: { type: Sequelize.JSON, allowNull: true },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('invoice_templates', ['workspace_id', 'code'], {
        name: 'invoice_templates_workspace_code_uq',
        unique: true,
      })
    }

    if (!tables.includes('invoices')) {
      await queryInterface.createTable('invoices', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        workspace_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        invoice_template_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'invoice_templates', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        quotation_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'quotations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        lead_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'leads', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        owner_user_id: { type: userFkType, allowNull: true },
        invoice_number: { type: Sequelize.STRING(64), allowNull: false },
        issue_date: { type: Sequelize.DATEONLY, allowNull: false },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        purchase_order_ref: { type: Sequelize.STRING(120), allowNull: true },
        reference: { type: Sequelize.STRING(120), allowNull: true },
        customer_snapshot: { type: Sequelize.JSON, allowNull: false },
        subtotal: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        discount_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        round_off: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        grand_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        tax_financial: { type: Sequelize.JSON, allowNull: true },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
        status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'draft' },
        payment_block_snapshot: { type: Sequelize.JSON, allowNull: true },
        terms_snapshot: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        layout_preset: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        amount_paid: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        pdf_storage_key: { type: Sequelize.STRING(512), allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('invoices', ['workspace_id', 'invoice_number'], {
        name: 'invoices_workspace_number_uq',
        unique: true,
      })
      await queryInterface.addIndex('invoices', ['workspace_id', 'lead_id'], {
        name: 'invoices_workspace_lead_idx',
      })
    }

    if (!tables.includes('invoice_items')) {
      await queryInterface.createTable('invoice_items', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        invoice_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'invoices', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sort_order: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
        name: { type: Sequelize.STRING(255), allowNull: false },
        sku: { type: Sequelize.STRING(120), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        hsn_sac: { type: Sequelize.STRING(32), allowNull: true },
        quantity: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 1 },
        unit_price: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
        discount_pct: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
        discount_amount: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
        tax_pct: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
        tax_type: { type: Sequelize.STRING(16), allowNull: true },
        line_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        service_period_start: { type: Sequelize.DATEONLY, allowNull: true },
        service_period_end: { type: Sequelize.DATEONLY, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('invoice_items', ['invoice_id', 'sort_order'], {
        name: 'invoice_items_invoice_sort_idx',
      })
    }

    if (!tables.includes('invoice_payments')) {
      await queryInterface.createTable('invoice_payments', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        invoice_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'invoices', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        paid_at: { type: Sequelize.DATE, allowNull: false },
        mode: { type: Sequelize.STRING(32), allowNull: true },
        reference: { type: Sequelize.STRING(120), allowNull: true },
        recorded_by_user_id: { type: userFkType, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE },
      })
      await queryInterface.addIndex('invoice_payments', ['invoice_id'], {
        name: 'invoice_payments_invoice_idx',
      })
    }

    // FK quotations.converted_invoice_id -> invoices.id (after both tables exist)
    const tablesAfter = await queryInterface.showAllTables()
    if (tablesAfter.includes('quotations') && tablesAfter.includes('invoices')) {
      try {
        await queryInterface.addConstraint('quotations', {
          fields: ['converted_invoice_id'],
          type: 'foreign key',
          name: 'quotations_converted_invoice_id_invoices_fk',
          references: { table: 'invoices', field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        })
      } catch {
        /* constraint may already exist on re-run */
      }
    }

    // Menu entries
    if (!tables.includes('menu_master')) return
    const now = new Date()
    const entries = [
      { key: 'main.quotations', label: 'Quotations', route: '/quotations' },
      { key: 'main.quotation_templates', label: 'Quotation templates', route: '/quotations/templates' },
      { key: 'main.invoices', label: 'Invoices', route: '/invoices' },
      { key: 'main.invoice_templates', label: 'Invoice templates', route: '/invoices/templates' },
    ]

    const [mainRows] = await queryInterface.sequelize.query("SELECT id FROM menu_master WHERE `key`='main' LIMIT 1")
    const parentId = mainRows[0]?.id || null
    const [maxSortRows] = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_master',
    )
    let sortBase = Number(maxSortRows[0]?.maxSort || 0)

    const insertedMenuIds = []
    for (const e of entries) {
      const [ex] = await queryInterface.sequelize.query('SELECT id FROM menu_master WHERE `key` = :key LIMIT 1', {
        replacements: { key: e.key },
      })
      if (ex.length) {
        insertedMenuIds.push({ id: ex[0].id })
        continue
      }
      sortBase += 1
      const menuId = randomUUID()
      insertedMenuIds.push({ id: menuId })
      await queryInterface.bulkInsert('menu_master', [
        {
          id: menuId,
          key: e.key,
          label: e.label,
          route: e.route,
          parent_id: parentId,
          sort_order: sortBase,
          is_active: true,
          resource: 'leads',
          action: 'view',
          created_at: now,
          updated_at: now,
        },
      ])
    }

    if (!tables.includes('company_roles') || !tables.includes('company_role_menus')) return
    const [roles] = await queryInterface.sequelize.query('SELECT id FROM company_roles')
    if (!roles.length) return

    const [menuRows] = await queryInterface.sequelize.query(
      "SELECT id FROM menu_master WHERE `key` IN ('main.quotations','main.quotation_templates','main.invoices','main.invoice_templates')",
    )
    for (const role of roles) {
      for (const m of menuRows) {
        const [linkExists] = await queryInterface.sequelize.query(
          'SELECT id FROM company_role_menus WHERE company_role_id = :roleId AND menu_id = :menuId LIMIT 1',
          { replacements: { roleId: role.id, menuId: m.id } },
        )
        if (linkExists.length) continue
        await queryInterface.bulkInsert('company_role_menus', [
          {
            id: randomUUID(),
            company_role_id: role.id,
            menu_id: m.id,
            can_view: true,
            can_edit: false,
            can_update: false,
            can_delete: false,
            created_at: now,
            updated_at: now,
          },
        ])
      }
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables()

    if (tables.includes('invoice_payments')) await queryInterface.dropTable('invoice_payments')
    if (tables.includes('invoice_items')) await queryInterface.dropTable('invoice_items')

    if (tables.includes('quotations')) {
      try {
        await queryInterface.removeConstraint('quotations', 'quotations_converted_invoice_id_invoices_fk')
      } catch {
        /* ignore */
      }
    }

    if (tables.includes('invoices')) await queryInterface.dropTable('invoices')
    if (tables.includes('invoice_templates')) await queryInterface.dropTable('invoice_templates')
    if (tables.includes('quotation_items')) await queryInterface.dropTable('quotation_items')
    if (tables.includes('quotations')) await queryInterface.dropTable('quotations')
    if (tables.includes('quotation_templates')) await queryInterface.dropTable('quotation_templates')
    if (tables.includes('workspace_billing_profiles')) await queryInterface.dropTable('workspace_billing_profiles')

    if (tables.includes('menu_master')) {
      await queryInterface.sequelize.query(
        "DELETE FROM menu_master WHERE `key` IN ('main.quotations','main.quotation_templates','main.invoices','main.invoice_templates')",
      )
    }
  },
}
