import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { readGoogleOAuthEnv } from './googleEnv.js'

function oauthClient(credentials = null) {
  const env = readGoogleOAuthEnv()
  const client = new google.auth.OAuth2(
    env.clientId,
    env.clientSecret,
    env.redirectUri,
  )

  if (credentials?.refreshToken) {
    client.setCredentials({
      refresh_token: credentials.refreshToken,
      access_token: credentials.accessToken || undefined,
      expiry_date: credentials.expiryDate || undefined,
    })
    // credentials is the live CompanyGoogleToken row when called via meetingService — persist
    // whatever googleapis refreshes internally so the next call reuses the cached access token
    // instead of re-hitting the refresh_token endpoint (excess refreshes trigger invalid_grant).
    if (typeof credentials.update === 'function') {
      client.on('tokens', async (tokens) => {
        try {
          await credentials.update({
            accessToken: tokens.access_token || credentials.accessToken,
            refreshToken: tokens.refresh_token || credentials.refreshToken,
            expiryDate: tokens.expiry_date || credentials.expiryDate,
            scope: tokens.scope || credentials.scope,
            tokenType: tokens.token_type || credentials.tokenType,
          })
        } catch (e) {
          console.error('[calendar] Failed to persist refreshed Google token:', e.message)
        }
      })
    }
  } else {
    client.setCredentials({
      refresh_token: env.refreshToken,
    })
  }

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

export async function createCalendarEvent(payload, credentials = null) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(credentials),
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

export async function getCalendarEvent(googleEventId, credentials = null) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(credentials),
  })

  const data = await fetchEventWithConference(calendar, googleEventId)

  return {
    googleEventId: data.id,
    meetLink: meetLinkFromCalendarEvent(data),
  }
}

export async function patchCalendarEvent(googleEventId, payload, credentials = null) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(credentials),
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
    return getCalendarEvent(googleEventId, credentials)
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

export async function deleteCalendarEvent(googleEventId, credentials = null) {
  const calendar = google.calendar({
    version: 'v3',
    auth: oauthClient(credentials),
  })

  return calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  })
}
