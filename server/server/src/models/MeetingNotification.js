import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const MeetingNotification=sequelize.define(
'MeetingNotification',
{
id:{
type:DataTypes.UUID,
defaultValue:DataTypes.UUIDV4,
primaryKey:true
},

meetingId:{
type:DataTypes.UUID,
field:'meeting_id'
},

notifyAt:{
type:DataTypes.DATE,
field:'notify_at'
},

channel:{
type:DataTypes.ENUM(
'in_app',
'email',
'whatsapp',
'push'
)
},

status:{
type:DataTypes.ENUM(
'pending',
'sent',
'failed'
),
defaultValue:'pending'
}

},
{
tableName:'meeting_notifications',
timestamps:true
}
)