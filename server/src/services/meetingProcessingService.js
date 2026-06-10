import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Meeting } from '../models/Meeting.js'
import { MeetingTranscript } from '../models/MeetingTranscript.js'
import { generateSummary } from './meetingSummaryService.js'
import { generatePdf } from './pdfService.js'

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function publicApiBase() {
  const raw = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`
  return String(raw).replace(/\/$/, '')
}

/**
 * Process a captured caption transcript:
 * save to DB, generate PDFs, generate AI summary.
 *
 * @param {object} meetingInstance - Sequelize Meeting instance
 * @param {string} transcript - Full text captured from Google Meet captions
 */
export async function processMeetingRecording(meetingInstance, transcript) {
  const meeting = meetingInstance
  const base = publicApiBase()
  const id = meeting.id

  await meeting.update({
    botStatus: 'processing',
    recordingStatus: 'completed',
  })

  try {
    if (!transcript?.trim()) {
      throw new Error('No captions captured — ensure Google Workspace Live Captions are enabled')
    }

    await meeting.update({ transcriptionStatus: 'processing' })
    console.log(`📝 Saving transcript for ${meeting.title}`)

    // Insert one row per caption line
    const lines = transcript.split('\n').filter(Boolean)
    if (lines.length > 0) {
      await MeetingTranscript.bulkCreate(
        lines.map((line, i) => ({
          meetingId: id,
          speaker: 'Unknown',
          speakerType: 'bot',
          timeStamp: i * 5000,
          utterance: line,
          confidence: 1.0,
        })),
        { ignoreDuplicates: true },
      )
    }

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
    console.error('❌ Processing failed:', err?.message || err)
    await meeting.update({
      transcriptionStatus: 'pending',
      aiSummaryStatus: 'pending',
      botStatus: 'failed',
    })
  }
}

/** Used by BullMQ worker — reloads meeting from DB then runs full pipeline. */
export async function processMeetingById(meetingId, transcript) {
  const meeting = await Meeting.findByPk(meetingId)
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`)
  await processMeetingRecording(meeting, transcript)
}
