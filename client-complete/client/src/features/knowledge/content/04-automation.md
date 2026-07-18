# Automation, Campaigns & Web Forms — Knowledge Base

This section covers the three connected tools that let you capture leads automatically and act on them without writing any code:

1. **Automation (Workflows)** — a visual, drag-and-drop rule builder ("if this happens, do that")
2. **Campaigns** — organizing a batch of leads/opportunities under a shared team and tracking their progress and payments
3. **Web Forms & Lead Capture** — building forms you embed on your website that turn visitor submissions into CRM leads automatically

---

## 1. Automation (Workflows)

### 1.1 Module Overview

**What it is:** Automation lets you build "if this happens, then do that" recipes using a visual canvas — boxes connected by lines — instead of writing code. Each recipe is called a **workflow**.

**What problem it solves:** Without automation, your team has to remember to do repetitive things every time a lead comes in — assign someone, create a follow-up task, send a welcome email, wait a few days and check back in. Automation does this instantly and consistently, 24/7, without anyone needing to remember.

**Who uses it:** Sales managers and admins design workflows. Everyone benefits — reps get tasks and follow-ups auto-created, leads get an owner right away, no lead sits untouched.

**"No-code" in plain terms:** You never write a line of code. You drag boxes ("nodes") onto a canvas, connect them with arrows, and fill in simple dropdowns/checkboxes on each box (like "wait 15 minutes" or "send this email template"). The system reads that diagram and carries out the steps automatically whenever the trigger condition happens — in the background, without you needing to be logged in or watching.

### 1.2 FAQ

**Q: What can trigger a workflow to start?**
A: Four trigger types are available (a workflow needs exactly one or more trigger boxes as its starting point):
- **Lead created** — fires the instant a new lead is saved in the workspace.
- **Lead updated** — fires after any change to an existing lead. You can optionally restrict it to fire only when specific fields change (status, source, assigned-to, email, phone, company, contact name, title, city, deal value, notes, pipeline status) — leave this empty to fire on any change at all.
- **Campaign stage changed** — fires when a lead moves to a different stage inside any campaign it belongs to.
- **Campaign payment received** — fires when a payment on a campaign lead is recorded with status "received."

**Q: What "Condition" checks are available?**
A: A Condition box compares one lead field against a value and sends the lead down a "Yes" or "No" path. You can check: lifecycle status, whether it's an opportunity, source channel, configured workspace source, pipeline/opportunity status, email, phone, company, contact name, title, city, deal value (text), or notes. Operators available: Equals, Not equals, Contains, Does not contain, Starts with, Ends with, Greater than / Greater or equal / Less than / Less or equal (for numbers), Is empty, Is not empty, and Changed (only meaningful on the "Lead updated" trigger — always false on "Lead created").

**Q: What does the "Delay" box do?**
A: It pauses the workflow for a set number of minutes (0–10,080, i.e. up to 7 days) before continuing to the next box. The system checks for workflows that are ready to continue roughly every 30 seconds, so a 5-minute delay may resume slightly after the 5-minute mark, not to-the-second.

