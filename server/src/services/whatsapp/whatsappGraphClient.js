import { httpError } from '../../utils/httpError.js'

function apiVersion() {
  return process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'
}

function graphUrl(pathSegment) {
  return `https://graph.facebook.com/${apiVersion()}/${pathSegment}`
}

// Meta error codes worth surfacing with a friendlier, actionable message than their raw title.
const FRIENDLY_ERRORS = {
  131047: {
    code: 'WHATSAPP_OUTSIDE_WINDOW',
    message: 'This contact hasn’t messaged you in the last 24 hours — send an approved Template to reach them instead of a free-form message.',
  },
  131026: {
    code: 'WHATSAPP_UNDELIVERABLE',
    message: 'WhatsApp could not deliver this — the number may not have WhatsApp, or hasn’t opted in yet.',
  },
  133010: {
    code: 'WHATSAPP_NUMBER_NOT_REGISTERED',
    message: 'This business phone number isn’t registered with WhatsApp yet — check your setup in Meta Business Manager.',
  },
}

async function parseErrorBody(response) {
  try {
    const body = await response.json()
    const err = body?.error
    if (!err) return null
    return {
      metaCode: err.code ?? null,
      message: err.error_data?.details || err.error_user_msg || err.message || null,
    }
  } catch {
    return null
  }
}

async function graphFetch(url, { method = 'GET', accessToken, body, isMultipart } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(isMultipart ? {} : body ? { 'content-type': 'application/json' } : {}),
      },
      body: isMultipart ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw httpError(503, 'WHATSAPP_NETWORK_ERROR', 'Could not reach WhatsApp (Meta Graph API). Please try again.', {
      cause: err?.message,
    })
  }
  if (!response.ok) {
    const parsed = await parseErrorBody(response)
    const friendly = parsed?.metaCode != null ? FRIENDLY_ERRORS[parsed.metaCode] : null
    throw httpError(
      response.status === 401 || response.status === 403 ? 401 : 502,
      friendly?.code || 'WHATSAPP_API_ERROR',
      friendly?.message || parsed?.message || `WhatsApp API request failed (${response.status})`,
    )
  }
  return response.json()
}

/** Confirms the phone number id + access token are valid and returns display info. */
export async function getPhoneNumberInfo(phoneNumberId, accessToken) {
  return graphFetch(graphUrl(`${phoneNumberId}?fields=verified_name,display_phone_number`), { accessToken })
}

/**
 * Verifying the callback URL + subscribing webhook fields in the App dashboard is NOT
 * enough on its own — the WABA must separately be linked to this App via this edge, or
 * Meta never actually sends it any events. Easy to miss since the UI doesn't always
 * surface it; calling it ourselves on every save removes the manual step entirely.
 */
export async function subscribeAppToWaba({ wabaId, accessToken }) {
  return graphFetch(graphUrl(`${wabaId}/subscribed_apps`), { method: 'POST', accessToken })
}

export async function sendTextMessage({ phoneNumberId, to, text, accessToken, replyToWaMessageId }) {
  return graphFetch(graphUrl(`${phoneNumberId}/messages`), {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text, preview_url: true },
      ...(replyToWaMessageId ? { context: { message_id: replyToWaMessageId } } : {}),
    },
  })
}

export async function sendMediaMessage({ phoneNumberId, to, type, mediaId, caption, accessToken, replyToWaMessageId }) {
  const mediaObject = { id: mediaId, ...(caption ? { caption } : {}) }
  return graphFetch(graphUrl(`${phoneNumberId}/messages`), {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: mediaObject,
      ...(replyToWaMessageId ? { context: { message_id: replyToWaMessageId } } : {}),
    },
  })
}

export async function sendReaction({ phoneNumberId, to, waMessageId, emoji, accessToken }) {
  return graphFetch(graphUrl(`${phoneNumberId}/messages`), {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: { message_id: waMessageId, emoji: emoji || '' },
    },
  })
}

/** Uploads a local file buffer to Meta, returning a media id usable in sendMediaMessage. */
export async function uploadMediaToMeta({ phoneNumberId, buffer, mimeType, fileName, accessToken }) {
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('file', new Blob([buffer], { type: mimeType }), fileName || 'file')
  const result = await graphFetch(graphUrl(`${phoneNumberId}/media`), {
    method: 'POST',
    accessToken,
    body: form,
    isMultipart: true,
  })
  return result?.id
}

/** Resolves Meta's temporary media id to a short-lived download URL. */
export async function getMediaUrl(mediaId, accessToken) {
  const result = await graphFetch(graphUrl(mediaId), { accessToken })
  return { url: result?.url, mimeType: result?.mime_type, fileSize: result?.file_size }
}

/** Submits a new template for Meta's approval review. `payload` is Meta's own template JSON shape. */
export async function createMessageTemplate({ wabaId, accessToken, payload }) {
  return graphFetch(graphUrl(`${wabaId}/message_templates`), { method: 'POST', accessToken, body: payload })
}

/** Pulls current templates + their review status from Meta (for syncing local rows). */
export async function listMessageTemplates({ wabaId, accessToken, limit = 100 }) {
  return graphFetch(
    graphUrl(`${wabaId}/message_templates?fields=name,status,category,language,components,rejected_reason&limit=${limit}`),
    { accessToken },
  )
}

export async function deleteMessageTemplate({ wabaId, accessToken, name }) {
  return graphFetch(graphUrl(`${wabaId}/message_templates?name=${encodeURIComponent(name)}`), { method: 'DELETE', accessToken })
}

export async function sendTemplateMessage({ phoneNumberId, to, templateName, languageCode, components, accessToken }) {
  return graphFetch(graphUrl(`${phoneNumberId}/messages`), {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components?.length ? { components } : {}),
      },
    },
  })
}

/** Downloads media bytes from a Meta-issued URL (must carry the same access token). */
export async function downloadMediaBuffer(url, accessToken) {
  let response
  try {
    response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } })
  } catch (err) {
    throw httpError(503, 'WHATSAPP_NETWORK_ERROR', 'Could not download WhatsApp media.', { cause: err?.message })
  }
  if (!response.ok) {
    throw httpError(502, 'WHATSAPP_MEDIA_DOWNLOAD_FAILED', `Media download failed (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
