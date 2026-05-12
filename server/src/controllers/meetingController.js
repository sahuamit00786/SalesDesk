import * as service from "../services/meetingService.js";
import { buildMeetingBotRequirements } from "../services/meetingBotRequirements.js";
import { envTruthy } from "../utils/envTruthy.js";

export async function getMeetingBotRequirements(req, res, next) {
  try {
    const clientOs = req.query.os || req.headers["sec-ch-ua-platform"];
    const data = buildMeetingBotRequirements(clientOs, process.platform);
    data.serverMasterSwitchEnabled = envTruthy("ENABLE_MEETING_BOT", false);
    res.json({
      success: true,
      data,
      meta: {},
    });
  } catch (e) {
    next(e);
  }
}

export async function patchMeetingBotConsent(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];
    const consent = Boolean(req.body?.consent);

    const data = await service.setMeetingBotConsent(
      req.params.id,
      consent,
      req.user,
      workspaceId
    );

    const botOn = envTruthy("ENABLE_MEETING_BOT", false);
    res.json({
      success: true,
      data,
      meta: {
        botBackendEnabled: botOn,
        hint: !botOn
          ? "Consent saved. Ask your admin to set ENABLE_MEETING_BOT=true on the API server for the bot to run."
          : undefined,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function createMeeting(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    const { meeting, googleMeetMeta, botConsentMeta } =
      await service.createMeeting(req.user, req.body, workspaceId);

    res.status(201).json({
      success: true,
      data: meeting,
      meta: {
        ...(googleMeetMeta && { googleMeet: googleMeetMeta }),
        ...(botConsentMeta && { botConsent: botConsentMeta }),
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function getMeetings(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    const meetings = await service.listMeetings(
      req.query,
      req.user,
      workspaceId
    );

    res.json({
      success: true,
      ...meetings,
    });
  } catch (e) {
    next(e);
  }
}

export async function getMeeting(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    const data = await service.getMeetingById(
      req.params.id,
      workspaceId
    );

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
}

export async function updateMeeting(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    const data = await service.updateMeeting(
      req.params.id,
      req.body,
      workspaceId
    );

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    next(e);
  }
}

export async function deleteMeeting(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    await service.deleteMeeting(
      req.params.id,
      workspaceId
    );

    res.json({
      success: true,
    });
  } catch (e) {
    next(e);
  }
}