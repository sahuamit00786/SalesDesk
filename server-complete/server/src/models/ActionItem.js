import {DataTypes} from 'sequelize'
import {sequelize} from '../config/db.js'

export const ActionItem=sequelize.define(
'ActionItem',
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

assignedTo:{
type:DataTypes.UUID,
field:'assigned_to'
},

task:{
type:DataTypes.TEXT
},

dueDate:{
type:DataTypes.DATE,
field:'due_date'
},

status:{
type:DataTypes.ENUM(
'open',
'in_progress',
'done'
),
defaultValue:'open'
}

},
{
tableName:'action_items',
timestamps:true
}
)