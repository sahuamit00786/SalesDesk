import * as whisperService from '../services/whisperService.js'
import { assertMeetingAccess } from '../services/meetingAccessService.js'

export async function uploadTranscription(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('Audio file required')
      err.status = 400
      err.code = 'VALIDATION'
      throw err
    }

    const meetingId = req.body?.meetingId
    if (meetingId) {
      await assertMeetingAccess(meetingId, req.user, req.workspaceId)
    }

    const transcript = await whisperService.transcribeAudio(req.file.path, meetingId)

res.json({
success:true,
data:transcript
})

}catch(err){
next(err)
}

}

export async function liveStart(req, res, next) {
  try {
    const meetingId = req.body?.meetingId
    if (!meetingId) {
      const err = new Error('meetingId is required')
      err.status = 400
      err.code = 'VALIDATION'
      throw err
    }
    await assertMeetingAccess(meetingId, req.user, req.workspaceId)

    const data = await whisperService.startLiveStream(meetingId)

res.json({
success:true,
data
})

}catch(e){
next(e)
}

}
