import { PageShell } from "@/components/layout/PageShell";
import { useDeleteMeetingMutation } from "../meetingsApi";
import { Pencil, Trash2, Video } from "lucide-react";

export function MeetingsCalendar({ meetings, onEdit }) {
  const [deleteMeeting] = useDeleteMeetingMutation();

  if (!meetings || meetings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center">
        <h2 className="font-semibold mb-2">Upcoming Meetings</h2>
        <p className="text-sm text-gray-500">No meetings found</p>
      </div>
    );
  }

  return (
    <PageShell fullWidth>
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold mb-5">Upcoming Meetings</h2>

        <div className="space-y-4">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="border rounded-xl p-4 flex justify-between items-center"
            >
              {/* LEFT */}
              <div>
                <h3 className="font-medium">{m.title}</h3>

                <p className="text-sm text-gray-500">
                  {m.meetingType}
                </p>

                <p className="text-xs text-gray-400">
                  {new Date(m.scheduledStart).toLocaleString()}
                </p>
              </div>

              {/* RIGHT ACTIONS */}
              <div className="flex items-center gap-3">
                {/* ✏️ EDIT */}
                <button
                  onClick={() => onEdit?.(m)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  title="Edit meeting"
                >
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>

                {/* 🎥 JOIN */}
                {m.googleMeetLink ? (
                  <a
                    href={m.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Join meeting"
                  >
                    <Video className="w-4 h-4 text-green-600" />
                  </a>
                ) : (
                  <span
                    className="p-2 rounded-lg opacity-40 cursor-not-allowed"
                    title="No meeting link"
                  >
                    <Video className="w-4 h-4 text-gray-400" />
                  </span>
                )}

                {/* 🗑 DELETE */}
                <button
                  onClick={async () => {
                    if (confirm("Delete this meeting?")) {
                      await deleteMeeting(m.id);
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-red-50"
                  title="Delete meeting"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}