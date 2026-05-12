import fs from 'fs'
import OpenAI from 'openai'
import {MeetingTranscript} from '../../src/models/MeetingTranscript.js'
import dotenv from 'dotenv'

dotenv.config()

const openai=new OpenAI({
apiKey:process.env.OPENAI_API_KEY
})

export async function transcribeAudio(
filePath,
meetingId
){

const result=
await openai.audio.transcriptions.create({
file:fs.createReadStream(filePath),
model:'whisper-1'
})

const text=result.text

await MeetingTranscript.create({
meetingId,
speaker:'Unknown',
speakerType:'user',
utterance:text,
timeStamp:0,
confidence:1
})

return {
meetingId,
text
}

}

export async function startLiveStream(meetingId){

return{
meetingId,
status:'live transcription started'
}

}