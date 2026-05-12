import cron from 'node-cron'
import { Op } from 'sequelize'
import { Meeting } from '../models/Meeting.js'

import { notifyMeetingParticipants } from '../services/notification/meetingNotificationService.js'
import { runMeetingBot } from '../bot/meetingBot.js'
import { transcribeAudio } from '../services/transcriptionService.js'
import { generateSummary } from '../services/meetingSummaryService.js'
import { generatePdf } from '../services/pdfService.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { envTruthy } from '../utils/envTruthy.js'

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function publicApiBase() {
  const raw =
    process.env.PUBLIC_API_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  return String(raw).replace(/\/$/, '')
}

function meetingBotEnabled() {
  return envTruthy('ENABLE_MEETING_BOT', false)
}

async function sendReminder(meeting) {
  console.log(`Reminder sent for ${meeting.title}`)
  await notifyMeetingParticipants(meeting)
}

/** Used after meeting create — hook reserved for delayed jobs */
export async function scheduleReminders(_meeting) {
  return true
}

async function processMeetingRecording(meetingInstance, audioPath) {
  const meeting = meetingInstance
  const base = publicApiBase()
  const id = meeting.id

  console.log(`🎙 Recording saved for ${meeting.title}`)

  await meeting.update({
    botStatus: 'processing',
    recordingStatus: 'completed',
    audioFilePath: `${base}/recordings/meetings/${id}.wav`,
  })

  try {
    await meeting.update({ transcriptionStatus: 'processing' })
    console.log(`📝 Transcribing ${meeting.title}`)
    const transcript = await transcribeAudio(audioPath)

    await meeting.update({
      transcriptionStatus: 'completed',
      transcriptText: transcript,
      aiSummaryStatus: 'processing',
    })

    console.log(`🤖 Generating AI summary for ${meeting.title}`)
    const summary = await generateSummary(transcript)

    const transcriptPdfAbs = path.join(serverRoot, 'pdfs', 'transcripts', `${id}.pdf`)
    const summaryPdfAbs = path.join(serverRoot, 'pdfs', 'summaries', `${id}.pdf`)

    await generatePdf(transcriptPdfAbs, 'Meeting Transcript', transcript)
    await generatePdf(summaryPdfAbs, 'Meeting Summary', summary)

    await meeting.update({
      summaryText: summary,
      transcriptPdfUrl: `${base}/pdfs/transcripts/${id}.pdf`,
      summaryPdfUrl: `${base}/pdfs/summaries/${id}.pdf`,
      botStatus: 'completed',
      aiSummaryStatus: 'completed',
      status: 'completed',
    })

    console.log(`✅ AI pipeline completed for ${meeting.title}`)
  } catch (err) {
    console.error('❌ Transcription / summary failed:', err?.message || err)
    await meeting.update({
      transcriptionStatus: 'pending',
      aiSummaryStatus: 'pending',
      botStatus: 'failed',
    })
  }
}

async function tryStartBotForMeeting(meetingRow) {
  if (!meetingBotEnabled()) {
    if (envTruthy('MEETING_BOT_DEBUG', false)) {
      console.log(
        '[cron] bot skipped: set ENABLE_MEETING_BOT=true (or 1/yes/on) in .env',
      )
    }
    return
  }

  const link = meetingRow.googleMeetLink?.trim()
  if (!link) return

  const [claimedCount] = await Meeting.update(
    { botStatus: 'joining', recordingStatus: 'recording' },
    {
      where: {
        id: meetingRow.id,
        botStatus: 'scheduled',
      },
    },
  )

  if (!claimedCount) return

  const meeting = await Meeting.findByPk(meetingRow.id)
  if (!meeting) return

  console.log(`🤖 Starting bot for ${meeting.title}`)

  runMeetingBot(meeting.get({ plain: true }))
    .then((audioPath) => processMeetingRecording(meeting, audioPath))
    .catch(async (e) => {
      console.error('❌ BOT / pipeline failed:', e?.message || e)
      await Meeting.update(
        { botStatus: 'failed', recordingStatus: 'pending' },
        { where: { id: meeting.id } },
      )
    })
}

export function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()

      // --- Mark LIVE (before bot so status matches window) ---
      const liveMeetings = await Meeting.findAll({
        where: {
          status: 'scheduled',
          scheduledStart: { [Op.lte]: now },
          scheduledEnd: { [Op.gte]: now },
        },
      })
      for (const m of liveMeetings) {
        await m.update({ status: 'live' })
        console.log(`🔴 Meeting is LIVE: ${m.title}`)
      }

      // --- Bot + recording during scheduled window ---
      const botCandidates = await Meeting.findAll({
        where: {
          recordingBotConsent: true,
          botStatus: 'scheduled',
          googleMeetLink: { [Op.ne]: null },
          scheduledStart: { [Op.lte]: now },
          scheduledEnd: { [Op.gt]: now },
          status: { [Op.in]: ['scheduled', 'live'] },
        },
      })

      if (envTruthy('MEETING_BOT_DEBUG', false)) {
        console.log(
          `[cron] bot candidates: ${botCandidates.length}, ENABLE_MEETING_BOT=${meetingBotEnabled()}, now=${now.toISOString()}`,
        )
      }

      for (const m of botCandidates) {
        await tryStartBotForMeeting(m)
      }

      // --- Reminders (next 10 minutes) ---
      const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
      const upcomingMeetings = await Meeting.findAll({
        where: {
          status: 'scheduled',
          scheduledStart: {
            [Op.between]: [now, tenMinLater],
          },
        },
      })
      for (const meeting of upcomingMeetings) {
        await sendReminder(meeting)
      }

      // --- Mark COMPLETED after end time ---
      const completedMeetings = await Meeting.findAll({
        where: {
          status: { [Op.in]: ['scheduled', 'live'] },
          scheduledEnd: { [Op.lt]: now },
        },
      })
      for (const meeting of completedMeetings) {
        await meeting.update({ status: 'completed' })
        console.log(`✅ Meeting marked completed: ${meeting.title}`)
      }
    } catch (e) {
      console.error('❌ Meeting cron failed:', e.message)
    }
  })

  console.log(
    '[cron] Meeting job scheduled (* * * * *). ENABLE_MEETING_BOT=%s',
    meetingBotEnabled() ? 'true' : 'false',
  )
}
