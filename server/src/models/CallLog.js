import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const CallLog=sequelize.define(
'CallLog',
{
id:{
type:DataTypes.UUID,
defaultValue:DataTypes.UUIDV4,
primaryKey:true
},

leadId:{
type:DataTypes.UUID,
allowNull:false,
field:'lead_id'
},

ownerUserId:{
type:DataTypes.UUID,
field:'owner_user_id'
},

callType:{
type:DataTypes.ENUM(
'inbound',
'outbound'
),
field:'call_type'
},

duration:{
type:DataTypes.INTEGER
},

outcome:{
type:DataTypes.ENUM(
'connected',
'no_answer',
'voicemail',
'followup_needed'
)
},

notes:{
type:DataTypes.TEXT
},

recordingUrl:{
type:DataTypes.TEXT,
field:'recording_url'
}

},
{
tableName:'call_logs',
timestamps:true,
paranoid:true
}
)