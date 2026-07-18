import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const EmailSequenceStep = sequelize.define(
  'EmailSequenceStep',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sequenceId: { type: DataTypes.UUID, allowNull: false, field: 'sequence_id' },
    stepOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'step_order' },
    delayDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'delay_days' },
    delayHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'delay_hours' },
    templateId: { type: DataTypes.UUID, allowNull: true, field: 'template_id' },
    subject: { type: DataTypes.STRING(300), allowNull: true },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: true, field: 'body_html' },
  },
  {
    tableName: 'email_sequence_steps',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['sequence_id', 'step_order'] },
    ],
  },
)
