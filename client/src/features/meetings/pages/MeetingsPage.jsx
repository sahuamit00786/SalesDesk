import { useGetMeetingsQuery } from "../meetingsApi";
import { CreateMeetingModal } from "@/features/meetings/components/CreateMeetingModal";
import { useGetLeadFormMetaQuery } from "@/features/leads/leadsApi"; // ✅ ADD THIS
import { MeetingsCalendar } from "../components/MeetingsCalendar";
import { useState } from "react";


export function MeetingsPage() {
  const { data, isLoading } = useGetMeetingsQuery();
   // ✅ GET USERS
  const { data: formMeta } = useGetLeadFormMetaQuery();

  const users = formMeta?.data?.users || []; // ✅ FIX

  const [editMeeting, setEditMeeting] = useState(null);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

//   console.log("RAW:", data);

  // ✅ FIX HERE
//   const meetings = data?.data?.data || [];
const meetings = data?.data || [];

// console.log("API:", data);
// console.log("Meetings:", meetings);

//   console.log("MEETINGS:", meetings); // debug once

  return (
    <>

      <MeetingsCalendar
        meetings={meetings}
        onEdit={(m) => setEditMeeting(m)}
      />

      <CreateMeetingModal
        open={!!editMeeting}
        initialData={editMeeting}
        onClose={() => setEditMeeting(null)}
        users={users}   // ✅ now defined
        leadId={editMeeting?.leadId} // ✅ important for edit
      />
</>
  );
}