import { google } from 'googleapis'
import { readGoogleOAuthEnv } from '../services/google/googleEnv.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Public OAuth redirect target (no Bearer token). Google appends ?code=...
 * after the user signs in — you do not paste client_id or redirect_uri; they are already in the first URL.
 */
export async function googleCallback(req, res) {
  const code = req.query.code

  if (!code) {
    return res.status(400).send(
      page(
        'Missing authorization code',
        '<p>Google should redirect here with <code>?code=...</code> in the URL. Start again from the link printed by <code>node scripts/getGoogleRefreshToken.js</code>.</p>',
      ),
    )
  }

  const env = readGoogleOAuthEnv()
  if (!env.clientId || !env.clientSecret || !env.redirectUri) {
    return res.status(500).send(
      page(
        'Server misconfigured',
        '<p>Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>GOOGLE_REDIRECT_URI</code> in <code>.env</code>, then restart the API.</p>',
      ),
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    env.clientId,
    env.clientSecret,
    env.redirectUri,
  )

  try {
    const { tokens } = await oauth2Client.getToken(String(code))
    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      return res.status(200).send(
        page(
          'No refresh token',
          `<p>Google did not return a refresh token. Fix:</p>
          <ol>
            <li>Open <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google account permissions</a> and remove access for this app.</li>
            <li>Run <code>node scripts/getGoogleRefreshToken.js</code> again and complete consent with the same account.</li>
          </ol>`,
        ),
      )
    }

    const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`
    return res.status(200).send(
      page(
        'Calendar connected',
        `<p><strong>Add this line</strong> to your repo root <code>.env</code> (or <code>server/.env</code>), then restart the API:</p>
        <pre id="tok" style="white-space:pre-wrap;word-break:break-all;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(line)}</pre>
        <p><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('tok').textContent)">Copy line</button></p>
        <p class="muted">You can close this tab.</p>`,
      ),
    )
  } catch (err) {
    const detail = err.response?.data
    // eslint-disable-next-line no-console
    console.error('Google OAuth callback:', detail || err.message)
    return res.status(500).send(
      page(
        'Token exchange failed',
        `<p>${escapeHtml(err.message)}</p>${
          detail
            ? `<pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(detail, null, 2))}</pre>`
            : ''
        }`,
      ),
    )
  }
}

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;line-height:1.5}
.muted{color:#666;font-size:0.9rem}</style></head><body>
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
</body></html>`
}
