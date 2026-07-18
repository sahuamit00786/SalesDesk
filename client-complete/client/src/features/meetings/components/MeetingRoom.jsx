import { LiveTranscriptPanel } from "./LiveTranscriptPanel";

export function MeetingRoom({ meeting }) {
  return (
    <div className="grid grid-cols-4 gap-6 p-6">
      <div className="col-span-3">
        <div className="bg-black rounded-2xl h-[600px] flex items-center justify-center text-white">
          Embedded Google Meet/WebRTC Room
        </div>

        <div className="flex gap-3 mt-4">
          <button className="px-4 py-2 rounded-lg border">Mic</button>

          <button className="px-4 py-2 rounded-lg border">Camera</button>

          <button className="px-4 py-2 rounded-lg border">Share</button>
        </div>
      </div>

      <div className="col-span-1">
        <LiveTranscriptPanel meetingId={meeting.id} />
      </div>
    </div>
  );
}
