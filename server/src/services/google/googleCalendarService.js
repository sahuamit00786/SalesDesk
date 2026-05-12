import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { readGoogleOAuthEnv } from './googleEnv.js'

function oauthClient() {
  const env = readGoogleOAuthEnv()
  const client = new google.auth.OAuth2(
    env.clientId,
    env.clientSecret,
    env.redirectUri,
  )

  client.setCredentials({
    refresh_token: env.refreshToken,
  })

  return client
}

function toRfc3339DateTime(value) {
  if (value == null) return value
  if (value instanceof Date) return value.toISOString()
  return value
}

/**
 * Official Meet URL is `hangoutLink` on the Calendar event resource.
 * Fall back to conference video entry point when API omits hangoutLink.
 */
function meetLinkFromCalendarEvent(data) {
  if (!data) return null
  if (data.hangoutLink) return data.hangoutLink
  const entryPoints = data.conferenceData?.entryPoints || []
  const video = entryPoints.find((e) => e.entryPointType === 'video')
  if (video?.uri) return video.uri
  return entryPoints.find((e) => e.uri)?.uri || null
}

async function fetchEventWithConference(calendar, eventId) {
  const { data } = await calendar.events.get({
    calendarId: 'primary',
    eventId,
    conferenceDataVersion: 1,
  })
  return data
}

export async function createCalendarEvent(payload) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  })

  const timeZone = payload.timezone || 'Asia/Kolkata'
  const start = toRfc3339DateTime(payload.scheduledStart)
  const end = toRfc3339DateTime(payload.scheduledEnd)

  const insertRes = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: payload.title,
      description: payload.agenda,
      start: {
        dateTime: start,
        timeZone,
      },
      end: {
        dateTime: end,
        timeZone,
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${randomUUID()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  let data = insertRes.data
  let meetLink = meetLinkFromCalendarEvent(data)

  // Insert response often omits hangoutLink; a follow-up GET returns conferenceData + hangoutLink.
  if (!meetLink && data?.id) {
    try {
      data = await fetchEventWithConference(calendar, data.id)
      meetLink = meetLinkFromCalendarEvent(data)
    } catch (e) {
      console.error('[calendar] Refetch after insert failed:', e.message)
    }
  }

  if (!meetLink && data?.id) {
    console.warn(
      '[calendar] Event',
      data.id,
      'has no Meet URL yet — check OAuth Calendar scope, Workspace Meet policy, or API errors above.',
    )
  }

  return {
    googleEventId: data.id,
    meetLink,
  }
}

export async function getCalendarEvent(googleEventId) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  })

  const data = await fetchEventWithConference(calendar, googleEventId)

  return {
    googleEventId: data.id,
    meetLink: meetLinkFromCalendarEvent(data),
  }
}

export async function patchCalendarEvent(googleEventId, payload) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  })

  const timeZone = payload.timezone || 'Asia/Kolkata'
  const body = {}

  if (payload.title != null) body.summary = payload.title
  if (payload.agenda != null) body.description = payload.agenda
  if (payload.scheduledStart != null) {
    body.start = {
      dateTime: toRfc3339DateTime(payload.scheduledStart),
      timeZone,
    }
  }
  if (payload.scheduledEnd != null) {
    body.end = {
      dateTime: toRfc3339DateTime(payload.scheduledEnd),
      timeZone,
    }
  }

  if (Object.keys(body).length === 0) {
    return getCalendarEvent(googleEventId)
  }

  const { data: patched } = await calendar.events.patch({
    calendarId: 'primary',
    eventId: googleEventId,
    conferenceDataVersion: 1,
    requestBody: body,
  })

  let data = patched
  let meetLink = meetLinkFromCalendarEvent(data)
  if (!meetLink && data?.id) {
    try {
      data = await fetchEventWithConference(calendar, data.id)
      meetLink = meetLinkFromCalendarEvent(data)
    } catch (e) {
      console.error('[calendar] Refetch after patch failed:', e.message)
    }
  }

  return {
    googleEventId: data.id,
    meetLink,
  }
}

export async function deleteCalendarEvent(googleEventId) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(),
  })

  return calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  })
}
