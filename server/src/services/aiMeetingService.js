import OpenAI from 'openai'
import {MeetingTranscript} from '../../src/models/MeetingTranscript.js'
import {AiMeetingSummary} from '../../src/models/AiMeetingSummary.js'
import dotenv from 'dotenv'

dotenv.config()

const openai=
new OpenAI({
apiKey:process.env.OPENAI_API_KEY
})

async function getTranscript(meetingId){

const rows=
await MeetingTranscript.findAll({
where:{
meetingId
}
})

return rows
.map(
x=>x.utterance
)
.join('\n')

}

export async function generateSummary(
meetingId
){

const transcript=
await getTranscript(
meetingId
)

const result=
await openai.chat.completions.create({
model:'gpt-4o-mini',
messages:[
{
role:'system',
content:
'Create sales meeting summary with actions and objections'
},
{
role:'user',
content:transcript
}
]
})

const summary=
result.choices[0].message.content

await AiMeetingSummary.upsert({
meetingId,
summary
})

return{
summary
}

}

export async function extractActions(
meetingId
){

const transcript=
await getTranscript(meetingId)

const result=
await openai.chat.completions.create({
model:'gpt-4o-mini',
messages:[
{
role:'system',
content:'Extract action items in JSON'
},
{
role:'user',
content:transcript
}
]
})

return{
actions:
result.choices[0].message.content
}

}

export async function analyzeSentiment(
meetingId
){

const transcript=
await getTranscript(meetingId)

const result=
await openai.chat.completions.create({
model:'gpt-4o-mini',
messages:[
{
role:'system',
content:'Analyze meeting sentiment score 1-10'
},
{
role:'user',
content:transcript
}
]
})

return{
sentiment:
result.choices[0].message.content
}

}