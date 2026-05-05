import { createCalendarEvent } from "./googleCalendarService.js";


export async function createGoogleMeet(payload) {
  try {
    const event = await createCalendarEvent(payload);

    return {
      id: event.googleEventId,     // ✅ FIXED
      meetLink: event.meetLink,    // ✅ FIXED
    };
  } catch (e) {
    console.error("Google Meet error:", e.message);
    return { id: null, meetLink: null };
  }
}

// export async function createGoogleMeet(payload) {
//   try {
//     const event = await createCalendarEvent(payload);

//     return {
//       id: event.id,
//       meetLink: event.hangoutLink, // ✅ important
//     };
//   } catch (e) {
//     console.error("Google Meet error:", e.message);
//     return { id: null, meetLink: null };
//   }
// }