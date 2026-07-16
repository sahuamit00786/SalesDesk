import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const MeetingTranscript=sequelize.define(
'MeetingTranscript',
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

speaker:{
type:DataTypes.STRING(150)
},

speakerType:{
type:DataTypes.ENUM(
'user',
'lead',
'bot'
),
field:'speaker_type'
},

timeStamp:{
type:DataTypes.INTEGER,
field:'time_stamp'
},

utterance:{
type:DataTypes.TEXT
},

confidence:{
type:DataTypes.FLOAT
}

},
{
tableName:'meeting_transcripts',
timestamps:true
}
)