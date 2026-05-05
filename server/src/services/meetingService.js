import { Meeting } from "../models/Meeting.js";
import { MeetingParticipant } from "../models/MeetingParticipant.js";
import { sequelize } from "../config/db.js";
import { createGoogleMeet } from "../services/google/googleMeetService.js";
import { scheduleReminders } from "../jobs/reminderJob.js";
import { Op } from "sequelize";
import { deleteCalendarEvent } from "../services/google/googleCalendarService.js";
import { notifyMeetingParticipants } from "../services/notification/meetingNotificationService.js"

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

    let googleEvent = { id: null, meetLink: null };

    try {
      googleEvent = await createGoogleMeet(payload);
    } catch (e) {
      console.error("⚠️ Google Meet failed:", e.message);
    }

    const meeting = await Meeting.create(
      {
        ...payload,
        workspaceId,
        ownerUserId: user.id,
        googleEventId: googleEvent?.id || null,
        googleMeetLink: googleEvent?.meetLink || null,
      },
      { transaction: tx }
    );

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

    return meeting;
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

  const timeChanged =
    payload.scheduledStart || payload.scheduledEnd;

  try {
    // ✅ CASE 1: NO LINK → CREATE NEW GOOGLE MEET
    if (!googleEventId) {
      const googleEvent = await createGoogleMeet({
        ...meeting.toJSON(),
        ...payload,
      });

      googleEventId = googleEvent?.id || null;
      googleMeetLink = googleEvent?.meetLink || null;

      console.log("✅ Created new Google Meet on update");
    }

    // ✅ CASE 2: LINK EXISTS + TIME CHANGED → (OPTIONAL)
    else if (timeChanged) {
      console.log("⚠️ TODO: reschedule Google Meet");
      // future improvement: update calendar event
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

