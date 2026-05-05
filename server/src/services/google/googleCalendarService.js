import { google } from 'googleapis'

function oauthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return client
}

export async function createCalendarEvent(payload) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  });

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: payload.title,
      description: payload.agenda,
      start: {
        dateTime: payload.scheduledStart,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: payload.scheduledEnd,
        timeZone: 'Asia/Kolkata',
      },
      conferenceData: {
        createRequest: {
          requestId: Date.now().toString(),
        },
      },
    },
  });

  console.log("GOOGLE EVENT FULL:", event.data); // 🔍 DEBUG

  return {
    googleEventId: event.data.id,
    meetLink:
      event.data.hangoutLink ||
      event.data.conferenceData?.entryPoints?.[0]?.uri || // ✅ fallback
      null,
  };
}

// ✅ DELETE EVENT (FIXED)
export async function deleteCalendarEvent(googleEventId) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  });

  return calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  });
}

// export async function createCalendarEvent(payload) {
//   const calendar = google.calendar({
//     version: 'v3',
//     auth: oauthClient(),
//   })

//   const event = await calendar.events.insert({
//     calendarId: 'primary',
//     conferenceDataVersion: 1,

//     requestBody: {
//       summary: payload.title,
//       description: payload.agenda,

//       start: {
//         dateTime: payload.scheduledStart,
//         timeZone: 'Asia/Kolkata', // ✅ IMPORTANT
//       },

//       end: {
//         dateTime: payload.scheduledEnd,
//         timeZone: 'Asia/Kolkata', // ✅ IMPORTANT
//       },

//       conferenceData: {
//         createRequest: {
//           requestId: Date.now().toString(),
//         },
//       },
//     },
//   })

//   return {
//     googleEventId: event.data.id,
//     meetLink: event.data.hangoutLink, // ✅ IMPORTANT
//   }
// }

// export async function deleteCalendarEvent(googleEventId) {
//   const calendar = google.calendar({
//     version: 'v3',
//     auth: oauthClient(),
//   })

//   return calendar.events.delete({
//     calendarId: 'primary',
//     eventId: googleEventId,
//   })
// }