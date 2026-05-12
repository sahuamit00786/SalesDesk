/**
 * Obtain a new GOOGLE_REFRESH_TOKEN after invalid_grant / revoked tokens.
 *
 * 1. In Google Cloud Console → APIs & Services → OAuth client:
 *    - Authorized redirect URI must exactly match GOOGLE_REDIRECT_URI in .env
 *      (e.g. http://localhost:4000/api/v1/google/callback if you use the in-app route).
 * 2. Start the API (npm run dev:server) so http://localhost:4000 is up.
 * 3. Run from repo root: node scripts/getGoogleRefreshToken.js
 * 4. Open the printed URL as-is — client_id and redirect_uri are already inside that long link; you do not enter them separately.
 * 5. After you approve, the browser opens /api/v1/google/callback and shows GOOGLE_REFRESH_TOKEN=... to copy into .env.
 *    (Or paste the `code` from the address bar into this script if you prefer the terminal.)
 * 6. Restart the API.
 *
 * If refresh_token is undefined: open https://myaccount.google.com/permissions
 * and remove this app, then run this script again (prompt=consent forces a new refresh token).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'readline'
import dotenv from 'dotenv'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const serverEnv = path.join(root, 'server', '.env')
const rootEnv = path.join(root, '.env')
if (fs.existsSync(serverEnv)) dotenv.config({ path: serverEnv })
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv, override: true })

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const redirectUri = process.env.GOOGLE_REDIRECT_URI

if (!clientId || !clientSecret || !redirectUri) {
  console.error(
    'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in repo root .env or server/.env first.',
  )
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

const scopes = ['https://www.googleapis.com/auth/calendar']

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
})

console.log('\nOpen this URL in a browser:\n')
console.log(authUrl)
console.log(
  '\nAfter approving, you will be redirected. Copy the full `code` query value from the address bar (or the page if it shows an error — use the code from the URL).\n',
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Paste the authorization code here: ', async (code) => {
  const trimmed = code.trim()
  try {
    const { tokens } = await oauth2Client.getToken(trimmed)
    if (!tokens.refresh_token) {
      console.error(
        '\nNo refresh_token returned. Fix:\n' +
          '  • Visit https://myaccount.google.com/permissions — remove access for this app.\n' +
          '  • Run this script again and use the same Google account.\n' +
          '  • Ensure prompt=consent (already set in this script).\n',
      )
      rl.close()
      process.exit(1)
    }
    console.log('\nAdd this line to your .env (repo root or server/.env):\n')
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token + '\n')
  } catch (e) {
    console.error('\nToken exchange failed:', e.message)
    if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2))
    process.exit(1)
  }
  rl.close()
})
