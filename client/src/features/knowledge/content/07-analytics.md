# Dashboard, Analytics, Reports, Notifications & Search

## 1. Dashboard

### Module Overview

The **Dashboard** is the first screen you see after logging in. It gives you a quick, at-a-glance summary of what's happening in your CRM right now — how many leads and opportunities you have, what your team has been doing lately, what your open sales pipeline is worth, and which tasks are about to become overdue. It exists so a salesperson, manager, or owner doesn't have to click into five different sections every morning just to answer "what needs my attention today?"

**Who uses it:** every logged-in user sees a Dashboard, but what shows up on it (totals, pipeline value, activity counts) is scoped to whatever leads/deals/tasks that user has permission to see and whichever workspace they're currently in.

### FAQ

**Q: What do the six summary cards at the top mean?**
- **Total leads** — every lead you currently have access to (not filtered by date).
- **Total opportunities** — leads that have been marked/converted into an "opportunity" (open pipeline records).
- **New leads** — how many leads were created in the last 30 days. If you have a very large number of recent leads, this may show a number with a "+" (e.g. "100+") because the dashboard only scans your 100 most recently created leads to keep the page fast — it's a "top 100 by recency" estimate, not a hard cap on your actual data.
- **Calls / Meetings / Emails** — how many of each activity type were logged in the last 30 days.

**Q: What is the "Revenue forecast" card showing?**
Three numbers side by side:
- **Pipeline** — total dollar value of all your currently open (not yet won) opportunities.
- **Won** — total dollar value of opportunities marked won in the selected chart range.
- **Win rate** — Won ÷ (Pipeline + Won), as a percentage. A rough "of everything currently open or already won, what share did we actually close."
Below that is a bar for each pipeline stage showing its dollar value and deal count, scaled against your largest stage.

**Q: What does "Upcoming meetings" show?**
Any meeting scheduled to start in the next 48 hours that you own, pulled from your connected calendar. If nothing is scheduled, you'll see a prompt to open your calendar.

**Q: What is "Tasks expiring soon"?**
Up to 6 of your open (pending or in-progress) tasks that are either already overdue or due within the next 7 days, sorted with overdue tasks first, then soonest due date, then priority (urgent > high > medium > low). Each card shows the due status, priority, assignee, and a progress ring if the task has subtasks.

**Q: What do the "Trends & breakdowns" charts show, and can I change the time period?**
Yes. Above the charts there's a **Chart range** selector (Last 7 days / Last 30 days / Last quarter) and a **Chart scope** selector (All owners vs My pipeline). Changing these reloads:
- **Lead status breakdown** — every possible lead status (New, Working, Qualified, etc.) and how many leads currently sit in each, regardless of when they were created.
- **Opportunity status breakdown** — a donut chart of opportunities by whatever custom opportunity statuses your company has configured.
- **Pipeline by status** — bar chart of open opportunity dollar value and deal count per status, for the selected range/scope.
- **Activities by type** — donut of calls/emails/meetings/tasks logged in the period.
- **Tasks throughput** — a line chart comparing tasks created vs. tasks completed per day in the period — useful for seeing whether your team is keeping up with workload or falling behind.

**Q: What is "Recent activity"?**
The 10 most recent actions logged across your pipeline (calls, notes, emails, meetings, tasks) with who logged them and when ("5m ago", "2h ago", etc.).

### Step-by-step: Reading your dashboard

1. Start at the top summary cards to get raw totals.
2. Check "Tasks expiring soon" — this is your action list for the day.
3. Look at "Revenue forecast" to see where your money is sitting (which stage) and your win rate.
4. Switch **Chart scope** to "My pipeline" if you only want to see your own numbers instead of the whole team's.
5. Use the **Chart range** buttons to zoom in (7 days) for "what happened this week" or out (last quarter) for a trend view.
6. Scroll to "Recent activity" to catch anything you may have missed.

### Tips & common mistakes

- The "New leads" stat can under-count if you have more than 100 new leads in the period — treat the "+" as "at least this many," not exact.
- "Total leads"/"Total opportunities" are **not** affected by the Chart range selector — those are always all-time totals. Only the charts below react to the date range.
- The Revenue forecast "Win rate" is a snapshot ratio of currently-open vs. currently-won value, not a historical win-rate trend — for a proper trailing win-rate metric, use the **Deals** report instead.

