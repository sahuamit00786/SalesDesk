// import { DataTypes } from 'sequelize'
// import { sequelize } from '../config/db.js'

// export const Meeting = sequelize.define(
// 'Meeting',
// {
// id:{
// type:DataTypes.UUID,
// defaultValue:DataTypes.UUIDV4,
// primaryKey:true
// },

// workspaceId:{
// type:DataTypes.UUID,
// allowNull:false,
// field:'workspace_id'
// },

// leadId:{
// type:DataTypes.UUID,
// allowNull:false,
// field:'lead_id',
// references:{
// model:'leads',
// key:'id'
// }
// },

// ownerUserId:{
// type:DataTypes.UUID,
// allowNull:false,
// field:'owner_user_id',
// references:{
// model:'users',
// key:'id'
// }
// },

// googleEventId:{
// type:DataTypes.STRING,
// field:'google_event_id'
// },

// googleMeetLink:{
// type:DataTypes.TEXT,
// field:'google_meet_link'
// },

// title:{
// type:DataTypes.STRING(255),
// allowNull:false
// },

// meetingType:{
// type:DataTypes.ENUM(
// 'demo',
// 'follow_up',
// 'closing',
// 'internal'
// ),
// field:'meeting_type'
// },

// agenda:{
// type:DataTypes.TEXT
// },

// scheduledStart:{
// type:DataTypes.DATE,
// allowNull:false,
// field:'scheduled_start'
// },

// scheduledEnd:{
// type:DataTypes.DATE,
// allowNull:false,
// field:'scheduled_end'
// },

// timezone:{
// type:DataTypes.STRING(50),
// defaultValue:'Asia/Kolkata'
// },

// status:{
// type:DataTypes.ENUM(
// 'scheduled',
// 'live',
// 'completed',
// 'cancelled',
// 'missed'
// ),
// defaultValue:'scheduled'
// },

// recordingStatus:{
// type:DataTypes.ENUM(
// 'pending',
// 'recording',
// 'completed'
// ),
// field:'recording_status',
// defaultValue:'pending'
// },

// transcriptionStatus:{
// type:DataTypes.ENUM(
// 'pending',
// 'processing',
// 'completed'
// ),
// field:'transcription_status',
// defaultValue:'pending'
// },

// aiSummaryStatus: {
//   type: DataTypes.ENUM(
//     "pending",
//     "processing",
//     "completed"
//   ),
//   field: "ai_summary_status",
//   defaultValue: "pending",
// },

// botStatus: {
//   type: DataTypes.ENUM(
//     "scheduled",
//     "joining",
//     "recording",
//     "processing",
//     "completed",
//     "failed"
//   ),
//   field: "bot_status",
//   defaultValue: "scheduled",
// },

// audioFilePath: {
//   type: DataTypes.TEXT,
//   field: 'audio_file_path',
// },

// transcriptText: {
//   type: DataTypes.TEXT('long'),
//   field: 'transcript_text',
// },

// summaryText: {
//   type: DataTypes.TEXT('long'),
//   field: 'summary_text',
// },

// transcriptPdfUrl: {
//   type: DataTypes.TEXT,
//   field: 'transcript_pdf_url',
// },

// summaryPdfUrl: {
//   type: DataTypes.TEXT,
//   field: 'summary_pdf_url',
// },
// field:'ai_summary_status',
// defaultValue:'pending'
// },

// durationMinutes:{
// type:DataTypes.INTEGER,
// field:'duration_minutes'
// },

// createdBy:{
// type:DataTypes.UUID,
// field:'created_by'
// }

// },
// {
// tableName:'meetings',
// timestamps:true,
// paranoid:true
// }
// )

import { DataTypes } from "sequelize";

import { sequelize } from "../config/db.js";

export const Meeting = sequelize.define(
  "Meeting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "workspace_id",
    },

    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "lead_id",
      references: {
        model: "leads",
        key: "id",
      },
    },

    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },

    googleEventId: {
      type: DataTypes.STRING,
      field: "google_event_id",
    },

    googleMeetLink: {
      type: DataTypes.TEXT,
      field: "google_meet_link",
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    meetingType: {
      type: DataTypes.ENUM(
        "demo",
        "follow_up",
        "closing",
        "internal"
      ),
      field: "meeting_type",
    },

    agenda: {
      type: DataTypes.TEXT,
    },

    scheduledStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "scheduled_start",
    },

    scheduledEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "scheduled_end",
    },

    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: "Asia/Kolkata",
    },

    status: {
      type: DataTypes.ENUM(
        "scheduled",
        "live",
        "completed",
        "cancelled",
        "missed"
      ),
      defaultValue: "scheduled",
    },

    recordingStatus: {
      type: DataTypes.ENUM(
        "pending",
        "recording",
        "completed"
      ),
      field: "recording_status",
      defaultValue: "pending",
    },

    transcriptionStatus: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed"
      ),
      field: "transcription_status",
      defaultValue: "pending",
    },

    aiSummaryStatus: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed"
      ),
      field: "ai_summary_status",
      defaultValue: "pending",
    },

    audioFilePath: {
      type: DataTypes.TEXT,
      field: "audio_file_path",
    },

    transcriptText: {
      type: DataTypes.TEXT("long"),
      field: "transcript_text",
    },

    summaryText: {
      type: DataTypes.TEXT("long"),
      field: "summary_text",
    },

    transcriptPdfUrl: {
      type: DataTypes.TEXT,
      field: "transcript_pdf_url",
    },

    summaryPdfUrl: {
      type: DataTypes.TEXT,
      field: "summary_pdf_url",
    },

    durationMinutes: {
      type: DataTypes.INTEGER,
      field: "duration_minutes",
    },

    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
    },
  },
  {
    tableName: "meetings",
    timestamps: true,
    paranoid: true,
  }
);