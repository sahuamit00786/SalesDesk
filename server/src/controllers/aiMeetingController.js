import * as aiService from '../services/aiMeetingService.js'
import { assertMeetingAccess } from '../services/meetingAccessService.js'

export async function summarizeMeeting(req, res, next) {
  try {
    await assertMeetingAccess(req.params.id, req.user, req.workspaceId)
    const data = await aiService.generateSummary(req.params.id)

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
}

export async function actionItems(req, res, next) {
  try {
    await assertMeetingAccess(req.params.id, req.user, req.workspaceId)
    const data = await aiService.extractActions(req.params.id)

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
}

export async function sentiment(req, res, next) {
  try {
    await assertMeetingAccess(req.params.id, req.user, req.workspaceId)
    const data = await aiService.analyzeSentiment(req.params.id)

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
}
