import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const AiMeetingSummary=sequelize.define(
'AiMeetingSummary',
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

summary:{
type:DataTypes.TEXT
},

actionItems:{
type:DataTypes.JSON,
field:'action_items'
},

objections:{
type:DataTypes.JSON
},

sentimentScore:{
type:DataTypes.FLOAT,
field:'sentiment_score'
},

meetingScore:{
type:DataTypes.FLOAT,
field:'meeting_score'
},

nextSteps:{
type:DataTypes.JSON,
field:'next_steps'
},

salesInsights:{
type:DataTypes.JSON,
field:'sales_insights'
}

},
{
tableName:'ai_meeting_summaries',
timestamps:true
}
)