import cron from "node-cron";
import { Op } from "sequelize";
import { Meeting } from "../../src/models/Meeting.js";
import { notifyMeetingParticipants } from "../services/notification/meetingNotificationService.js"

async function sendReminder(meeting) {
  console.log(`Reminder sent for ${meeting.title}`);

  /*
plug:
email
whatsapp
push
*/
// ✅ SEND UPDATED INVITE
  await notifyMeetingParticipants(meeting);
}

export async function scheduleReminders(meeting) {
  return true;
}

export function startReminderJob() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000);

    const meetings = await Meeting.findAll({
      where: {
        status: "scheduled",
        scheduledStart: {
          [Op.between]: [now, tenMinLater],
        },
      },
    });

    for (const m of meetings) {
      await sendReminder(m);
    }
  });
}