### Troubleshooting

**Q: Why is my dashboard showing "—" instead of a number?**
A dash means that particular data request failed to load (a temporary error), not that the value is zero. Try refreshing the page.

**Q: Why don't I see any upcoming meetings even though I have one scheduled?**
The widget only shows meetings in the next 48 hours that are tied to your calendar connection and owned by you. If the meeting is more than 48 hours away, or was created by a teammate and you're not the owner, it won't appear here — check the full Calendar page instead.

---

## 2. Reports & Analytics

### Module Overview

**Reports** (the "Analytics" hub) is where you go for deeper, filterable, exportable breakdowns of your business — not just a glance, but a proper report you can slice by date range, employee, status, or stage, and then export or print. It's organized into five categories: **Executive Overview**, **Sales & Pipeline**, **Productivity**, **People & HR**, and **Communications & Data**. Each category contains one or more individual reports.

**Who uses it:** Sales reps can view their own scoped data; managers, workspace admins, and company admins can see full workspace-wide data. One report (Data Health) is admin-only.

### Available report types

| Report | What it tells you |
|---|---|
| **Overview** | A single-page snapshot combining leads, pipeline, activities, and tasks — the "executive summary" of the whole business. |
| **Leads** | Lead pipeline, where leads come from (source), which leads have gone stale, and conversion through the funnel. |
| **Opportunities** | Which opportunities are sitting in which stage. |
| **Deals** | Deals won or created in the date range, revenue generated, and payments received. |
| **Quotations & Invoices** | Sales documents created, their value, and how many quotes convert into invoices. |
| **Payments** | Payments received from leads — covering both deal payments and invoice payments. |
| **Tasks** | Pending tasks by employee and overall team workload. |
| **Follow-ups** | Upcoming follow-up queue, overdue follow-ups, and completion rate. |
| **Activities & Calls** | Team activity log — calls, emails, notes — plus an activity heatmap. |
| **Meetings** | Upcoming and past meetings, show-up/no-show rates, and recordings. |
| **Employee Monthly Digest** | What one specific employee did during a chosen month/year. |
| **Team Leaderboard** | Ranks team members by revenue and activity. |
| **Email Performance** | Sent, opened, clicked, and reply rates for outgoing emails (see Email Tracking section below). |
| **Campaigns** | Leads staged into campaigns and how well they convert. |
| **Data Health** (admin only) | Unassigned leads, untouched leads, leads with no email, and duplicate leads — a data-quality checklist. |

### FAQ

**Q: How do I change the date range for a report?**
Every report has a date range button (showing something like "This Month") at the top. Click it to choose from preset ranges — **This Week**, **This Month**, **This Quarter**, **This Year** — or pick **Custom range** and enter your own From/To dates.

