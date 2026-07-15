import { useEffect, useMemo, useState } from "react";
import { Bell, Video } from '@/components/ui/icons';
import { Button } from "@/components/ui/Button";
import { useGetMeetingsQuery } from "../meetingsApi";

export function MeetingNotificationBell() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { data } = useGetMeetingsQuery();

  // ⏱ update every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ✅ FIXED FILTER LOGIC
  const upcomingAlerts = useMemo(() => {
    const meetings = data?.data || [];

    return meetings
      .filter((m) => m.status === "scheduled")
      .map((m) => {
        const start = new Date(m.scheduledStart).getTime();
        const end = new Date(m.scheduledEnd).getTime();

        const isLive = now >= start && now <= end;
        const isUpcoming = start > now;

        return {
          ...m,
          isLive,
          isUpcoming,
          mins: Math.floor((start - now) / 60000),
        };
      })
      .filter((m) => m.isLive || m.isUpcoming) // ✅ keep both
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
      .slice(0, 5); // optional limit
  }, [data, now]);

  return (
    <div className="relative">
      <Button
        variant="icon"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative"
      >
        <Bell className="w-5 h-5" />

        {upcomingAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {upcomingAlerts.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-surface-border bg-white shadow-2xl">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Meetings</h3>
          </div>

          <div className="max-h-[420px] overflow-auto">
            {!upcomingAlerts.length && (
              <div className="p-6 text-sm text-gray-500">
                No meetings found
              </div>
            )}

            {upcomingAlerts.map((meeting) => {
              const hasLink = !!meeting.googleMeetLink;

              return (
                <div
                  key={meeting.id}
                  className="p-4 border-b hover:bg-slate-50"
                >
                  <div className="flex justify-between items-start gap-3">
                    {/* LEFT */}
                    <div>
                      <p className="font-medium">{meeting.title}</p>

                      {/* STATUS */}
                      {meeting.isLive ? (
                        <p className="text-xs text-green-600 mt-1">
                          🔴 Live now
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Starts in {meeting.mins} min
                        </p>
                      )}

                      <p className="text-xs text-gray-400">
                        {new Date(
                          meeting.scheduledStart
                        ).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* RIGHT ACTION */}
                    <button
                      onClick={() => {
                        if (hasLink) {
                          window.open(meeting.googleMeetLink, "_blank");
                        } else {
                          alert(
                            "Meeting link not available. Please check meeting details."
                          );
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs ${
                        hasLink
                          ? "bg-[var(--brand-primary)] cx-icon-inherit text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      Join
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}