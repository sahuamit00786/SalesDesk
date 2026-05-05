import * as whisperService from '../services/whisperService.js'

export async function uploadTranscription(req,res,next){

try{

if(!req.file){
throw new Error('Audio file required')
}

const transcript=
await whisperService.transcribeAudio(
req.file.path,
req.body.meetingId
)

res.json({
success:true,
data:transcript
})

}catch(err){
next(err)
}

}

export async function liveStart(req,res,next){

try{

const data=
await whisperService.startLiveStream(
req.body.meetingId
)

res.json({
success:true,
data
})

}catch(e){
next(e)
}

}
