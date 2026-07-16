import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const EmailSequenceEnrollment = sequelize.define(
  'EmailSequenceEnrollment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sequenceId: { type: DataTypes.UUID, allowNull: false, field: 'sequence_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    currentStep: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_step' },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'exited', 'failed'),
      defaultValue: 'active',
    },
    enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'enrolled_at' },
    nextSendAt: { type: DataTypes.DATE, allowNull: true, field: 'next_send_at' },
    exitedAt: { type: DataTypes.DATE, allowNull: true, field: 'exited_at' },
    exitReason: { type: DataTypes.STRING(100), allowNull: true, field: 'exit_reason' },
  },
  {
    tableName: 'email_sequence_enrollments',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['lead_id', 'sequence_id'], unique: true, name: 'idx_enrollments_lead_seq' },
      { fields: ['next_send_at', 'status'], name: 'idx_enrollments_next_send' },
    ],
  },
)
