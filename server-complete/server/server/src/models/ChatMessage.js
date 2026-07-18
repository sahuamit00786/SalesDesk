import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const ChatMessage = sequelize.define(
  'ChatMessage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'chat_sessions',
        key: 'id',
      },
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'tool', 'system'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    blocks: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    toolName: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'tool_name',
    },
    toolArgs: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'tool_args',
    },
    toolCallId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'tool_call_id',
    },
    status: {
      type: DataTypes.ENUM('complete', 'pending_disambiguation'),
      allowNull: false,
      defaultValue: 'complete',
    },
  },
  {
    tableName: 'chat_messages',
    timestamps: true,
    indexes: [
      { fields: ['session_id', 'created_at'] },
      { fields: ['workspace_id'] },
    ],
  },
)
