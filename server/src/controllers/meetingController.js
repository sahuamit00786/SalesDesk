import * as service from "../services/meetingService.js";

export async function createMeeting(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    const data = await service.createMeeting(
      req.user,
      req.body,
      workspaceId
    );

    res.status(201).json({
      success: true,
      data,
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