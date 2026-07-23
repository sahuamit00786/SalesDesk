# Knowledge Base — Engage Modules (Activities, Tasks, Calendar & Reminders, Meetings, Calls, Email, Templates)

## 1. Activities

### Overview
Activities are the automatic timeline of everything that happens on a lead or opportunity — calls, emails, meetings, notes, follow-ups, status changes. It exists so anyone on the team can open a lead and instantly see its full history without asking a colleague "what happened last time?" You don't usually create activities by hand (except notes and follow-up reminders); most are logged automatically when you send an email, log a call, hold a meeting, or change a task.

### FAQ

**Q: Where do I see all activity across every lead, not just one?**
Go to the **Activities** page. It shows a combined feed across your whole team, with filters for lead/opportunity, activity type, date range, and "by whom."

**Q: What do the colors and icons next to each activity mean?**
Each activity type (Call, Email, Meeting, Note, Demo, Discovery, Follow-up, In-person visit, Task) has its own color and icon so you can scan the feed quickly — e.g. calls are teal with a phone icon, emails are blue with a mail icon, meetings are purple with a calendar icon, notes are amber. Admins can customize the name, color, and icon per activity type (see below).

**Q: Can I create custom activity types?**
Yes — if you have admin-level access to Activities, you can add, edit, or remove activity types (name, color, icon).

**Q: What's the difference between a "Note" and a "Follow-up" in the feed?**
Notes render as free-form rich text (things you typed on the lead). Follow-ups are timed reminders — the system detects them either by activity type or by keywords like "follow-up," "follow up," or "reminder" in the text, and shows a live countdown ("in 2h 15m" or "Time over") next to them.

**Q: Can I filter the feed by a specific teammate?**
Yes, the "By whom" dropdown filters to activities logged by a specific team member.

**Q: How far back does search go, and does it auto-refresh?**
The feed paginates 30 items at a time and refreshes automatically every 60 seconds while you have it open.

**Q: Can I delete an activity?**
Activity type definitions (the categories) can be deleted by an admin. Individual activity log entries tied to a lead are managed from the lead's own activity tab, not from the global feed.

### Step-by-step: Reviewing a lead's history
1. Go to Activities (global) or open a specific lead and use its Activity tab.
2. Use the search box to jump to a lead/opportunity by name, company, or email.
3. Narrow with the date range and activity-type filters.
4. Click a lead name inside a timeline card to jump straight to that lead.

### Tips & common mistakes
- If a note isn't showing formatting (bold, links), it's likely because it was typed as plain text — the feed only renders HTML-style notes with formatting.
- Don't rely on the Activities feed as your task list — for actionable to-dos, use Tasks instead; Activities is a history log.

### Troubleshooting
**Q: I don't see an activity for an email I just sent — why?**
Give it a moment; some activity types are written asynchronously right after the action completes. If it never appears, check you're filtered to the correct lead/date range/type — the "Clear" filters button resets everything.

### Permissions
Viewing the Activities feed requires the **Engage → Activities: View** permission. Creating custom activity types (or editing/deleting them) requires **Engage → Activities: Admin**. Creating individual activity records (e.g., logging a note on a lead) requires **Engage → Activities: Create**.

### Glossary
- **Activity** — a single logged event on a lead's timeline (call, email, meeting, note, follow-up, etc.).
- **Activity type** — the category/label with its own color and icon, configurable by admins.
- **Follow-up** — a scheduled callback/reminder recorded as an activity with a due time.

---

## 2. Tasks

### Overview
Tasks are your team's to-do list tied to leads — things like "send proposal," "call back Thursday," or "prepare demo deck." They exist to make sure follow-through on leads doesn't fall through the cracks. Tasks have a status (Pending, In progress, Completed, Cancelled), a priority (Urgent, High, Medium, Low), a due date, an optional checklist (subtasks), and can be assigned to any teammate.

### FAQ

**Q: What views are available for Tasks?**
Three: **List** (grouped by status or priority, with due-date quick filters), **Board** (kanban-style, drag between columns), and **Calendar** (tasks plotted on a shared calendar).

**Q: What do the status colors mean?**
- Pending — violet
- In progress — amber
- Completed — emerald green
- Cancelled — grey

**Q: What do the priority flag colors mean?**
- Urgent — rose/red
- High — red
- Medium — amber
- Low — emerald green

