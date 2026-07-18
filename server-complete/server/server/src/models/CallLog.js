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
allowNull:true,
field:'lead_id'
},

companyId:{
type:DataTypes.UUID,
allowNull:false,
field:'company_id'
},

workspaceId:{
type:DataTypes.UUID,
allowNull:true,
field:'workspace_id'
},

ownerUserId:{
type:DataTypes.UUID,
field:'owner_user_id'
},

// Raw caller identity as read from the device call log — kept even when
// leadId is set, since it can differ from the lead's saved contact name.
callerName:{
type:DataTypes.STRING(255),
field:'caller_name'
},

phoneNumber:{
type:DataTypes.STRING(32),
field:'phone_number'
},

source:{
type:DataTypes.ENUM(
'manual',
'device_sync'
),
allowNull:false,
defaultValue:'manual'
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
},

deviceCallKey:{
type:DataTypes.STRING(120),
field:'device_call_key'
}

},
{
tableName:'call_logs',
timestamps:true,
paranoid:true
}
)