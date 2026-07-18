import fs from 'fs'
import { getOpenAI } from './openAiClient.js'
import {MeetingTranscript} from '../../src/models/MeetingTranscript.js'
import dotenv from 'dotenv'

dotenv.config()

export async function transcribeAudio(
filePath,
meetingId
){

const result=
await getOpenAI().audio.transcriptions.create({
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