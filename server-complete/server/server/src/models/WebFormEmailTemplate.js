import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const WebFormEmailTemplate = sequelize.define(
  'WebFormEmailTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    name: { type: DataTypes.STRING(140), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT('long'), allowNull: false },
    variables: { type: DataTypes.JSON, allowNull: false, defaultValue: ['name', 'email', 'form_name', 'submission_date'] },
  },
  { tableName: 'web_form_email_templates', timestamps: true },
)
