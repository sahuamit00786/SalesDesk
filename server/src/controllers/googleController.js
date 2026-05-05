// import { google } from 'googleapis'
// import dotenv from 'dotenv'

// dotenv.config()

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// )

// export async function googleCallback(req, res) {
//   const code = req.query.code

//   if (!code) {
//     return res.status(400).json({
//       success: false,
//       message: 'Authorization code missing'
//     })
//   }

//   try {
//     const { tokens } = await oauth2Client.getToken(code)

//     oauth2Client.setCredentials(tokens)

//     console.log('Tokens:', tokens)

//     // TODO: Save refresh_token in DB linked to user
//     // Example:
//     // await saveGoogleTokens(req.user.id, tokens)

//     res.send('Google authentication successful! You can close this tab.')
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get tokens'
//     })
//   }
// }


import { google } from 'googleapis'

export async function googleCallback(req, res) {
  try {
    const code = req.query.code

    console.log('👉 CODE RECEIVED:', code)

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)

    console.log('✅ TOKENS:', tokens)

    res.json({
      success: true,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
    })

  } catch (err) {
    console.error('❌ GOOGLE TOKEN ERROR:', err.response?.data || err.message)

    res.status(500).json({
      success: false,
      message: 'Failed to get tokens',
      error: err.message,
    })
  }
}