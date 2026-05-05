import readline from 'readline'
import { google } from 'googleapis'
// import dotenv from 'dotenv'
// dotenv.config()

const oauth2Client = new google.auth.OAuth2(
process.env.GOOGLE_CLIENT_ID,
process.env.GOOGLE_CLIENT_SECRET,
process.env.GOOGLE_REDIRECT_URI
)

const scopes=[
'https://www.googleapis.com/auth/calendar'
]

const authUrl=oauth2Client.generateAuthUrl({
access_type:'offline',
prompt:'consent',
scope:scopes
})

console.log('\nOpen this URL:\n')
console.log(authUrl)

const rl=readline.createInterface({
input:process.stdin,
output:process.stdout
})

rl.question('\nPaste code here: ', async(code)=>{

const {tokens}=await oauth2Client.getToken(code)

console.log('\nRefresh token:\n')
console.log(tokens.refresh_token)

rl.close()

})