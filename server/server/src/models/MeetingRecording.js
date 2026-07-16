import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const MeetingRecording=sequelize.define(
'MeetingRecording',
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

audioUrl:{
type:DataTypes.TEXT,
field:'audio_url'
},

videoUrl:{
type:DataTypes.TEXT,
field:'video_url'
},

storageProvider:{
type:DataTypes.ENUM(
's3',
'gcs'
),
field:'storage_provider'
},

sizeMb:{
type:DataTypes.INTEGER,
field:'size_mb'
}

},
{
tableName:'meeting_recordings',
timestamps:true
}
)