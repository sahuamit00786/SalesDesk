import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
} from "../meetingsApi";
import { MeetingBotSetupHint } from "@/features/meetings/components/MeetingBotSetupHint";

// ✅ helper to generate form state
function getInitialForm(initialData) {
  if (!initialData) {
    return {
      title: "",
      meetingType: "demo",
      agenda: "",
      scheduledStart: "",
      scheduledEnd: "",
      participants: [],
      recordingBotConsent: false,
    };
  }

  return {
    title: initialData.title || "",
    meetingType: initialData.meetingType || "demo",
    agenda: initialData.agenda || "",
    scheduledStart: initialData.scheduledStart
      ? initialData.scheduledStart.slice(0, 16)
      : "",
    scheduledEnd: initialData.scheduledEnd
      ? initialData.scheduledEnd.slice(0, 16)
      : "",
    participants:
      initialData.participants?.map((p) => ({
        userId: p.userId,
      })) || [],
    recordingBotConsent: Boolean(initialData.recordingBotConsent),
  };
}

export function CreateMeetingModal({
  open,
  onClose,
  users = [],
  leadId,
  initialData = null,
}) {
  const [createMeeting, { isLoading: creating }] =
    useCreateMeetingMutation();

  const [updateMeeting, { isLoading: updating }] =
    useUpdateMeetingMutation();

  const isEdit = !!initialData;

  const [form, setForm] = useState(getInitialForm(initialData));

  // ✅ Sync only when modal opens
  useEffect(() => {
    if (!open) return;
    setForm(getInitialForm(initialData));
  }, [open, initialData]);

  if (!open) return null;

  function update(field, val) {
    setForm((prev) => ({
      ...prev,
      [field]: val,
    }));
  }

  // ✅ toggle attendees
  function toggleParticipant(userId) {
    const exists = form.participants.some(
      (p) => p.userId === userId
    );

    if (exists) {
      update(
        "participants",
        form.participants.filter((p) => p.userId !== userId)
      );
    } else {
      update("participants", [
        ...form.participants,
        { userId },
      ]);
    }
  }

  async function submit() {
    try {
      if (!leadId && !initialData?.leadId) {
        toast.error("Lead is required");
        return;
      }

      const payload = {
        ...form,
        leadId: initialData?.leadId || leadId,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
        recordingBotConsent: Boolean(form.recordingBotConsent),
      };

      if (isEdit) {
        await updateMeeting({
          id: initialData.id,
          ...payload,
        }).unwrap();

        toast.success("Meeting updated");
      } else {
        const res = await createMeeting(payload).unwrap();
        toast.success("Meeting created");
        if (
          res.meta?.botConsent?.skippedReason === "NO_GOOGLE_MEET_LINK"
        ) {
          toast.error(
            "Recording bot was not saved: Calendar did not return a Google Meet link. Fix Meet on the calendar event, then enable bot consent on this meeting.",
            { duration: 7000 }
          );
        }
      }

      handleClose();
    } catch (e) {
      console.error(e);
      toast.error("Could not save meeting");
    }
  }

  function handleClose() {
    onClose();
    setForm(getInitialForm(null));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-5">
          {isEdit ? "Edit Meeting" : "Schedule Meeting"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* TITLE */}
          <input
            className="border rounded-lg p-3"
            placeholder="Meeting title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />

          {/* TYPE */}
          <select
            className="border rounded-lg p-3"
            value={form.meetingType}
            onChange={(e) => update("meetingType", e.target.value)}
          >
            <option value="demo">Demo</option>
            <option value="follow_up">Follow Up</option>
            <option value="closing">Closing</option>
            <option value="internal">Internal</option>
          </select>

          {/* START */}
          <input
            type="datetime-local"
            className="border rounded-lg p-3"
            value={form.scheduledStart}
            onChange={(e) =>
              update("scheduledStart", e.target.value)
            }
          />

          {/* END */}
          <input
            type="datetime-local"
            className="border rounded-lg p-3"
            value={form.scheduledEnd}
            onChange={(e) =>
              update("scheduledEnd", e.target.value)
            }
          />

          {/* AGENDA */}
          <textarea
            className="border rounded-lg p-3 col-span-2"
            rows="4"
            placeholder="Agenda"
            value={form.agenda}
            onChange={(e) => update("agenda", e.target.value)}
          />

          {/* Recording bot (organizer consent — backend runs on API server) */}
          <label className="col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-border bg-slate-50/80 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.recordingBotConsent}
              onChange={(e) =>
                update("recordingBotConsent", e.target.checked)
              }
            />
            <span className="text-sm">
              <span className="font-medium text-ink">
                Enable AI recording bot
              </span>
              <span className="block text-ink-muted">
                After you confirm (here or in the banner before the call), the
                server can join Meet to record, transcribe, and summarize. Requires
                server setup (FFmpeg, Playwright, Groq key).
              </span>
              <div className="mt-2">
                <MeetingBotSetupHint />
              </div>
            </span>
          </label>

          {/* 👥 ATTENDEES */}
          <div className="col-span-2">
            <label className="text-sm font-medium">
              Attendees
            </label>

            <div className="border rounded-xl mt-2 p-3 max-h-48 overflow-auto space-y-2">
              {users.map((user) => {
                const selected = form.participants.some(
                  (p) => p.userId === user.id
                );

                return (
                  <div
                    key={user.id}
                    onClick={() => toggleParticipant(user.id)}
                    className={`flex justify-between items-center px-2 py-2 rounded cursor-pointer ${
                      selected
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <span>{user.name || user.email}</span>

                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                    />
                  </div>
                );
              })}

              {!users.length && (
                <p className="text-xs text-gray-400">
                  No users available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            disabled={creating || updating}
            onClick={submit}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg"
          >
            {creating || updating
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
              ? "Update Meeting"
              : "Create Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}