**Q: What does the "vs prior period" checkbox do?**
When checked, the report also fetches the equivalent prior period (e.g. if you're viewing "This Month," it compares against last month) so you can see whether numbers are trending up or down.

**Q: What other filters are available?**
Depending on the report, you may also see filters for: **Employee** (restricts the report to one team member), **Status**, **Pipeline stage**, **Lead source**, **View** (all/upcoming/past — used on Follow-ups and Meetings), and **Month/Year** (used on the Employee Monthly Digest).

**Q: How do I generate a report?**
Reports generate automatically as soon as you open them or change a filter — there's no separate "Run" button. Go to **Reports**, pick a category, click a report card, and it loads with your last-used date range. Use the refresh icon next to the export button to manually re-pull the latest data without changing filters.

**Q: How do I export a report?**
Click the **Export** button (download icon) in the top-right of any report page. You'll get three choices:
- **Excel (.xlsx)** — downloads a spreadsheet file with the report's tables.
- **PDF** — opens a print-formatted version of the report in a new browser tab and triggers your browser's print/save-as-PDF dialog automatically.
- **Print** — sends the current report straight to your browser's print dialog.
The Export button is disabled until the report has finished loading data.

**Q: Can every report be exported?**
Most can — Overview, Leads, Deals, Activities, Meetings, Tasks, Team, Opportunities, Follow-ups, Sales Docs, Payments, Leave, Employee Monthly, and Data Health all support Excel export. Email Performance and Campaigns currently support Print/PDF only (no Excel export button).

**Q: What do the KPI cards on the Reports home page (Total Leads, Pipeline Value, Open Tasks, Win Rate) mean?**
Quick totals pulled from the Leads, Deals, and Tasks reports for your current filter range — a preview before you dive into an individual report.

**Q: What is the "Needs attention" section on the Reports home page?**
Three shortcut tiles — **Overdue tasks**, **Untouched leads**, and **Overdue follow-ups** — that link straight into the relevant report so you can act on them immediately.

**Q: What does "Stale leads" or "Untouched leads" mean?**
A lead is considered untouched/stale if there's been no logged activity (call, email, note, etc.) on it for 14 or more days — a signal that a lead may be falling through the cracks.

**Q: What counts as a "duplicate" lead in the Data Health report?**
Leads the system has identified as likely duplicates of each other (e.g. matching contact details), surfaced here so you can merge or clean them up.

### Email Tracking metrics explained (Email Performance report)

This report (also reachable as its own dedicated page) shows how your outgoing emails are performing. You can filter by date range, **Source** (Direct — sent from a lead's profile; Bulk — a mass template send; Workflow — sent automatically by an automation), and group the table **by day / week / month / source**, or view summary-only.

- **Sent** — total emails sent in the range.
- **Opened / Open rate** — how many recipients opened the email at least once, and that count as a percentage of Sent. (Open tracking works via an invisible tracking pixel, so open rates can be undercounted if a recipient's email client blocks images.)
- **Clicked / Click rate** — how many recipients clicked a tracked link inside the email, as a percentage of Sent.
- **Replied / Reply rate** — how many recipients replied to the email, as a percentage of Sent. This is the strongest engagement signal since it can't be inflated by image-blocking or bots.
- A bar chart plots Sent vs. Opened vs. Clicked vs. Replied over time (only shown when grouping by day/week/month, not when grouped by source or summary-only).

**Reading tip:** Open rate and click rate are best read as directional trends over time, not absolute truth — some email clients open messages automatically for security scanning, which can inflate "Opened" counts slightly. Reply rate is the most trustworthy of the three.

### Step-by-step: Generating a report

1. Go to **Reports** in the main navigation.
2. Browse by category or type into the **Find a report** search box.
3. Click the report card you want.
4. Adjust the date range and any available filters (employee, status, stage, source, etc.).
5. Optionally check **vs prior period** to add a comparison.
6. The report body updates automatically — no separate "generate" step.

### Step-by-step: Exporting report data

1. Open the report you want to export.
2. Wait for data to finish loading (the Export button becomes clickable once data is present).
3. Click **Export**.
4. Choose **Excel (.xlsx)**, **PDF**, or **Print**.
5. A confirmation toast appears ("Excel export ready" / "PDF export ready") once it completes, or an error toast if something went wrong.

### Tips & best practices

- Use **vs prior period** whenever reporting to leadership — a single-period number rarely tells the full story.
- The **Employee** filter is only available on reports that support per-employee breakdowns (Leads, Opportunities, Deals, Tasks, Follow-ups, Activities, Meetings, Employee Monthly, Payments).
- Print/PDF exports capture exactly what's on screen at that moment (including current filters) — apply filters *before* exporting.
- Data Health is intentionally admin-only.

### Common mistakes

- Confusing "Total Leads" on the Reports home KPI strip (which respects your current date-range filter) with "Total leads" on the Dashboard (always all-time) — they can show different numbers, and that's expected.
- Reading Win Rate as "percent of leads that become customers" — it's Won Value ÷ (Pipeline Value + Won Value) for currently open + won opportunities, not a lead-to-close conversion rate.
- Assuming the PDF export is a native downloaded file — it's actually your browser's print dialog, so you must choose "Save as PDF" there rather than expecting an automatic download.

### Troubleshooting

**Q: Why is my report showing no data / all zeros?**
Most likely your date range doesn't cover any records — try widening it. Also check whether an Employee/Status/Stage filter is excluding everything.

**Q: I changed a filter but the numbers didn't update.**
Click the refresh icon next to the export button — occasionally the report needs a manual refetch to pick up a teammate's recent change.

**Q: My Excel/PDF export didn't download or came out blank.**
Exports only work once data has fully loaded; clicking Export the instant a page opens can fail (you'll see an error toast). Wait and retry. For PDF, make sure your browser isn't blocking pop-ups, since the PDF is generated in a new browser tab/print window.

### Permissions

- **Sales/regular users** can view reports, but data is scoped to what they're allowed to see.
- **Managers and workspace admins** see full workspace-wide analytics across all team members.
- **Company admins** see everything company-wide and, along with workspace admins, are the only ones who can open **Data Health**.
- Permission is enforced on the server for every report request, even if a report link is guessed or bookmarked.

---

## 3. Notifications

### Module Overview

Notifications keep you informed when something relevant happens without you having to go looking for it — a lead gets assigned to you, a task is assigned to you, a follow-up is coming due, a lead replies to your email, a meeting is about to start, or a campaign gets new leads added. Notifications arrive two ways: as an **in-app** bell alert, and/or as an **email**, depending on how your company has configured each notification type.

**Who uses it:** every user has their own personal notification feed, addressed only to them.

### FAQ

**Q: Where do I see my notifications?**
The bell icon in the top navigation bar. A red badge shows your unread count (shown as "9+" if you have more than 9). Clicking the bell opens a dropdown with your recent notifications.

**Q: What events trigger a notification?**
- **Lead assigned** — someone assigned one or more leads to you.
- **Campaign leads added** — leads were added to a campaign you're involved with.
- **Task assigned** — a task was assigned to you.
- **Tasks due today** — a daily digest of tasks due today, sent at a scheduled time each day (default 8:00 AM in your company's configured timezone).
- **Follow-up due** — a scheduled follow-up with a lead is coming up in 15 minutes.
- **Lead email reply** — a lead replied to an email you sent them.
- **Meeting reminder** — a meeting you're part of starts in 10 minutes.

**Q: Do I get an email for every notification, or just an in-app alert?**
It depends on the notification type and your company's settings. By default:
- **Lead assigned, Campaign leads added, Task assigned, Tasks due today** → both in-app **and** email.
- **Follow-up due, Lead email reply, Meeting reminder** → in-app only by default (no email), since these are time-sensitive and better suited to an immediate on-screen alert.
A company admin can turn any of these channels on or off company-wide.

**Q: What are "quiet hours"?**
If your company has quiet hours enabled (e.g. 10 PM–7 AM), any notification email that would otherwise be sent during that window is delayed until quiet hours end.

**Q: Why would I get a "Tasks due today" notification once a day instead of every time a task is due?**
This one is a digest — instead of pinging you for every task, the system bundles today's due tasks into a single notification sent once per day at your company's configured digest time.

**Q: How do I mark a notification as read?**
Click on it in the bell dropdown — this marks it read and, if it has a link (e.g. to a lead or task), takes you there. To clear everything at once, click **Mark all read** at the top of the dropdown (only shown when you have unread notifications).

**Q: Does marking a notification read delete it?**
No — it stays in your history, just no longer counted as unread or highlighted.

**Q: Will I be notified about my own actions (e.g. if I assign a lead to myself)?**
No. Notifications are skipped when the person who triggered the event and the intended recipient are the same person.

### Step-by-step: Managing your notifications

1. Click the bell icon to open your notification feed.
2. Click any unread notification (shown with a highlighted background) to jump to the related record and mark it read.
3. Click **Mark all read** to clear your unread badge in one action.
4. Company-wide settings for which events send emails vs. in-app-only, and quiet-hours/digest timing, are configured by admins in company settings (outside this section).

### Tips & best practices

- Don't rely solely on email for urgent items like Follow-up due or Meeting reminder — these are in-app only by default, so check the bell regularly during your workday.
- If you're not receiving expected emails, check with your company admin whether that notification type has email enabled, and whether quiet hours might be delaying delivery.

### Troubleshooting

**Q: Why didn't I get notified when a lead was assigned to me?**
A few possibilities: (1) you assigned it to yourself — self-notifications are intentionally suppressed; (2) your company has disabled that notification type; (3) email delivery specifically failed while the in-app notification still succeeded (they're delivered independently — check the bell even if no email arrived); (4) if the background delivery system was briefly unavailable, the notification is still delivered directly instead of failing silently, just without automatic retry.

**Q: Why do I sometimes get an email notification later than expected?**
If your company has quiet hours turned on and the event happened during that window, the email is deliberately held until quiet hours end. The in-app bell notification is not delayed the same way — check the bell for anything urgent.

**Q: I marked something read by accident — can I mark it unread again?**
No, there's currently no "mark as unread" action.

### Permissions

Notifications are always personal — you only see notifications addressed to you, scoped to your company and current workspace. Company-wide notification *settings* (which channels are on/off, quiet hours, digest time) are configured by company/workspace admins and apply to everyone in the company; individual users can't override these preferences per-user today.

---

## 4. Global Search

### Module Overview

Connexify does not currently have one unified "search everything" bar across the whole app. Instead, search is **per-module**: each major section (Leads, Documents, Team, Campaigns, Tasks, etc.) has its own search/filter box scoped to that section's data. There is no dedicated global search feature indexed across all record types at once.

### FAQ

**Q: Is there a search bar in the top navigation that searches everything?**
No. The top bar shows the current page title, your workspace switcher, notifications bell, and profile menu — there is no global "search across CRM" input there.

**Q: So how do I find something quickly?**
Use the search/filter box inside the relevant module:
- **Leads** — the Leads list has its own search and filter builder (by name, company, status, source, etc.).
- **Documents** — the document picker/workspace has its own file search.
- **Reports** — the Reports home page has a "Find a report" box that searches report names/descriptions (not your data — it only filters the list of report *types*).
- **Team, Campaigns, Tasks, Meetings, Templates**, etc. each have their own local search or filter controls within that page.

**Q: What does the "Find a report" search box on the Reports page actually search?**
Only the names and short descriptions of the available report types (e.g. typing "email" surfaces the Email Performance report). It does not search inside your lead/deal/task data.

### Step-by-step: Using search effectively

1. Decide what kind of record you're looking for (a lead, a document, a report, a teammate).
2. Navigate to that module first (Leads, Documents, Reports, Team, etc.).
3. Use that module's built-in search box or filter panel — most support partial-name matching and additional filters (status, owner, date, etc.).
4. If unsure which module a record lives in, start with **Leads**, since most CRM activity revolves around lead/opportunity records.

### Tips & common mistakes

- Don't expect typing into the Reports page's "Find a report" box to locate a specific lead or deal — it only filters the report *catalog*, not your business data.
- If a search returns nothing, double-check you're in the right **workspace** — searches and filters are scoped to your currently selected workspace, so a record living in a different workspace won't show up until you switch to it.

### Troubleshooting

**Q: Why does my search return no results even though I know the record exists?**
The most common cause is being in the wrong workspace — switch workspaces using the workspace switcher in the top bar and search again. The second most common cause is applying too many filters at once — clear filters one at a time to widen the search.

---

## Glossary

- **KPI (Key Performance Indicator)** — a single important number used to judge performance at a glance, e.g. "Win Rate" or "Open Tasks."
- **Widget** — an individual chart, stat card, or table block on the Dashboard or a report.
- **Notification** — a message generated automatically by the system about an event relevant to you, delivered in-app and/or by email.
- **In-app notification** — a notification that appears in the bell dropdown inside Connexify itself.
- **Email notification** — the same event, but sent to your inbox as an email.
- **Digest** — a bundled notification sent once at a scheduled time (e.g. "Tasks due today" every morning) instead of one notification per event.
- **Quiet hours** — a configured time window during which notification emails are held back and sent once the window ends.
- **Email Open Rate** — the percentage of sent emails opened at least once (Opened ÷ Sent).
- **Click Rate** — the percentage of sent emails where the recipient clicked a tracked link (Clicked ÷ Sent).
- **Reply Rate** — the percentage of sent emails that received a reply (Replied ÷ Sent) — generally the most reliable engagement signal.
- **Pipeline Value** — total dollar value of all currently open (not yet won or lost) opportunities/deals.
- **Win Rate** — Won Value ÷ (Pipeline Value + Won Value), as a percentage.
- **Stale / Untouched Lead** — a lead with no logged activity for 14+ days.
- **Data Health** — a report highlighting data-quality issues: unassigned, untouched, missing-email, and duplicate leads.
- **Report Category** — a grouping of related reports (Executive Overview, Sales & Pipeline, Productivity, People & HR, Communications & Data).
- **Comparison ("vs prior period")** — an optional toggle that fetches the equivalent previous date range alongside your selected range.
- **Workspace** — a scoping boundary within your company; data (leads, reports, notifications, search results) is filtered to whichever workspace you currently have selected.
