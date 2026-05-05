import { sendMeetingEmail } from "../mailService.js"; // your file
// import { sendMeetingSMS } from "./smsService.js";
import { Lead } from "../../models/Lead.js";

export async function notifyMeetingParticipants(meeting) {
  try {
    const lead = await Lead.findByPk(meeting.leadId);

    if (!lead) return;

    // 📧 EMAIL
    if (lead.email) {
      await sendMeetingEmail({
        to: lead.email,
        leadName: lead.contactName || lead.name,
        meetingTitle: meeting.title,
        agenda: meeting.agenda,
        scheduledStart: meeting.scheduledStart,
        meetLink: meeting.googleMeetLink,
      });
    }

    // 📱 SMS
    // if (lead.phone) {
    //   await sendMeetingSMS({
    //     phone: lead.phone,
    //     meetingTitle: meeting.title,
    //     scheduledStart: meeting.scheduledStart,
    //     meetLink: meeting.googleMeetLink,
    //   });
    // }
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}