**Q: How do I know if a task is overdue?**
Overdue tasks (open tasks — Pending or In Progress — whose due date has passed) are flagged with a warning icon, and the quick filter bar has a dedicated "Overdue" tab. There's also a "Not overdue," "Due today," and "Upcoming" quick filter.

**Q: How do I filter tasks by lead, assignee, or due-date range?**
Click **Filter** to open the filter modal — search a lead by name, pick "Assigned to" from your team, and set a due-date range. Active filters show as removable chips.

**Q: How do I sort the task list?**
Click **Sort By** — you can sort by due date, created date, title, or priority, ascending or descending.

**Q: Can I bulk-complete tasks?**
Yes — in List view, use "Mark all completed" on a group of open tasks; it processes them in batches and reports how many succeeded/failed.

**Q: What happens when I check off a subtask (checklist item)?**
The parent task's progress bar updates (e.g. "2/5" or a percentage). Completing the parent task itself sets progress to 100% regardless of checklist state; cancelling sets it to 0%.

**Q: Can I move a task's status/priority quickly without opening it?**
Yes — drag a card between columns on the Board view, or use inline quick actions on a list row; both call the same "quick patch" that updates just that field.

**Q: How do I create a new task?**
Click **New Task** — this opens the same task drawer used from a lead's page. Tasks must be tied to a lead.

