import { Meeting } from "../models/Meeting.js";
import { MeetingParticipant } from "../models/MeetingParticipant.js";
import { sequelize } from "../config/db.js";
import {
  createGoogleMeet,
  patchGoogleMeet,
  syncGoogleMeetFromEvent,
} from "../services/google/googleMeetService.js";
import { scheduleReminders } from "../jobs/reminderJob.js";
import { Op } from "sequelize";
import { deleteCalendarEvent } from "../services/google/googleCalendarService.js";
import { notifyMeetingParticipants } from "../services/notification/meetingNotificationService.js"

/** Only persist fields the client is allowed to set (avoids `...req.body` overwriting Google columns). */
function pickMeetingCreatePayload(body) {
  const keys = [
    "title",
    "leadId",
    "meetingType",
    "scheduledStart",
    "scheduledEnd",
    "agenda",
    "timezone",
    "recordingBotConsent",
  ];
  const out = {};
  for (const k of keys) {
    if (body[k] !== undefined && body[k] !== null) out[k] = body[k];
  }
  if (typeof out.recordingBotConsent === "string") {
    out.recordingBotConsent = out.recordingBotConsent === "true";
  }
  return out;
}

export async function setMeetingBotConsent(id, consent, user, workspaceId) {
  const meeting = await Meeting.findOne({
    where: { id, workspaceId },
  });

  if (!meeting) {
    const err = new Error("Meeting not found");
    err.status = 404;
    throw err;
  }

  if (String(meeting.ownerUserId) !== String(user.id)) {
    const err = new Error("Only the meeting organizer can change bot consent");
    err.status = 403;
    throw err;
  }

  if (consent && !meeting.googleMeetLink?.trim()) {
    const err = new Error("Meeting needs a Google Meet link before enabling the bot");
    err.status = 400;
    throw err;
  }

  if (
    !consent &&
    meeting.botStatus &&
    !["scheduled"].includes(meeting.botStatus)
  ) {
    const err = new Error(
      "Cannot disable the bot after it has started processing"
    );
    err.status = 400;
    throw err;
  }

  await meeting.update({ recordingBotConsent: Boolean(consent) });
  await meeting.reload();
  return meeting;
}

/**
 * CREATE MEETING
 */
export async function createMeeting(user, payload, workspaceId) {
  const tx = await sequelize.transaction();

  try {
    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    if (!payload.leadId) {
      throw new Error("Lead ID is required");
    }

    const googleResult = await createGoogleMeet(payload);

    const picked = pickMeetingCreatePayload(payload);
    const wantsBot = Boolean(picked.recordingBotConsent);
    const recordingBotConsent =
      wantsBot && googleResult.meetLink ? true : false;

    const meeting = await Meeting.create(
      {
        ...picked,
        recordingBotConsent,
        workspaceId,
        ownerUserId: user.id,
        googleEventId: googleResult.id || null,
        googleMeetLink: googleResult.meetLink || null,
      },
      { transaction: tx }
    );

    const botConsentMeta = {
      requested: wantsBot,
      stored: recordingBotConsent,
      skippedReason:
        wantsBot && !googleResult.meetLink
          ? 'NO_GOOGLE_MEET_LINK'
          : null,
    };

    if (payload.participants?.length) {
      await MeetingParticipant.bulkCreate(
        payload.participants.map((p) => ({
          meetingId: meeting.id,
          userId: p.userId,
          role: "attendee",
        })),
        { transaction: tx }
      );
    }

    await tx.commit();
// ✅ SEND UPDATED INVITE
  await notifyMeetingParticipants(meeting);
    await scheduleReminders(meeting);

    return {
      meeting,
      googleMeetMeta: googleResult.meta,
      botConsentMeta,
    };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/**
 * LIST MEETINGS
 */
export async function listMeetings(query, user, workspaceId) {
  const {
    search = "",
    status,
    meetingType,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10,
    sortField = "scheduledStart",
    sortOrder = "asc",
  } = query;

  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  const where = {
    workspaceId,
  };

  // 🔍 Search
  if (search) {
    where.title = {
      [Op.iLike]: `%${search}%`,
    };
  }

  // 🎯 Filters
  if (status) {
    where.status = status;
  }

  if (meetingType) {
    where.meetingType = meetingType;
  }

  // 📅 Date range
  if (dateFrom || dateTo) {
    where.scheduledStart = {};
    if (dateFrom) where.scheduledStart[Op.gte] = new Date(dateFrom);
    if (dateTo) where.scheduledStart[Op.lte] = new Date(dateTo);
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Meeting.findAndCountAll({
    where,
    include: [
      {
        model: MeetingParticipant,
        as: "participants",
        attributes: ["userId", "role"],
      },
    ],
    order: [[sortField, sortOrder.toUpperCase()]],
    limit: Number(limit),
    offset: Number(offset),
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit),
    },
  };
}

export async function getMeetingById(id, workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  const meeting = await Meeting.findOne({
    where: {
      id,
      workspaceId,
    },
    include: [
      {
        model: MeetingParticipant,
        as: "participants",
      },
    ],
  });

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  return meeting;
}

export async function updateMeeting(id, payload, workspaceId) {
  const meeting = await Meeting.findOne({
    where: { id, workspaceId },
  });

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  let googleEventId = meeting.googleEventId;
  let googleMeetLink = meeting.googleMeetLink;

  const merged = { ...meeting.toJSON(), ...payload };
  const timeChanged = Boolean(
    payload.scheduledStart || payload.scheduledEnd
  );
  const detailsChanged =
    payload.title !== undefined || payload.agenda !== undefined;

  try {
    if (!googleEventId) {
      const googleEvent = await createGoogleMeet(merged);
      googleEventId = googleEvent?.id || null;
      googleMeetLink = googleEvent?.meetLink || null;
    } else {
      if (!googleMeetLink) {
        const synced = await syncGoogleMeetFromEvent(googleEventId);
        googleMeetLink = synced.meetLink || googleMeetLink;
      }
      if (timeChanged || detailsChanged) {
        const patched = await patchGoogleMeet(googleEventId, merged);
        googleMeetLink = patched.meetLink || googleMeetLink;
        googleEventId = patched.googleEventId || googleEventId;
      }
      if (!googleMeetLink && googleEventId) {
        try {
          await deleteCalendarEvent(googleEventId);
        } catch (_) {
          /* ignore */
        }
        const recreated = await createGoogleMeet(merged);
        googleEventId = recreated?.id || googleEventId;
        googleMeetLink = recreated?.meetLink || null;
      }
    }
  } catch (e) {
    console.error("Google Meet update failed:", e.message);
  }

  await meeting.update({
    ...payload,
    googleEventId,
    googleMeetLink,
  });

  // ✅ SEND UPDATED INVITE
  await notifyMeetingParticipants(meeting);

  return meeting;
}


export async function deleteMeeting(id, workspaceId) {
  const meeting = await Meeting.findOne({
    where: { id, workspaceId },
  });

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 🔥 Delete from Google Calendar
  if (meeting.googleEventId) {
    try {
      await deleteCalendarEvent(meeting.googleEventId);
    } catch (e) {
      console.error("Google delete failed:", e.message);
    }
  }

  await meeting.destroy();

  return true;
}

