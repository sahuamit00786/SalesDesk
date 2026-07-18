import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const ChatSession = sequelize.define(
  'ChatSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    userId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resolvedEntities: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'resolved_entities',
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_message_at',
    },
  },
  {
    tableName: 'chat_sessions',
    timestamps: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['workspace_id', 'user_id', 'last_message_at'] },
    ],
  },
)