### Step-by-step: Creating and tracking a task
1. Click **New Task** in the top bar (or add one from a lead's Tasks tab).
2. Fill in title, due date, priority, assignee, and optional checklist items.
3. Save — it appears in the relevant status/priority group.
4. As work progresses, drag it across Board columns, or check off subtasks, or use quick actions to change status.
5. Mark it Completed when done.

### Tips & common mistakes
- Don't edit a task's checklist from a stale cached row — always open it via the detail drawer so the app fetches the full task record (a common mistake in older UI is passing an incomplete row straight into the edit form, which can accidentally wipe reminders or checklist data; the Task Detail Drawer specifically guards against this by refetching the full record before opening).
- Use "Due today"/"Upcoming" quick filters instead of manually scanning dates.

### Troubleshooting
**Q: Why did my task edit seem to "lose" its reminders?**
The app deliberately refetches the complete task record before letting you edit it, exactly to prevent this. If you still see missing data, refresh the page and reopen the task.

### Permissions
Viewing tasks requires **Engage → Tasks: View**. Creating requires **Create**, editing/patching (including drag-and-drop status changes) requires **Update**.

### Glossary
- **Task** — an actionable to-do tied to a lead, with status/priority/due date.
- **Subtask/checklist item** — a smaller step inside a task; toggling it updates the parent's progress.
- **Quick patch** — a one-field update (status, priority, due date) done without opening the full task editor.

---

## 3. Calendar & Reminders

### Overview
The Calendar is a unified view of everything time-based across the CRM: meetings, tasks, follow-ups, opportunities, and personal reminders — all color-coded on one screen. Reminders are simple personal alerts (not tied to a lead) you can create directly from the calendar, e.g. "Call vendor at 3pm."

### FAQ

**Q: What do the calendar colors mean?**
- Meetings: indigo (demo), violet (follow-up), pink (closing), green (internal)
- Tasks: amber shades by priority (low/medium/high)
- Follow-ups: green (pending), grey (done/cancelled)
- Opportunities: violet
- Reminders: rose (or your custom color)

**Q: Can I filter which event types show on the calendar?**
Yes — toggle Meetings/Tasks/Follow-ups/Opportunities/Reminders on or off. On the Tasks page's own Calendar tab, the type is locked to Tasks only.

**Q: How do I create a reminder?**
Click any empty slot on the calendar — this opens the "Create Reminder" drawer. Give it a title, date/time, optional notes, pick a color, and choose whether to be notified by push, email, or both.

**Q: Can reminders be tied to a specific lead?**
The calendar-created reminder is a general (not lead-specific) reminder. Lead-specific follow-up reminders are created from the lead's own page and show up on the calendar as "Follow-ups," separately.

**Q: Can I edit or delete a reminder after creating it?**
Yes, reminders can be patched or deleted; changes are reflected on the calendar immediately.

**Q: Does the calendar filter by "my events only" or can I see teammates'?**
By default it shows your own events (owner = you); pages that support it (like Tasks calendar) can filter to a chosen assignee or lead.

### Step-by-step: Setting a reminder
1. Open Calendar (or the Tasks → Calendar tab).
2. Click the date/time slot you want.
3. Enter a title, adjust date/time, add notes if needed.
4. Pick a color for quick visual identification later.
5. Choose Push and/or Email notification.
6. Click **Create Reminder**.

### Tips & common mistakes
- If you don't see any events, check that a workspace is active and that you've picked a date range — the calendar won't query until both are set.
- Turning off "Email notification" means you'll only get in-app/push alerts — don't disable both channels or you won't be notified at all.

### Troubleshooting
**Q: Why is a reminder not notifying me?**
Check that at least one of Push/Email was enabled when you created it. Reminder delivery depends on the channel(s) selected at creation time — if both were left unchecked, nothing will fire.

**Q: Why don't my teammate's meetings show on my calendar?**
The calendar is scoped to your own user by default (or an explicitly chosen assignee/lead on pages that support that filter) — it isn't a company-wide view by default.

### Permissions
Viewing/creating/updating calendar events and reminders requires the **Engage → Calendar** permission at the View/Create/Update level respectively.

### Glossary
- **Reminder** — a personal, time-based alert not tied to a lead, created directly on the calendar.
- **Follow-up** — a lead-specific scheduled callback, shown on the calendar in green/grey.
- **Event kind** — the calendar's internal category (meeting, task, followup, opportunity, reminder) that drives its color.

---

## 4. Meetings (Google Meet, Recording, Transcription, AI Summary)

### Overview
The Meetings module schedules Google Meet video calls tied to leads, tracks who's attending, and — when an admin turns the feature on and the meeting organizer approves it — can automatically join the call as a "bot," capture live captions as a transcript, and produce an AI-written summary afterward. This helps sales teams stop taking manual notes and get a searchable record and instant recap of every call.

### FAQ — Scheduling & basics

**Q: How do I schedule a meeting?**
Click **New meeting** on the Meetings page (or from a lead). Give it a title, pick a type (Demo, Follow-up, Closing, Internal), set start/end time, add an agenda, choose attendees from your team, and attach it to a lead. Saving creates a Google Calendar event with a Google Meet link automatically (if your company's Google Calendar is connected).

**Q: What do the meeting status badges mean?**
- **Scheduled** (blue) — upcoming, not yet started
- **Live** (red) — happening right now
- **Completed** (green) — finished
- **Cancelled** (grey)
- **Missed** (yellow) — the window passed without joining

A background check runs every minute to automatically flip meetings from Scheduled → Live → Completed based on their start/end time.

**Q: What does the "Bot" badge mean, and what are its states?**
The recording bot badge shows: **scheduled** (not started yet), **joining** (attempting to join the call), **processing** (call ended, generating transcript/summary), **completed** (recording, transcript and summary all done), or **failed** (something went wrong — check with your admin).

**Q: Can I edit or delete a scheduled meeting?**
Yes — edit updates the Google Calendar event and Meet link automatically; delete removes it from both the CRM and the connected Google Calendar.

**Q: Why does a meeting say "No Meet link yet"?**
This happens if your company hasn't connected Google Calendar, or if Google's API didn't return a Meet link when the event was created. Fixing the calendar connection under Integrations resolves this.

### FAQ — Recording bot consent

**Q: What is the "recording bot" and who can turn it on for a meeting?**
It's a background feature that — if your company admin has enabled it server-wide — automatically joins the meeting's Google Meet link at the scheduled time to capture live captions. **Only the meeting's organizer** can approve ("consent to") the bot for their own meeting; nobody else can toggle it.

**Q: How do I approve the recording bot?**
If your meeting starts soon or is already live, and you're the organizer, you'll see an amber banner: *"Recording bot: your meeting '[Title]' starts soon/is live now. Approve the bot to record, transcribe, and summarize."* Click **Yes, add bot**. You can dismiss it with "Not now" (it won't reappear for that meeting during your current session).

**Q: I approved the bot but nothing happened — why?**
Two separate switches both have to be on:
1. **Your consent** (per meeting, only you as organizer can set it) — this is stored immediately when you click "Yes."
2. **The server-wide master switch**, which only your IT/admin controls (they must enable "meeting recording" on the API server and restart it). If your admin hasn't turned this on, your consent is saved but the bot simply won't run — the app tells you this directly: *"Consent saved. Ask your admin to set the meeting-recording feature to ON on the API server for the bot to run."*

**Q: Why can't I enable the bot on a meeting?**
The meeting must already have a Google Meet link — if Google Calendar didn't return one (e.g., no Google connection), the app blocks enabling the bot and tells you to fix the Meet link first.

**Q: Can I turn the bot off after it already started?**
No — once the bot has moved past "scheduled" (i.e., it's joining, recording, or processing), you can't disable it anymore. You can only toggle consent while it's still in the "scheduled" state.

**Q: What does the bot actually need on the server side (in plain terms)?**
Ask your IT/admin to confirm these are set up on the server that runs LeadNest:
- The "enable meeting recording" master switch must be turned on and the server restarted.
- The web browser used to join meetings (Chromium via Playwright) must be installed on that server.
- Your company's Google Workspace account needs **Live Captions** turned on in Google Meet — the bot reads the live captions text, it does not record audio/video, and needs no FFmpeg.
- An AI key (for generating the summary afterward) must be configured.
There's a "Show what IT needs" helper inside the app that gives OS-specific setup steps (Windows/Mac/Linux) for your admin.

### FAQ — Transcription & AI summary

**Q: What triggers the transcript and AI summary to be generated?**
This is fully automatic, no button to click: once the recording bot has captured the live captions for the whole meeting, the system saves each caption line as a transcript entry, then automatically asks the AI service to generate a plain-language summary (covering discussion points, decisions, and action items). Both a Transcript PDF and a Summary PDF are produced and linked on the meeting card.

**Q: How long does this take?**
It runs right after the meeting ends. The meeting card polls for updates every 5 seconds while the pipeline is "processing," so the transcript/summary status and files appear automatically without you refreshing.

**Q: I don't see a Transcript button — why?**
Either the meeting hasn't ended yet, the bot wasn't approved/enabled, or the pipeline failed. Check the "Tx:" (transcription) and "AI:" status labels on the meeting card — if they say "pending" or "failed," no PDF will exist.

**Q: What does "No captions captured" mean?**
This specific failure happens when Google Meet's Live Captions weren't turned on for the call, so the bot had nothing to transcribe. Your admin needs to make sure Live Captions is enabled in your Google Workspace Meet settings.

**Q: Can I get additional AI insights beyond the summary — like action items or sentiment?**
Yes, there are dedicated AI endpoints that pull the saved transcript and ask the AI to extract action items (owner, task, due date) or analyze sentiment (positive/neutral/negative with a 1–10 score) — these require a transcript to already exist for that meeting.

**Q: Why did I get "No transcript found for this meeting"?**
This means the bot never captured any captions for that meeting (it wasn't approved, the master switch was off, or Live Captions weren't enabled) — there's nothing yet to summarize or analyze.

### Step-by-step: Scheduling a Google Meet meeting with AI summary
1. Click **New meeting**, fill in title, type, lead, start/end time, agenda, and attendees.
2. Save — a Google Meet link is generated automatically (provided Google Calendar is connected).
3. As organizer, watch for the amber "Recording bot" banner near your meeting's start time and click **Yes, add bot** to approve recording/transcription for this specific meeting.
4. Confirm with your admin that the company-wide recording feature is turned on, Live Captions are enabled in your Google Workspace, and the meeting/transcription server components are installed.
5. Hold the meeting as normal in Google Meet.
6. After the meeting ends, the app automatically captures captions, generates the transcript PDF and an AI summary PDF, and shows them on the meeting card — usually within moments after end time, refreshed automatically every 5 seconds while processing.

### Tips & best practices
- Approve the bot as early as possible before the meeting starts — the system only tries to start the bot in the current-minute check, so consent needs to be in place before the meeting's scheduled start.
- Always confirm your Google Workspace has Live Captions enabled beforehand if you plan to rely on AI summaries — this is the single most common reason for empty transcripts.
- Don't rely on the recording bot for external guests' meetings using non-Meet video tools — it only works with Google Meet links generated through the CRM's calendar integration.

### Common mistakes
- Assuming enabling consent on the meeting is enough — remember it also needs the admin-level master switch turned on.
- Editing a meeting's title/time after the Meet link already exists without realizing the system re-syncs the calendar event — this is normal, but very frequent edits can occasionally cause the Meet link to briefly disappear/regenerate.

### Troubleshooting Q&A
**Q: Why wasn't my meeting recorded?**
Check, in order: (1) Are you the organizer, and did you click "Yes, add bot"? (2) Has your admin enabled the company-wide meeting-recording switch on the server? (3) Does the meeting have a valid Google Meet link? (4) Did the meeting actually run during its scheduled window (the bot only tries to join between the scheduled start and end time)?

**Q: Why didn't I get a transcript even though the bot joined?**
Live Captions must be turned on in your Google Workspace Meet settings — without them, the bot has no text to capture, and you'll see "No captions captured" as the failure reason, with statuses reset so you can try again next time.

**Q: The bot status says "failed" — what do I do?**
Contact your admin — this usually means a server-side issue (browser automation, captions, or AI key). The app resets statuses so the meeting can still show as completed manually.

**Q: Can I see the Meet link after the meeting is over?**
No — the "Join" button is disabled and shows "Expired" once a meeting is completed, cancelled, or missed.

### Permissions
All meeting actions (view, create, edit, delete, bot-consent, transcript/summary access) are gated behind the **Engage → Meetings** permission at View/Create/Update/Delete levels as appropriate. Bot consent specifically additionally requires you to be the meeting's organizer, regardless of your permission level.

### Glossary
- **Meeting bot** — a server-run automated browser that joins your Google Meet link to capture live captions (no audio/video recording, no FFmpeg needed).
- **Recording bot consent** — the organizer's per-meeting approval to let the bot join; separate from the admin's server-wide master switch.
- **Transcript** — the text captured from Google Meet's live captions during the call.
- **AI Summary** — an AI-generated recap of the transcript covering key points, decisions, and action items.
- **Bot status** — scheduled → joining → processing → completed/failed, shown on each meeting card.

---

## 5. Calls

### Overview
The Calls module is a log of phone calls — logged manually from a lead, or synced automatically from a connected mobile device's call log. It exists to keep phone activity (which otherwise happens outside any app) attached to the right lead, so nothing about a customer relationship lives only in someone's personal phone history.

### FAQ

**Q: What do the call type icons/badges mean?**
- **Incoming** (green) — an inbound call that was answered
- **Outgoing** (blue) — a call you placed
- **Missed** (rose/red) — an inbound call that wasn't answered or went to voicemail

**Q: What do the outcome badges mean?**
- Connected (green) — reached the person
- No answer (grey)
- Voicemail (blue)
- Follow-up needed (amber)

**Q: What does "orphan" call mean, and how do I attach it to a lead?**
An orphan call is one logged (often synced from a mobile device) whose phone number doesn't match any existing lead. In the Calls table, any call without a lead shows a **Convert** button — click it to either create a brand-new Lead or a new Opportunity from that caller's name/number. If the CRM finds an existing lead with the same phone number already, it links the call to that lead instead of creating a duplicate.

**Q: How does the mobile app sync calls?**
Calls logged on a connected mobile device are synced in as "device_sync" source records; calls entered manually in the CRM are marked "manual." Both appear the same way in this list, distinguished by the "Logged by" column.

**Q: Can I group calls by lead?**
Yes — toggle **Group by lead** to bucket the list into per-lead sections, with an unmatched "No lead" bucket last.

**Q: Can I filter by call type or whether it's linked to a lead?**
Yes — the Filters panel lets you filter by "With lead / No lead / All calls," call type (incoming/outgoing/missed), and outcome.

**Q: Can I delete a call log entry?**
Yes, calls can be deleted; this doesn't affect the lead itself, just the log entry.

### Step-by-step: Logging a call and converting it
1. Log a call either from a lead's page, or let it sync automatically from your mobile device's call log.
2. If the call has no matching lead, it shows in Calls as an "orphan" call with a **Convert** button.
3. Click Convert, then choose **Create lead** or **Create opportunity**. If a lead with the same phone number already exists, the call is automatically linked to it instead of creating a duplicate — you'll see a toast confirming this.
4. The converted call now shows "Linked" in the Lead column and is reachable from the lead's own page.

### Tips & best practices
- Use **Group by lead** if you're reviewing call history for a specific set of accounts rather than chronologically.
- Convert orphan calls promptly — until converted, that call history isn't visible from any lead record.

### Troubleshooting
**Q: Why do I see calls with no caller name?**
If the mobile device's contact list didn't have a name for that number, only the phone number will display until you convert it to a lead (or the number already matches a lead's phone field).

**Q: I converted a call but it says "Number already belongs to a lead — call linked to it" instead of creating a new one — is that a bug?**
No — that's expected behavior. The system checks for an existing lead with the same phone number first and links to it (and sweeps in any other orphan calls from that same number) rather than creating a duplicate lead.

### Permissions
All call actions (view, create, update, delete, convert) require the **Engage → Meetings** permission at the corresponding View/Create/Update/Delete level. (Calls uses the same permission bucket as Meetings.)

### Glossary
- **Orphan call** — a logged call with no matching lead.
- **Convert** — turning an orphan call into a new Lead or Opportunity (or linking it to a matching existing lead).
- **Device sync** — a call automatically logged from a connected mobile phone's call log, as opposed to one entered manually.

---

## 6. Email & Gmail

### Overview
The Email module is your in-CRM inbox: it can read your connected Gmail account's Inbox/Outbox (live, refreshed automatically), show CRM-only threads tied to specific leads, let you compose and reply with attachments, and track whether your sent emails were opened or clicked. This closes the loop between "I sent an email" and "did they actually read it," directly on the lead record.

### FAQ

**Q: What do I need before I can use the mailbox view?**
Your Google account must be connected under **Integrations → Google Settings**. Without it, the whole Email page shows a prompt to connect.

**Q: What's the difference between "Inbox/Outbox" and "Lead only" mode?**
Inbox/Outbox shows your live Gmail account (all mail since you connected Google). Toggling **Lead only** switches to CRM-tracked threads scoped to a specific selected lead — useful when you only want that lead's correspondence.

**Q: Why does it say "Inbox cannot load with current Google permissions"?**
Your Google connection was authorized without Gmail read access (only send access). Reconnect Google from Integrations and approve the Gmail read/inbox permission on Google's consent screen. Until then, you can still use "Lead only" mode with a selected lead.

**Q: How do I send an email?**
Click **New message**, pick a lead (recipients auto-fill if they have an email on file), write your subject and body (rich text: bold/italic/underline, lists, links), optionally attach files (upload new ones or pick from that lead's existing documents), and click **Send now**.

**Q: What's the file size limit for attachments?**
About 24 MB total per email (Gmail's practical limit) — the composer blocks you from adding a file that exceeds this alone, or a combination that would push you over it.

**Q: How do I reply to an email in a thread?**
Open the thread and click **Reply** — this pre-fills the recipient, subject ("Re: ..."), and quotes the original message.

**Q: How do "Sync CRM mail" / "Sync replies" work?**
Clicking Sync pulls new replies from Gmail into the CRM's own thread records (useful if you want a permanent CRM copy independent of live Gmail, or if a lead-specific sync is needed).

**Q: I see an email in my inbox that isn't linked to any lead — is that normal?**
Yes — the mailbox shows your real Gmail inbox, which includes non-CRM mail too. If the sender's email matches an existing lead, the app automatically shows a "View lead" shortcut on the thread.

**Q: Can I save an email attachment to a lead's documents?**
Yes — open the message, use "Save to lead," pick the lead, and it's copied into that lead's Documents.

### FAQ — Tracking (opens & clicks)

**Q: How does open tracking work?**
Every sent email includes an invisible 1x1 tracking image. When the recipient's email client loads images (which most do automatically), the CRM logs an "opened" event and timestamps the first open.

**Q: How does click tracking work?**
Links inside the email body are automatically rewritten to route through a tracking redirect first — clicking logs a "clicked" event, then forwards the browser to the original destination.

**Q: Where do I see open/click/reply rates?**
The **Email Tracking Reports** page shows Sent / Opened / Clicked / Replied stat cards with rates, a bar chart over time, and a detailed table you can group by day/week/month/source and filter by source (Direct from lead profile, Bulk template send, or Workflow automation).

**Q: Why would open tracking under-report opens?**
Open tracking relies on the recipient's email client automatically loading remote images — if their client blocks images by default (common in Outlook/enterprise mail), an actual open won't be recorded until/unless they load images manually.

**Q: What's the difference between "Direct," "Bulk," and "Workflow" sources in the tracking report?**
Direct = sent from a lead's own page. Bulk = sent via a Template's mass-send feature. Workflow = sent automatically by an automation rule.

### Step-by-step: Sending a templated/tracked email
1. Open Email, click **New message** (or reply within a thread).
2. Pick the lead — recipient auto-fills from their email address.
3. Write your subject and body, or start from a saved Template.
4. Attach files if needed (upload or pick from the lead's existing documents).
5. Click **Send now** — the system embeds a tracking pixel and rewrites links for click tracking automatically.
6. Check the Email Tracking Reports page later to see whether it was opened/clicked.

### Tips & best practices
- If you need guaranteed delivery confirmation, don't rely solely on open tracking — some recipients block remote images.
- Use "Lead only" mode when working a specific account, to avoid noise from your whole personal inbox.
- The mailbox auto-refreshes every 20 seconds — you don't need to manually refresh while working the Inbox.

### Common mistakes
- Forgetting to reconnect Google after permissions change, leading to the "insufficient authentication scopes" error banner.
- Attaching very large files that push the total over ~24 MB — split across follow-up emails or link to a shared document instead.

### Troubleshooting Q&A
**Q: Why did my email not send?**
Common causes: no lead selected, no recipient email present on the lead's record, or your company's outgoing mail (SMTP) isn't configured — check with your admin if sending fails repeatedly. A recipient email suppressed via a prior "unsubscribe" click will also silently be skipped when sending in bulk (see Templates section).
**Q: Why don't I see any inbox messages at all?**
Either Google isn't connected, or it's connected without the "read mailbox" permission — both cases show a clear banner explaining what to fix and a button to jump to Google Settings.
**Q: Why does the open/click count not update immediately?**
The tracking pixel/redirect only fires the moment the recipient's client actually loads it — it can be delayed by their email client's caching or image-blocking behavior, not a CRM problem.

### Permissions
Reading/searching your mailbox and CRM email threads, and sending/syncing require the **Engage → Email** permission (and, for sending tied to a specific lead, **Main → Leads** create/update as well). Tracking reports require **Engage → Email: View**.

### Glossary
- **Tracking pixel** — an invisible image embedded in a sent email that records when it's opened.
- **Link wrapping** — rewriting email links to route through a tracking redirect before reaching the real destination.
- **Suppression list** — a list of email addresses that must not receive further template/bulk sends (built from unsubscribe clicks).
- **Mailbox mode vs Lead-only mode** — live Gmail view vs. CRM-only thread records scoped to one lead.

---

## 7. Templates

### Overview
Templates let you write an email once (with placeholders for lead-specific details) and reuse it for one lead or send it to many leads at once ("bulk send"), while the CRM automatically fills in each recipient's own details, tracks whether it was opened/clicked, and applies safety rules so you don't spam or resend to people who already unsubscribed.

### FAQ

**Q: What are "merge tags," and how do I use them?**
Merge tags are placeholders like `@first_name`, `@company`, or `@contact_name` that get replaced with each lead's actual data when the email is sent. Type `@` in the Subject or Body while editing a template, and a popover suggests available fields (first name, last name, company, designation, email, phone, deal value, source, status, city/state/country, street, postal code, title, sender name) — click one to insert it.

**Q: Can I preview what the email will look like before sending?**
Yes — the Preview panel shows the template filled in with realistic sample data (e.g. "Amit Sahu," "LeadNest Labs") so you can sanity-check formatting and merge tags before it goes to real leads.

**Q: How do I get AI help writing a template?**
Switch to the **Ask AI** tab, describe what you want the email to do (audience, problem, value, call-to-action), and click **Generate Template** — it drafts a subject and body using your merge tags, which you can then edit.

**Q: How many attachments can a template have?**
Up to 3 attachments per template.

**Q: What does "Skip if already sent" do?**
When enabled (default on), the system won't resend the same template version to a lead who already received it — this prevents accidentally spamming the same person twice with a bulk send.

**Q: What happens when I click "Send" on a template?**
The system requires an explicit confirmation before sending — you can't accidentally fire off a bulk send without confirming. It then checks, per lead: is this email suppressed (previously unsubscribed)? Has this exact template version already been sent to them (if "skip if already sent" is on)? Only leads that pass both checks actually receive the email; the rest are reported back to you as "skipped."

**Q: Can I see who actually got the email vs. who was skipped?**
Yes — the send response reports `willSend`, `skippedAlreadySent`, and `skippedUnsubscribed` lists, and each template's row shows Sent/Opened/Clicked/Reply rates plus "Sent to Leads" (unique lead count) and last-sent date.

**Q: What does "throttle per hour" do?**
Templates can have a send-rate limit; when set, the system pauses between each send in a bulk batch so you don't send faster than the configured rate (useful to avoid tripping spam filters).

**Q: What's the unsubscribe link, and how does it work?**
If "Auto unsubscribe link" is enabled on a template, every sent copy gets a footer link. If a recipient clicks it, they're added to a permanent suppression list for your company — future bulk/template sends (and even direct sends) will skip that address automatically going forward.

**Q: Can I edit a template that's already been sent before?**
Yes — editing the subject or body bumps the template's internal version number. This matters because "skip if already sent" and send-history tracking are version-aware: if you materially change the content, it's treated as a new version, so leads who got the old version can receive the updated one.

**Q: How do I delete a template?**
Templates are "archived" (soft-deleted) rather than hard-deleted — archived templates disappear from your active list but their send history is preserved for reporting.

**Q: Can I export template performance data?**
Yes — **Export CSV** on the Templates list downloads name, category, subject, open/click/reply rates, unique leads sent to, and last sent date.

### Step-by-step: Creating and sending a templated bulk email
1. Click **+ Create Template**, name it, and pick a category (Cold outreach, Follow-up, Proposal, Re-engagement).
2. Write the subject and body — type `@` anywhere to insert merge tags like `@first_name` or `@company`.
3. (Optional) Use **Ask AI** to draft the content from a short description, then refine it.
4. Add up to 3 attachments if needed.
5. Toggle "Skip if already sent" (recommended: on) to avoid duplicate sends.
6. Check the **Preview** tab with sample data to confirm it reads correctly.
7. Save the template.
8. To send it to specific leads: trigger the send flow with your chosen lead list, review the preview summary (who will actually receive it vs. who's being skipped as unsubscribed or already-sent), then confirm the send.
9. Track results afterward on the template's stats or the Email Tracking Reports page.

### Tips & best practices
- Always preview with sample data before a bulk send — a typo'd merge tag (e.g. `@frist_name`) won't get replaced and will show up literally in the email.
- Keep "Skip if already sent" on for recurring campaigns so re-running a send doesn't spam the same leads.
- Enable the auto-unsubscribe footer link on any bulk/marketing-style template — it's both good practice and keeps your suppression list accurate.
- If sending a large batch, set a reasonable "throttle per hour" so you don't overload the mail server or trigger spam filters.

### Common mistakes
- Forgetting a lead has no email address on file — the bulk send will report that lead as failed ("missing_email") rather than silently skipping it.
- Assuming "delete" permanently removes a template — it's archived, not erased; its send history stays intact for reporting.
- Editing content on a "live" template expecting the old send-history / skip logic to still apply identically — remember content edits create a new version.

### Troubleshooting Q&A
**Q: Why was a lead skipped when I sent a template?**
Either they're on the suppression list (they unsubscribed previously), or (if "skip if already sent" is on) they already received this exact template version before. Both cases are reported back to you explicitly rather than failing silently.
**Q: Why didn't sending happen right away — it says "queued"?**
If your company uses a background queue for bulk sending, big batches are processed in the background (so the UI doesn't hang) — check back or view send history. If no queue is configured, sends happen immediately (inline) instead.
**Q: Why does the open/click rate seem low compared to what I expect?**
See the Email troubleshooting section — tracking pixels/link rewriting depend on the recipient's mail client behavior, not a template defect.
**Q: My AI-generated draft failed — why?**
AI content generation requires your company's AI key to be configured; if it's missing or the service is temporarily unavailable, you'll get an error toast instead of a draft — try again, or write the content manually.

### Permissions
Viewing/creating/editing/archiving templates, generating AI content, and sending require the **Engage → Templates** permission at the corresponding View/Create/Update/Delete level.

### Glossary
- **Merge tag** — a placeholder (e.g. `@first_name`) auto-replaced with each lead's real data when sent.
- **Template version** — an internal counter that increments whenever subject/body content changes; used for "already sent" logic and history grouping.
- **Skip if already sent** — a safeguard preventing the same template version from going to the same lead twice.
- **Suppression list** — company-wide list of emails that must never receive template/bulk sends again, built from unsubscribe clicks.
- **Throttle** — a configurable pace limit (sends per hour) applied during bulk sends.
- **Preview send** — a dry-run check showing which recipients would actually receive vs. be skipped, without sending anything.

---

## Cross-Module Notes

**On "your admin needs to turn on X" language used above:** several features in this app are controlled by two layers — something *you* toggle per record (e.g., bot consent on a meeting, unsubscribe/skip logic on a template) and a master switch only your company's technical admin can flip on the server (e.g., the meeting-recording feature, AI keys, outgoing mail server setup, Google Calendar/Gmail connection). If a feature seems to accept your action but nothing happens, it is very often because the record-level toggle is fine but the server-wide switch hasn't been turned on — ask your admin to check.

**On permissions generally:** every module above sits under the "Engage" permission group in your company's Roles setup, with separate View/Create/Update/Delete (and, for Activities, an extra "Admin" level for managing activity type definitions). If a button or tab is missing entirely, it's most likely a permissions issue — ask your workspace admin to check your role's Engage permissions.
