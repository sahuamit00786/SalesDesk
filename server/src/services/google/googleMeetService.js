import {
  createCalendarEvent,
  getCalendarEvent,
  patchCalendarEvent,
} from './googleCalendarService.js'
import {
  isGoogleCalendarConfigured,
  missingGoogleOAuthEnvKeys,
} from './googleEnv.js'

function logGoogleApiError(prefix, e) {
  const body = e?.response?.data
  if (body) {
    console.error(prefix, JSON.stringify(body))
  } else {
    console.error(prefix, e?.message || e)
  }
}

function apiErrorDetail(e) {
  const body = e?.response?.data
  if (body) return body
  return e?.message || String(e)
}

export async function createGoogleMeet(payload) {
  if (!isGoogleCalendarConfigured()) {
    const missing = missingGoogleOAuthEnvKeys()
    console.warn(
      '[Google Meet] Calendar API disabled — set these in .env (repo root or server folder):',
      missing.join(', '),
    )
    return {
      id: null,
      meetLink: null,
      meta: { code: 'MISSING_ENV', missingKeys: missing },
    }
  }
  try {
    const event = await createCalendarEvent(payload)
    if (!event.googleEventId) {
      console.error('[Google Meet] Calendar insert returned no event id')
      return {
        id: null,
        meetLink: null,
        meta: { code: 'NO_EVENT_ID' },
      }
    }
    return {
      id: event.googleEventId,
      meetLink: event.meetLink || null,
      meta: event.meetLink
        ? null
        : { code: 'NO_MEET_LINK', googleEventId: event.googleEventId },
    }
  } catch (e) {
    logGoogleApiError('Google Meet error:', e)
    return {
      id: null,
      meetLink: null,
      meta: { code: 'GOOGLE_API_ERROR', detail: apiErrorDetail(e) },
    }
  }
}

export async function syncGoogleMeetFromEvent(googleEventId) {
  if (!isGoogleCalendarConfigured()) {
    return { googleEventId, meetLink: null }
  }
  try {
    return await getCalendarEvent(googleEventId)
  } catch (e) {
    logGoogleApiError('Google Meet get error:', e)
    return { googleEventId, meetLink: null }
  }
}

export async function patchGoogleMeet(googleEventId, payload) {
  if (!isGoogleCalendarConfigured()) {
    return { googleEventId, meetLink: null }
  }
  try {
    return await patchCalendarEvent(googleEventId, payload)
  } catch (e) {
    logGoogleApiError('Google Meet patch error:', e)
    return { googleEventId, meetLink: null }
  }
}