**Q: What actions can a workflow perform?**
A: Four action types:
- **Assign owner** — pick one or more teammates. If a lead already has an owner, this step is skipped (manual assignment is never overwritten). If you pick more than one teammate, leads are assigned in round-robin order (whoever's next in the rotation), so work is spread evenly rather than always landing on the same person.
- **Create task** — adds a task on the lead (title, type, priority, optional description, optional subtasks, due date as "no due date" or "N days from now"). You choose who it's assigned to: the lead's current owner, a specific teammate you pick, or whoever triggered the workflow.
- **Create follow-up** — schedules a follow-up reminder for the lead's current assignee, after a preset delay (5, 10, 15 minutes; 1, 2, 4, 8, or 24 hours), with an optional note. If the lead has no assignee yet, this step is skipped rather than failing.
- **Send email (template)** — sends one of your saved email templates to the lead's email address. If the lead has no email on file, this step is skipped.

**Q: What is the difference between Draft, Active, and Paused?**
A: 
- **Draft** — the workflow exists but has never been published; it will not run automatically.
- **Active** — published and running; it fires on live trigger events.
- **Paused** — temporarily switched off; it keeps its design but won't react to new events until resumed. Toggle Pause/Activate directly from the workflow list menu or the editor toolbar.

**Q: What does "Publish" actually do, versus just saving?**
A: The canvas auto-saves your diagram as you edit (draft changes), but auto-save alone does **not** make the workflow active. **Publish** validates the diagram (see below), saves a numbered version snapshot you can look back on, bumps the workflow's published version, and switches its status to Active. Every publish is versioned, so you always know which exact diagram powered a given run.

**Q: What does Publish check before it lets me go live?**
A: It requires: at least one trigger node in the diagram; no edges pointing to/from a missing node; every node has a recognized type; an "Assign owner" box has at least one teammate selected; a "Send email" box has a template chosen; a "Condition" box has a field selected; a "Create task" box has a title filled in. If anything fails, Publish is blocked and you're shown the first problem.

**Q: How do I try a workflow before turning it on for everyone?**
A: Use **Test** (in the workflow list menu, or the Test button in the editor). Pick any lead or opportunity from your workspace, and the system runs the exact same engine against that one record — creating a real run you can inspect in Run history. This does not require the workflow to be Active.

**Q: Where do I see whether a workflow actually ran, and what happened?**
A: Open the workflow, click **Runs** to see run history. Each run shows a short ID, its status (running / waiting / completed / failed), which trigger type/version fired it, and when it started. Selecting a run shows a Steps table — one row per box the run passed through, with status and finish time, plus any error messages in red beneath the table. While a run is in progress or waiting, the drawer auto-refreshes every 2 seconds.

**Q: Can I watch a workflow run live on the canvas itself?**
A: Yes. Each box on the canvas shows a small colored badge in its corner reflecting live run status: gray "pending", blue pulsing "running", amber "waiting", green "completed", red "failed", gray "skipped". By default the canvas follows the most recent run; you can pin it to an older run from the Runs drawer instead.

**Q: What happens if a step fails partway through?**
A: The run is marked **failed**, the failing step records the error message, and the workflow stops — later boxes in that run do not execute. Nothing is retried automatically inside a single run; you'd need to Test again or wait for the next natural trigger event. Common causes of a failed step: "Assign owner" configured with teammates who are since deactivated/removed; "Send email" pointing at a template that was deleted or archived.

**Q: Can a workflow loop forever?**
A: No — there's a hard ceiling of 200 total steps per run (counted across all delay-resumes), so even a workflow with a circular path (a loop back to an earlier box) will stop itself and mark the run as failed with a "possible loop" message rather than running indefinitely.

**Q: If two branches both lead back into the same box, does it run twice?**
A: No. Within one run, each box only executes once even if multiple paths converge on it; a second arrival is simply skipped (not re-run).

**Q: Does the round-robin "Assign owner" remember where it left off?**
A: Yes — the workflow keeps its own rotation position per Assign-owner box, so the next new lead reaching that box goes to the next person in the list (in the order you checked them, wrapping back to the top after the last one).

**Q: How do campaign events reach workflows — is there a delay?**
A: Lead-based triggers (create/update) and campaign-stage/payment triggers are processed the moment the event happens. If your server has background job processing enabled (see "Redis" below), the trigger is handed off to a background queue so the person who just saved the lead isn't kept waiting; otherwise it runs inline before the save response returns. Either way it typically completes in well under a second unless a Delay box is involved.

**Q: What is "background processing" and does it affect me?**
A: When your system administrator has enabled a background job service, workflow triggers are queued and picked up by worker processes rather than running directly inside the same request that created/updated the lead. This makes lead-saving feel instant even if a workflow does a lot of work. If background processing isn't configured, everything still runs — just synchronously, which is fine for smaller workspaces.

**Q: Who can build/edit/publish workflows?**
A: Access is controlled by the "Automation" permission area for your role (view / create / update / delete). Someone with only "view" can see workflows and run history but cannot create, edit, publish, or delete them.

**Q: Can I start from a template instead of a blank canvas?**
A: Yes. Clicking "New workflow" opens a gallery with starter templates (e.g. "Welcome New Lead," "Lead Follow-Up Sequence," "Stale Lead Alert," "Meeting Post Follow-Up," "High-Value Lead Escalation," "Campaign Lead Qualified," and more) alongside a "Start from scratch" option.

### 1.3 Step-by-step: Building your first automation workflow

1. Go to **Automation** in the sidebar and click **New workflow**.
2. Pick a starter template or choose **Start from scratch**, then name your workflow.
3. You land in the editor with one trigger box already on the canvas (e.g. "Lead created"). Configure it — for "Lead updated," optionally check which fields to watch.
4. Open the **Add node** panel on the left. Drag in a **Condition** box if you want to branch (e.g. only continue if Source = Web Form), a **Delay** box if you want to wait, and one or more **Action** boxes (Assign owner, Create task, Create follow-up, Send email).
5. Connect boxes by dragging from the small dot ("handle") at the bottom of one box to the top of the next. Condition boxes have two output dots — drag from **No** or **Yes** to branch your logic.
6. Fill in each box's settings (e.g. select teammates for Assign owner, pick a template for Send email, set minutes for Delay).
7. The canvas **auto-saves** ~650ms after you stop editing — watch the "Saving… / Saved" indicator at the top.
8. Click **Test**, search for a real lead, and run it to confirm the diagram behaves as expected. Check the **Runs** drawer for the outcome.
9. When you're happy, click **Publish** — this validates the diagram and switches it to **Active**.

### 1.4 Step-by-step: Publishing a workflow

1. Open the workflow in the editor.
2. Make sure every action box that needs a selection has one (a teammate, a template, a condition field, a task title) — Publish will refuse otherwise and tell you which box is incomplete.
3. Click the **Publish** button (top right, rocket icon).
4. On success the workflow's status badge changes to **Active** and a new version number is recorded — you can always tell which version powered a past run from its Run history entry.
5. If you need to make further changes later, keep editing (auto-saves as Draft-in-place) and click Publish again to push a new version live.

### 1.5 Tips & best practices

- **Always test before publishing**, especially for anything that sends real emails or reassigns leads — a Test run uses the exact same engine as a live trigger, so it's a true dry run.
- **Don't forget to Publish.** Editing and auto-save alone will not make a workflow active — many "why isn't my automation running" cases are simply an unpublished draft.
- **Watch out for accidental loops.** If you connect a later box back to an earlier one (directly or through a condition), the run will hit the 200-step ceiling and fail with a "possible loop" message. Loops aren't supported as a deliberate feature — build a repeating sequence with several Delay + Action boxes in a straight line instead.
- **Round-robin needs an active, existing team.** If everyone selected in an Assign-owner box is later deactivated or removed, that step will fail on the next run — review Assign-owner boxes periodically.
- **"Lead updated" without watched fields fires on every save**, including saves your own automation triggers (e.g. Assign owner updates the lead). If you don't scope watched fields, you can end up with a workflow re-triggering itself on its own side effects — always narrow "Lead updated" triggers to the specific fields you actually care about.
- **Assign-owner respects manual overrides.** If a lead already has an owner (assigned manually or by an earlier step), the Assign-owner box is skipped rather than reassigning — so automation never fights with a rep's manual pick.

### 1.6 Troubleshooting

**Q: Why didn't my workflow trigger at all?**
A: Check, in order: (1) Is the workflow's status **Active** (not Draft or Paused)? Only Active workflows react to live events. (2) Does the trigger type match what actually happened (e.g. you configured "Lead created" but this was an update)? (3) If it's a "Lead updated" trigger with watched fields set, did one of those specific fields actually change? (4) Do you have the right trigger node at all — a workflow needs a trigger box connected on the canvas, not just floating actions.

**Q: A run shows "waiting" and hasn't moved — is it stuck?**
A: "Waiting" means the run hit a Delay box and is paused until that time elapses; the server checks for runs ready to resume roughly every 30 seconds, so it should pick up shortly after the wait time passes. If it's been "waiting" far longer than the configured delay, check with your administrator — it may indicate the background scheduler isn't running.

**Q: A run shows "failed" — what do I do?**
A: Open **Runs**, select that run, and look at the Steps table — the failing step and its error message (shown in red) tell you exactly what went wrong (e.g. "Assign owner: all configured users are inactive or removed," "Template not found," "Lead not found"). Fix the underlying issue (re-add an active teammate, restore/replace the template) and re-test.

**Q: I published, but old runs still show the previous behavior.**
A: That's expected — each run is stamped with the workflow version that was active when it started. Only new events after your publish use the new version; already-running or already-completed runs reflect whatever version triggered them.

**Q: My workflow ran but skipped an action instead of doing it — is that a bug?**
A: Not necessarily. Several actions are designed to skip safely rather than fail: Assign-owner skips if the lead already has an owner; Send email skips if the lead has no email address; Create follow-up skips if there's no one to assign the follow-up to. Skipped steps show as "skipped" in the Steps table, not as errors.

---

## 2. Campaigns

### 2.1 Module Overview

**What it is:** A Campaign is a named batch of leads and/or opportunities assigned to a specific group of team members, tracked through a custom set of pipeline stages, with optional monetary targets and payment tracking.

**What problem it solves:** When you're running a promotion, a bulk outreach push, or a sales sprint, you need to hand a defined pool of leads to a defined group of reps, watch how each lead moves through stages (e.g. New → Contacted → Qualified → Converted), and track money coming in against a goal — all without manually re-tagging or re-assigning each lead one at a time.

**Who uses it:** Sales managers/admins create and configure campaigns; sales reps work the leads assigned to them within a campaign and update stages/payments as they progress.

### 2.2 FAQ

**Q: How does a campaign get its leads?**
A: When creating a campaign, you pick leads/opportunities from a searchable, filterable picker (by status, source, assignee, tags, score, value, workspace, or custom filter rules). You can also add more leads to an existing campaign later via "Add leads."

**Q: How are leads assigned to team members?**
A: You check which teammates are on the campaign team. Leads are then distributed **round-robin** across that team — one lead to the first person, the next lead to the second, and so on, wrapping back to the top. Two settings change this behavior:
- **Prefer existing assignee** — if a lead already has an owner and that owner is one of the checked team members, keep that person instead of reassigning via round-robin.
- **Do not update lead owner** — only records the campaign-level assignee (used for campaign reporting/permissions) without touching the lead's actual CRM owner field.

**Q: What are campaign "stages," and can I customize them?**
A: Every campaign starts with four default stages: **New → Contacted → Qualified → Converted**. You can fully customize stage keys, labels, and order per campaign in the stage editor. A stage that still has leads on it cannot be deleted — you'll be told how many leads are stuck there and must move them first.

**Q: How does a lead move between stages?**
A: A rep updates the stage from the campaign leads view or the pipeline kanban. Every stage change is logged in a stage history you can review per lead (who changed it, from what, to what, when). Moving a lead's stage also fires the **"Campaign stage changed"** automation trigger, so a workflow can react (e.g. auto-convert a qualified campaign lead into a deal).

**Q: Can leads be spread across a campaign again if new team members join later?**
A: Yes — use **Distribute leads**, which finds all currently-unassigned campaign leads and round-robins them across the current team (respecting "prefer existing assignee" if enabled). Removing a team member automatically frees up their campaign leads back to "unassigned" rather than leaving them pointed at someone no longer on the team.

**Q: How does payment tracking work?**
A: Each campaign lead can have one or more payments recorded (amount, date, payment mode, status: received / pending / failed / refunded, optional reference note). The campaign detail and report pages roll these up into totals — received, pending, failed, refunded — and break them down by pipeline stage, by payment mode, and by team member. If a campaign has a **lead target** (an amount goal) and a currency set, the report shows an achieved percentage against that goal. Recording a payment as "received" also fires the **"Campaign payment received"** automation trigger.

**Q: Can I stop new leads from being added to a campaign?**
A: Yes — leads can only be added, or moved between stages, while a campaign's status is **Active** and (if it has an end date) that date hasn't passed. Set the status to Inactive/Draft, or let the end date pass, to freeze it.

**Q: What happens if I try to delete a campaign or remove a lead that has payment history?**
A: The system blocks it. A campaign lead with recorded payments cannot be removed from the campaign (delete or reassign its payments first), and a campaign with any recorded payments cannot be deleted at all — set it to Inactive instead. This protects your financial history from being silently destroyed.

**Q: Do sales reps see the whole campaign, or only their part?**
A: Users without manager/admin-level roles ("sales-only" users) only see campaign leads assigned to them (either at the campaign level or on the underlying lead record), and only their own row in the team-performance report. Managers, workspace admins, and company admins see everything.

**Q: What currency does a campaign use?**
A: Each campaign has its own 3-letter currency code, set at creation and editable afterward; all payment/target figures on that campaign's report use that currency.

**Q: Can I export campaign data?**
A: Yes — both the campaign's lead list and its payment history can be exported as CSV directly from their respective screens.

### 2.3 Step-by-step: Creating a campaign and assigning leads

1. Go to **Campaigns** → **New campaign**.
2. On the left, search/filter and check the leads and/or opportunities you want in the campaign (use "Add page" to grab everyone on the current results page, or "Clear" to start over).
3. On the right, fill in campaign details: name, description, currency, an optional amount target, status (Active/Inactive/Draft), and an optional end date.
4. Under "Assign to team members," search/filter your team list and check everyone who should work this campaign — leads will round-robin across exactly this group.
5. Decide on **Prefer existing assignee** (keep a lead's current owner if they're on this team) and **Do not update lead owner** (leave the CRM owner field untouched, only track campaign-level assignment).
6. Click **Create campaign**. You're taken to the campaign detail page, where you can watch stage counts, team performance, and (if applicable) payments.
7. To bring in more leads later, use **Add leads** from the campaign detail screen; to redistribute anyone left unassigned (e.g. after adding new team members), use **Distribute leads**.

### 2.4 Tips & best practices, common mistakes

- **Overlapping campaign targets:** a single lead can belong to multiple campaigns at once — the system doesn't prevent this. If two active campaigns both target the same lead pool with different assigned reps, you can end up with confusing double-assignment. Review your lead filters carefully before creating a campaign to avoid unintentionally re-targeting leads already in another active campaign.
- **Removing a stage that's in use will be blocked** — move affected leads to another stage first, then edit the stage list.
- **"Do not update lead owner" is useful when a lead has an established CRM owner you don't want to disturb**, but you still want to track campaign-specific assignment/performance separately.
- **Set an end date if the campaign is time-boxed** — after it passes, the campaign automatically stops accepting new leads or stage changes (you'll need to reactivate or extend it manually).
- **Recorded payments lock in a campaign/lead** — plan your payment entry process knowing you can't casually delete a campaign or remove a paid lead afterward.

### 2.5 Troubleshooting

**Q: I added a workflow trigger on campaign stage change, but nothing happened.**
A: Confirm the workflow is **Active** (not Draft/Paused) and its trigger is specifically "Campaign stage changed" — this only fires on an actual stage change (the "from" and "to" stage differ), not on adding a lead to a campaign or on other campaign edits.

**Q: A team member isn't getting any campaign leads.**
A: Check they're actually checked as a team member on the campaign (not just visible in the picker). Also confirm there are unassigned leads to distribute — if all current leads already have an owner (and "prefer existing assignee" applies), round-robin won't touch them until new leads are added or you run Distribute leads.

**Q: I can't remove a lead from a campaign / can't delete the campaign.**
A: This is by design if payments exist on that lead or campaign — delete the payment records first (if truly needed) or set the campaign to Inactive instead of deleting it.

---

## 3. Web Forms & Lead Capture

### 3.1 Module Overview

**What it is:** A drag-and-drop form builder that produces forms you can embed on any external website (via a script tag, an iframe, or a shareable public link, or as a popup). When a visitor submits the form, a new lead is created in your CRM automatically — no manual data entry.

**What problem it solves:** Instead of visitors emailing you or filling out a generic contact form that someone has to copy into the CRM by hand, web forms feed directly into your lead pipeline the instant someone submits — with duplicate detection, spam protection, auto-assignment, and optional automation triggers layered on top.

**Who uses it:** Marketing/admin users design and embed the forms; every visitor submission becomes a lead your sales team can work immediately.

### 3.2 FAQ

**Q: What field types can I add to a form?**
A: Basic: Text, Email, Phone, Number, Long text. Choice: Dropdown, Multi-select, Radio, Checkbox. Layout (non-data): Heading, Paragraph, Divider. Advanced: File upload, Date picker, Hidden field (carries a default value silently, e.g. a campaign code).

**Q: How do submissions become leads automatically?**
A: When someone submits, the system: checks the request isn't spam (honeypot/rate-based checks) and, if reCAPTCHA is enabled, validates that; validates required fields and file uploads (type/size); checks for an existing duplicate lead using the submitted contact details; if it's not a duplicate, creates a brand-new lead using the form's default status/source, any field-to-CRM-field mappings you configured, and auto-creates custom fields for any unmapped form fields so no data is lost; logs a system activity on the lead noting it came from this form submission; optionally auto-assigns the lead (if "Auto-assign" is turned on) and recalculates its lead score; and finally fires the **"Lead created"** automation trigger, so any matching active workflow runs against it, exactly like a lead created any other way.

**Q: What happens if the same person submits twice (duplicate detection)?**
A: The system checks the submitted contact info against your existing leads. If it finds a match, no new lead is created — the submission is linked to the existing lead instead (recorded as a duplicate submission) so you don't get duplicate CRM records from the same person filling the form twice.

**Q: What validation rules apply to form fields?**
A: Each field can be marked required (submission is rejected with a field-level error if left blank), and text fields can enforce a maximum length. File-upload fields can require at least one file, cap the number of files, and cap file size (in MB); disallowed file types (anything outside images, PDF, Word, Excel, CSV, audio, or video) are rejected outright.

**Q: How do I stop spam submissions?**
A: Two built-in layers: a **honeypot** field (invisible to real visitors, but bots often fill it in — those submissions are silently accepted-looking but dropped) and optional **reCAPTCHA** (site key/secret you configure per form). You can also restrict submissions to specific **allowed domains** so the form only works when embedded on your own site(s), not copied elsewhere.

**Q: How do I put the form on my website?**
A: From the form's embed panel you get three options: (1) a **script embed** — a small `<script>` snippet plus a placeholder `<div>` that renders the form inline wherever you paste it; (2) an **iframe embed** — a ready-made `<iframe>` tag; (3) a **public share link** — a hosted page with just the form, useful for sharing directly (e.g. in an email or social post) without needing your own web page at all.

**Q: Can the form appear as a popup instead of embedded inline?**
A: Yes — set the display type to popup (or slide-in). Popup triggers include: exit intent (visitor is about to leave), a time delay (seconds after page load), scroll depth (percentage scrolled), or a specific button click (via a CSS selector you provide). You can also configure overlay dimming, popup position, and appearance.

**Q: What can I customize about how the form looks?**
A: Form name, title/subtitle text, submit button text, primary/text/background colors, form width, border radius, font, and thank-you behavior — either showing a message or redirecting to a URL after submission.

**Q: Can I get notified when someone submits, or send the visitor a confirmation email?**
A: Yes, both are optional per form: **Notify team on submission** sends an internal notification (with a custom subject) to a list of recipient emails you configure; **Send confirmation email to lead** sends the submitter a confirmation using a saved email template (or one you generate with AI directly from the builder) with a custom subject/body.

**Q: What form statuses exist, and what do they mean?**
A: Draft (not live — the public link/embed won't accept submissions), Active (live and accepting submissions), Paused, and Archived. Only an **Active** form serves its public schema and accepts submissions — a Draft, Paused, or Archived form's public link/embed will show "Form not found" to visitors.

**Q: Are form views and submission counts tracked?**
A: Yes — total views and total submissions are tracked per form (view counts are de-duplicated per visitor for a period to avoid double-counting reloads), giving you a simple conversion rate on the forms list.

**Q: Who can build/manage forms?**
A: Access is controlled by the "Web forms & lead capture" permission area for your role (view / create / update / delete, etc.) — the same pattern as other modules.

### 3.3 Step-by-step: Building and embedding a web form

1. Go to **Web forms & lead capture** → **New form**.
2. In the builder, drag field types from the left palette onto the canvas in the order you want them to appear; click any field to open its settings panel on the right (label, placeholder, required, max length, options for choice fields, file constraints, etc.).
3. Switch to the "Form settings" panel (click empty canvas / no field selected) to set the form name, title, submit button text, colors, width, thank-you behavior, notification recipients, and confirmation email.
4. Use **Live preview** to see exactly what visitors will see.
5. Click **Save**. New forms start in **Draft** — switch the status to **Active** once you're happy (from the forms list or the form's settings), otherwise the public link/embed won't accept submissions.
6. Open the form's **Embed and share** panel and copy whichever integration fits your site: the script snippet (renders inline wherever you paste the div), the iframe tag, or the public share link.
7. Paste that code into your website's HTML (or share the link directly). Test it by submitting the form yourself and confirming a new lead appears in your CRM.

### 3.4 Tips & best practices, common mistakes

- **A form left in Draft won't accept any real submissions** — this is the single most common "my form doesn't work" mistake. Always flip it to Active once it's ready.
- **Map fields to CRM fields where it matters** (e.g. map an email field to the lead's email) so the data lands in the right place; anything left unmapped still isn't lost — it's automatically turned into a custom field on the lead.
- **Set Allowed Domains if you're worried about your embed code being copied elsewhere** — otherwise anyone who copies your script/iframe tag can host your form too.
- **Turn on the honeypot (on by default) and consider reCAPTCHA for public-facing, high-traffic forms** to keep spam leads out of your pipeline.
- **Use Auto-assign carefully** — it hands every new submission to someone automatically the moment it's created; make sure that's genuinely what you want versus assigning via a workflow with more control (e.g. round-robin across several people, or conditional routing by source).
- **Don't forget the automation angle** — because form submissions fire the same "Lead created" trigger as any other lead, you can chain a workflow onto form-sourced leads (e.g. auto-send a welcome email specifically to `source = web_form` leads) using a Condition box on Source in your workflow.

### 3.5 Troubleshooting

**Q: Why aren't form submissions appearing as leads?**
A: Check, in order: (1) Is the form's status **Active**? Inactive/Draft/Paused/Archived forms reject submissions outright. (2) Was the submission flagged as spam by the honeypot or reCAPTCHA? Honeypot-flagged submissions are silently dropped (the visitor sees a normal "success," but no lead is created) — check your spam settings if you suspect this is over-triggering. (3) Did the submission get matched as a **duplicate** of an existing lead? In that case, no new lead is created — the submission is linked to the existing one instead, which is expected behavior, not a bug. (4) Was the domain sending the request not in your **Allowed Domains** list (if you set one)? Requests from disallowed origins are rejected.

**Q: The form shows "Form not found" on my website.**
A: The form's status is not Active, or the embed token/link is wrong (e.g. copied from a different form). Re-copy the embed code from the correct form after activating it.

**Q: A visitor says they got an error submitting required fields.**
A: Check the field's required/max-length/file-size settings in the builder — validation errors are returned per field with a message, and the same rules that reject invalid submissions server-side are what the visitor is hitting.

**Q: My confirmation email or notification never arrived.**
A: Confirm "Send confirmation email"/"Notify on submission" toggles are turned on for the form, that a template and subject are set, and that the recipient list (for team notifications) contains valid addresses.

---

## 4. Permissions Summary

All three modules use the same role-based permission pattern: an admin defines what each role can **view**, **create**, **update**, and **delete** within a given area, and the server enforces it on every request (in addition to workspace-level scoping — you only ever see data for workspaces you have access to).

| Area | Controls |
|---|---|
| **Automation** | Viewing/listing workflows and their run history, creating new workflows, editing/publishing/pausing existing ones, deleting workflows. |
| **Campaigns** | Viewing campaigns/leads/reports, creating campaigns (and adding leads/members to them), updating campaigns (stages, assignments, lead stage/payment changes, distribution), deleting campaigns. |
| **Web forms & lead capture** | Viewing/listing forms and submissions, creating new forms, updating existing forms (including publishing them to Active), deleting forms. |

Additionally, within **Campaigns**, a further distinction applies regardless of the above: users without a manager/workspace-admin/company-admin role ("sales-only" users) automatically see and can act on **only the campaign leads assigned to them** — this is enforced on top of the create/view/update/delete permission grants, not instead of them.

---

## 5. Glossary

- **Workflow** — a saved automation recipe: a diagram of trigger, condition, delay, and action boxes that runs automatically when its trigger event happens.
- **Trigger** — the event that starts a workflow (lead created, lead updated, campaign stage changed, campaign payment received).
- **Node** — one box on the automation canvas (a trigger, condition, delay, or action).
- **Condition (node)** — a box that checks a lead field against a value and branches the workflow down a Yes or No path.
- **Delay (node)** — a box that pauses the workflow for a set number of minutes before continuing.
- **Action (node)** — a box that does something real: assigns an owner, creates a task, schedules a follow-up, or sends an email.
- **Run** — one execution of a workflow, from its trigger firing to completion (or failure/wait). Has a status: pending, running, waiting, completed, or failed.
- **Run step** — the record of one node's execution within a run, including its own status and any error message.
- **Publish** — the action that validates a workflow's diagram, saves a version snapshot, and switches its status to Active.
- **Draft / Active / Paused** — a workflow's lifecycle states; only Active workflows react to live trigger events.
- **Round-robin** — an assignment method that cycles through a list of people in order, one at a time, so work is spread evenly.
- **Campaign** — a named batch of leads/opportunities assigned to a team, tracked through custom pipeline stages with optional monetary targets and payment tracking.
- **Campaign stage** — one step in a campaign's custom pipeline (defaults: New, Contacted, Qualified, Converted); fully renameable/reorderable per campaign.
- **Campaign team member** — a user checked into a campaign's team; leads round-robin across this group.
- **Distribute leads** — the action that assigns any currently-unassigned campaign leads across the current team.
- **Lead target** — an optional monetary goal set on a campaign, compared against total payments received for an "achieved %" figure.
- **Web Form** — a form you build visually and embed on an external website (or share as a link/popup) to capture leads.
- **Field (form)** — one input on a web form (text, email, dropdown, file upload, etc.), each with its own validation rules.
- **Embed code** — the snippet (script tag, iframe tag, or link) you paste into your website to display a web form.
- **Web Form Submission** — one visitor's completed and sent form, which becomes (or is matched to) a lead.
- **Duplicate detection** — the check that prevents a second lead being created when a submission matches an existing lead's contact details.
- **Honeypot** — a hidden form field used to silently catch and drop bot spam submissions.
- **Auto-assign** — an optional form setting that automatically assigns every new lead captured by that form to someone right away.
