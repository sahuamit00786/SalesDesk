import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const MeetingParticipant=sequelize.define(
'MeetingParticipant',
{
id:{
type:DataTypes.UUID,
defaultValue:DataTypes.UUIDV4,
primaryKey:true
},

meetingId:{
type:DataTypes.UUID,
allowNull:false,
field:'meeting_id'
},

userId:{
type:DataTypes.UUID,
field:'user_id'
},

leadContactId:{
type:DataTypes.UUID,
field:'lead_contact_id'
},

role:{
type:DataTypes.ENUM(
'host',
'attendee',
'bot'
),
defaultValue:'attendee'
},

joinedAt:{
type:DataTypes.DATE,
field:'joined_at'
},

leftAt:{
type:DataTypes.DATE,
field:'left_at'
}
},
{
tableName:'meeting_participants',
timestamps:true
}
)