import {
  Video,
  FileText,
  Download,
  Mic,
} from '@/components/ui/icons';

import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { BotStatusBadge } from "./BotStatusBadge";

export function MeetingCard({
  meeting,
  onEdit,
}) {
  const expired =
    meeting.status === "completed" ||
    meeting.status === "cancelled" ||
    meeting.status === "missed";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      {/* TOP */}
      <div className="flex items-start justify-between">

        <div>
          <h3 className="text-lg font-semibold">
            {meeting.title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {meeting.meetingType}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            {new Date(
              meeting.scheduledStart
            ).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <MeetingStatusBadge
            status={meeting.status}
          />

          <BotStatusBadge
            status={meeting.bot_status}
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-3 mt-6">

        {/* JOIN */}
        {meeting.googleMeetLink &&
        !expired ? (
          <a
            href={meeting.googleMeetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold cx-icon-inherit text-white hover:bg-green-700"
          >
            <Video className="h-4 w-4" />
            Join
          </a>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
          >
            <Video className="h-4 w-4" />
            Expired
          </button>
        )}

        {/* RECORDING */}
        {meeting.audio_file_path && (
          <a
            href={meeting.audio_file_path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
          >
            <Mic className="h-4 w-4" />
            Recording
          </a>
        )}

        {/* TRANSCRIPT */}
        {meeting.transcript_pdf_url && (
          <a
            href={meeting.transcript_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
          >
            <FileText className="h-4 w-4" />
            Transcript
          </a>
        )}

        {/* SUMMARY */}
        {meeting.summary_pdf_url && (
          <a
            href={meeting.summary_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Summary
          </a>
        )}
      </div>

      {/* AI SUMMARY */}
      {meeting.summary_text && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <h4 className="font-medium mb-2">
            AI Summary
          </h4>

          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {meeting.summary_text}
          </p>
        </div>
      )}
    </div>
  );
}