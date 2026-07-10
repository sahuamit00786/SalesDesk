import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const SystemEmailTemplate = sequelize.define(
  'SystemEmailTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    /** null = would-be system default (unused today — code-level builders are the default; reserved for future). */
    companyId: { type: DataTypes.UUID, allowNull: true, field: 'company_id' },
    eventType: { type: DataTypes.STRING(80), allowNull: false, field: 'event_type' },
    subjectTemplate: { type: DataTypes.STRING(500), allowNull: false, field: 'subject_template' },
    bodyHtmlTemplate: { type: DataTypes.TEXT('long'), allowNull: false, field: 'body_html_template' },
    /** Array of { key, label, sample } describing supported {{tokens}} for the editor's variable picker. */
    variablesSchema: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'variables_schema' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    updatedBy: { type: DataTypes.CHAR(36), allowNull: true, field: 'updated_by' },
  },
  {
    tableName: 'system_email_templates',
    timestamps: true,
    indexes: [{ fields: ['company_id', 'event_type'] }],
  },
)
