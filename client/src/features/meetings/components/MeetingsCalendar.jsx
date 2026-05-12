import { PageShell } from "@/components/layout/PageShell";

import {
  Pencil,
  Trash2,
  Video,
  FileText,
  Download,
  Mic,
} from "lucide-react";

import { useDeleteMeetingMutation } from "../meetingsApi";

import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { BotStatusBadge } from "./BotStatusBadge";

export function MeetingsCalendar({
  meetings,
  onEdit,
}) {
  const [deleteMeeting] =
    useDeleteMeetingMutation();

  if (!meetings || meetings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center">
        <h2 className="font-semibold mb-2">
          Meetings
        </h2>

        <p className="text-sm text-gray-500">
          No meetings found
        </p>
      </div>
    );
  }

  return (
    <PageShell fullWidth>
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold mb-5 text-lg">
          Meetings
        </h2>

        <div className="space-y-5">
          {meetings.map((meeting) => {
            // =====================================================
            // STATUS LOGIC
            // =====================================================

            const now = Date.now();

            const startTime =
              new Date(
                meeting.scheduledStart
              ).getTime();

            const endTime =
              new Date(
                meeting.scheduledEnd
              ).getTime();

            const isCompleted =
              meeting.status ===
              "completed";

            const isCancelled =
              meeting.status ===
              "cancelled";

            const isMissed =
              meeting.status === "missed";

            const expired =
              isCompleted ||
              isCancelled ||
              isMissed ||
              now > endTime;

            const disableJoin =
              !meeting.googleMeetLink ||
              expired;

            return (
              <div
                key={meeting.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                {/* ================================================= */}
                {/* TOP */}
                {/* ================================================= */}

                <div className="flex items-start justify-between gap-4">
                  {/* LEFT */}
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {meeting.title}
                      </h3>

                      <MeetingStatusBadge
                        status={
                          expired &&
                          !isCompleted
                            ? "expired"
                            : meeting.status
                        }
                      />

                      <BotStatusBadge
                        status={
                          meeting.bot_status
                        }
                      />
                    </div>

                    <p className="text-sm text-gray-500 mt-2">
                      {
                        meeting.meetingType
                      }
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(
                        meeting.scheduledStart
                      ).toLocaleString()}
                    </p>

                    {meeting.agenda && (
                      <p className="text-sm text-gray-700 mt-4 max-w-3xl">
                        {meeting.agenda}
                      </p>
                    )}
                  </div>

                  {/* ================================================= */}
                  {/* RIGHT ACTIONS */}
                  {/* ================================================= */}

                  <div className="flex items-center gap-2">
                    {/* EDIT */}
                    <button
                      onClick={() =>
                        onEdit?.(meeting)
                      }
                      className="p-2 rounded-lg hover:bg-gray-100"
                      title="Edit meeting"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* DELETE */}
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Delete this meeting?"
                          )
                        ) {
                          await deleteMeeting(
                            meeting.id
                          );
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-50"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* ================================================= */}
                {/* ACTION BUTTONS */}
                {/* ================================================= */}

                <div className="flex flex-wrap gap-3 mt-6">
                  {/* JOIN */}
                  {disableJoin ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 cursor-not-allowed"
                    >
                      <Video className="h-4 w-4" />

                      {isCompleted
                        ? "Completed"
                        : expired
                        ? "Expired"
                        : "No Link"}
                    </button>
                  ) : (
                    <a
                      href={
                        meeting.googleMeetLink
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </a>
                  )}

                  {/* RECORDING */}
                  {meeting.audio_file_path && (
                    <a
                      href={
                        meeting.audio_file_path
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <Mic className="h-4 w-4" />
                      Recording
                    </a>
                  )}

                  {/* TRANSCRIPT PDF */}
                  {meeting.transcript_pdf_url && (
                    <a
                      href={
                        meeting.transcript_pdf_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" />
                      Transcript
                    </a>
                  )}

                  {/* SUMMARY PDF */}
                  {meeting.summary_pdf_url && (
                    <a
                      href={
                        meeting.summary_pdf_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Summary
                    </a>
                  )}
                </div>

                {/* ================================================= */}
                {/* AI SUMMARY */}
                {/* ================================================= */}

                {meeting.summary_text && (
                  <div className="mt-6 rounded-xl bg-slate-50 p-4 border">
                    <h4 className="font-semibold mb-3">
                      AI Meeting Summary
                    </h4>

                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                      {
                        meeting.summary_text
                      }
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}