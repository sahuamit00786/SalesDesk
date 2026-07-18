import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

/**
 * Calendar event cache. Reads go to Aurinko live (events are tiny), and each
 * live read upserts here; the optional calendar webhook subscription keeps
 * this cache in sync going forward and serves as a fallback if Aurinko is
 * briefly unreachable.
 */
export const AurinkoCalendarEvent = sequelize.define(
  'AurinkoCalendarEvent',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accountId: { type: DataTypes.UUID, allowNull: false, field: 'account_id' },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    calendarId: { type: DataTypes.STRING(255), allowNull: false, field: 'calendar_id' },
    aurinkoEventId: { type: DataTypes.STRING(512), allowNull: false, field: 'aurinko_event_id' },
    subject: { type: DataTypes.STRING(512), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    location: { type: DataTypes.STRING(512), allowNull: true },
    startAt: { type: DataTypes.DATE(3), allowNull: true, field: 'start_at' },
    endAt: { type: DataTypes.DATE(3), allowNull: true, field: 'end_at' },
    allDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'all_day' },
    status: { type: DataTypes.STRING(40), allowNull: true },
    organizerEmail: { type: DataTypes.STRING(320), allowNull: true, field: 'organizer_email' },
    attendees: { type: DataTypes.JSON, allowNull: true },
    meetingUrl: { type: DataTypes.STRING(1024), allowNull: true, field: 'meeting_url' },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    raw: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: 'aurinko_calendar_events', timestamps: true },
)
