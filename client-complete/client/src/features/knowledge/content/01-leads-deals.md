# LeadNest Knowledge Base — Leads, Opportunities, Pipeline & Deals

This section of the Knowledge Base covers everything related to managing your sales records in LeadNest: Leads, Opportunities, the Pipeline board, Deals, Deal Payments, and the two setup screens that control how these work — Lead Configuration and Lead Distribution.

---

## A note on "Contacts" and "Companies"

LeadNest does not have separate stand‑alone "Contacts" or "Companies" list screens. Instead, contact details (name, email, phone, job title/designation) and company details (company name, address, city, state, country, postal code) are stored directly **on each Lead and Opportunity record**. When a Lead is converted into an Opportunity, its contact and company information carries over automatically. If you were looking for a dedicated address book, use the **Leads** list (filter/search by company or contact name) instead — it serves that purpose.

---

## 1. Leads

### 1.1 Module overview

The **Leads** module is where every new potential customer enters your CRM — whether typed in manually, imported from a spreadsheet, or captured automatically from a source such as a web form. A Lead record holds the person's contact details, company, requirement/notes, budget ("value"), source, status, score, tags, and any custom fields your company has defined. Sales reps use this list to track, qualify, and follow up with prospects before they become sales Opportunities.

### 1.2 Frequently asked questions

**How do I create a lead?**
Open **Leads → Add Lead**. In the drawer, fill in at minimum: **Contact name**, **Phone**, and **Source** — these three are required. Everything else (email, WhatsApp, alternate phone, company, designation, address, budget/value, requirement notes, tags, and custom fields) is optional. Choose a **Status** (defaults to *New*) and, optionally, one or more teammates under **Assignment**. Click **Save Lead**.

**What lead statuses exist and what do they mean?**
- **New** — just entered, not yet contacted (blue badge)
- **Contacted** — first outreach made (amber badge)
- **Qualified** — confirmed as a real opportunity (slate/blue badge)
- **Proposal** — a proposal/quote has been sent (cyan badge)
- **Won** — the lead converted to business (green badge)
- **Lost** — did not convert (red badge)
- **Junk** — invalid/spam lead (gray badge)

If you mark a lead **Lost** or **Junk**, the system requires you to enter a reason — you cannot save the status change without one.

**What do the source options mean?**
Web Form, Manual, CSV Import, API, Referral, Campaign, LinkedIn, Cold Email, Other (and internally, Call Log for leads created from your call history). Sources shown in the "Add Lead" source dropdown are the ones your admin configured under Lead Configuration (new companies start with *Web Form*, *Manual*, and *Referral* pre-seeded).

**What is the colored dot/number next to a lead ("lead score")?**
That's the **Lead Score**, a number from 0–100 calculated automatically from your company's scoring rules (engagement, activity, profile completeness, etc.). Green (80+) = high priority, amber (50–79) = medium, red (under 50) = low. Scores recalculate automatically whenever the lead is created, updated, or an activity is logged.

**Can I edit a lead?**
Yes — open the lead or use the row's edit action. You need the **Leads – Update** permission. Editing a lead automatically logs a field-change entry in its Activity Timeline (who changed what, and when), so changes are always auditable.

**Can I delete a lead? What happens?**
Deleting a lead **soft-deletes** it (it's moved to the workspace's Archive, not permanently erased) and requires the **Leads – Delete** permission. Archived leads can be restored at any time from the **Archived Leads** tab, or permanently erased ("Permanent delete" — irreversible) if you have delete permission.

**How do I restore an archived lead, or bulk-restore many?**
Go to the **Archived Leads** tab, select one or more rows, and choose **Restore** (brings it back to the active list) or **Permanently delete** (irreversible — removes all trace, including from the database). Bulk restore/permanent-delete is available for multi-select.

**What are custom fields, and how do I add one?**
Custom fields let you capture information specific to your business that isn't part of the standard lead form (e.g., "Renewal date," "Budget approved by"). Go to **Lead Configuration → Custom fields → Add custom field**. Supported types: Text, Long text, Number, Email, Phone, URL, Date, Dropdown, Multi-select, Radio, Checkbox. You can mark a field **Required**, and reorder fields by dragging. A required custom field must be filled in before a lead/opportunity can be saved.

Note: you **cannot delete** a custom field that already has saved values on any lead — you'll get a message telling you how many records use it; remove the values first or keep the field.

**Can I tag leads?**
Yes. Tags are short labels (e.g., "Hot," "VIP") with a color you choose. Add/manage tags under **Lead Configuration → Tags**, or create a new tag inline while editing a lead. Adding a tag to a lead is logged in its activity feed with the tag name and color.

**How do I assign or reassign a lead's owner?**
Open the lead and change the assignee, or use **Bulk actions → Assign** from the list to reassign multiple leads at once. Leads also support multiple **collaborators** (assigned users) in addition to the single primary owner, if your workspace uses the assignments feature. Both the person who becomes primary owner and any newly-added collaborators receive a notification (unless you assigned it to yourself).

**What bulk actions are available on the Leads list?**
Select rows via checkboxes, then choose from: **Assign** (single owner + collaborators), **Change status**, **Bulk update** (status, pipeline stage, source, value, country/city/state), **Delete**, **Tag**, and **Export**. All bulk changes are logged per-record in each lead's activity history, and affected owners are notified.

**How do I import leads?**
Two ways exist in the app:
1. **Add Lead → Bulk Lead Upload tab** (the main import flow): download the CSV template (or use your own .csv/.xlsx), choose the file, map each spreadsheet column to a lead field (name, company, email, phone, phone country code, WhatsApp, alternate phone, address fields, value, currency, requirement, notes, etc.), pick **one lead source** for the whole file, optionally choose one or more teammates to **round-robin assign** the imported rows to, then click **Import**. All imported rows start as source "CSV Import" and status **New**; duplicate emails/phones are automatically routed to the **Duplicate Leads** review queue instead of being created twice.
2. A simpler **Import Wizard** (paste-CSV) also exists for quick pasting of `name, company, email, phone, value` rows with an inline duplicate-review step before import.

**What happens to duplicate rows during import?**
Rows whose email or phone already matches an existing lead are **not created automatically** — they're queued in **Duplicate Leads** for manual review, where you can either create them as new leads anyway or merge them into the existing record.

**How do I export leads?**
Select leads (or none, for "export all matching filters") and choose **Export**. The output is a CSV with columns: Name, Company, Email, Phone, Status, Pipeline Status, Source, Score, Value, Assigned To, Created At. If you select leads across more than one workspace, you must be a Company Admin to export them together.

**Why can't I bulk-export across workspaces?**
Non-admin users can only export leads that belong to a single workspace at a time — this is a safeguard so that regular users don't move data between teams they don't manage.

**What is lead merging, and how does it work?**
When a duplicate is found (on create, import, or manual entry), it's saved to the **Duplicate Leads** queue instead of creating a second record. From there you can open **Merge**, which shows the incoming data side-by-side with the existing lead's data, field by field. Click a value on either side to choose which one wins (default is "keep existing"), or use **Use all →** / **← Use all** to bulk-pick one side. Confirm with **Merge Leads** — the existing lead is updated and the incoming duplicate entry is removed from the queue.

**What are Saved Views and Filter presets?**
You can build custom filter combinations (status, source, score range, value range, dates, assigned user, etc.) using the Filter Builder, then save them as a **Saved View** for one-click reuse later. Saved views are personal to your user.

**What are Assignment Rules?**
Auto-assignment rules let leads get an owner automatically as soon as they're created, based on rule type (Round Robin, By Territory, By Tag, By Capacity) and priority order. Configure them under **Leads → Assignment Rules** (requires Leads – Admin permission). New leads run through `autoAssignLead` immediately on creation/import if no assignee was explicitly set.

**What's the difference between "Lead Distribution" and "Assignment Rules"?**
Assignment Rules are automatic, ongoing rules applied at creation time. **Lead Distribution** (see its own section below) is a manual, on-demand tool for taking a batch of currently-unassigned leads/opportunities and splitting them evenly among chosen callers right now.

**Can I email a lead directly from LeadNest?**
Yes, if your company has connected Google/Gmail. Each lead has an **Emails** tab where you can send messages, see threaded conversation history, and sync replies. Inbound replies notify the lead's assigned owner.

**What are Tasks, Follow-ups, and Notes on a lead?**
- **Tasks**: to‑dos with a type (call, email, meeting, demo, follow‑up, WhatsApp, site visit, internal, document, custom, other), priority (low/medium/high/urgent), status (pending/in progress/completed/cancelled), due dates, subtasks, comments, attachments, and optional recurrence (daily/weekly/monthly/custom).
- **Follow-ups**: lightweight scheduled reminders tied to the lead.
- **Notes**: free-text notes with an optional title, kept in the lead's record.
All of these are visible on the lead's detail page and contribute to the Activity Timeline.

**Does editing a lead trigger any automation?**
Yes. Every create/update fires **workflow triggers** (`lead_created`, `lead_updated`) that can kick off any automated workflows your admin built (e.g., send a welcome email, notify a Slack channel via a Workflow). This happens in the background and does not slow down saving the lead.

### 1.3 Step-by-step: Creating your first lead

1. Go to **Leads** in the left navigation.
2. Click **Add Lead**.
3. Fill in **Contact name** and **Phone** (both required).
4. Choose a **Source** from the dropdown (required) — or click **+** to add a new source on the spot.
5. Optionally add email, WhatsApp, alternate phone, company, designation, and address.
6. Set a **Budget/value** and currency if known.
7. Set the **Status** (defaults to New).
8. Add tags and assign a teammate if applicable.
9. Fill in any required custom fields.
10. Click **Save Lead**.
   - If a duplicate email/phone is detected, the lead is instead saved to the **Duplicate Leads** review queue and you'll see a warning toast.

### 1.4 Step-by-step: Bulk importing leads from a spreadsheet

1. Open **Add Lead → Bulk Lead Upload**.
2. Click **Download CSV template** for the expected columns, or prepare your own .csv/.xlsx with a header row.
3. Click **Choose file** and select your file (if it's an Excel workbook with multiple sheets, pick the correct worksheet).
4. For each detected column, choose which lead field it maps to (or leave it as **Skip this column**).
5. Choose the single **Lead source** that will apply to every imported row.
6. Optionally select one or more teammates under **Assign to (round robin)** — imported leads will be spread evenly across them in order; leave empty to keep them assigned to you.
7. Review the **Ready to import** summary, then click **Import N Leads**.
8. Check the **Duplicate Leads** tab afterward — any rows matching existing emails/phones were routed there instead of being created.

### 1.5 Tips & best practices

- Always fill in **phone** with the correct **country code** — LeadNest validates and normalizes phone numbers, and duplicate detection relies on the normalized number.
- Don't set the alternate phone to the same number as the primary phone — the system blocks this with a validation error.
- Use **tags** for cross-cutting labels (e.g., "Hot," "Enterprise") rather than creating many near-duplicate lead sources.
- Before a big CSV import, download and check the template so your columns map cleanly — unmapped columns are simply skipped, which can silently drop data you meant to import.
- Use **Saved Views** for filter combinations you run often (e.g., "My new unassigned leads this week") instead of rebuilding filters every time.

### 1.6 Common mistakes

- Forgetting to select a **Source** when adding a single lead — this is required and the form will reject the save with a toast error.
- Assuming bulk export always downloads *all* records — it only exports the rows currently selected/matching filters, and cross-workspace selections require admin rights.
- Deleting a custom field that's still in use — the system will block this and tell you how many leads have values for it.

### 1.7 Troubleshooting

**"Why can't I create this lead — it says duplicate detected?"**
A lead with the same email or phone number already exists in this workspace. You can view the matched lead, or (on create) it will be queued in Duplicate Leads for merge/review instead of blocking you outright.

**"Why does editing this lead fail with a phone error?"**
Phone and alternate phone cannot be identical (same number, same country code). Change one of them.

**"Why can't I mark this lead as Lost/Junk?"**
You must provide a reason — the **Reason** field is required whenever status is set to Lost or Junk.

**"Why don't I see all leads in the company?"**
Your visibility is scoped by workspace and by your role's data-access rules (`leadAccessWhere`). If you're not a Company Admin, you'll only see leads in workspaces you're a member of, and — depending on your role — possibly only leads assigned to you or your team.

**"Why did my import say 'requires deduplication' instead of importing?"**
The system found existing leads matching emails in your file and is asking you to confirm whether to skip those rows or update the existing records, rather than silently creating duplicates.

**"Why can't I delete this custom field?"**
It already has saved values on one or more leads. Remove those values first, or simply stop using the field going forward.

### 1.8 Permissions (Leads)

All Lead actions are governed by the `main.leads` permission with these levels:
- **View** — see the list, a lead's detail, activities, notes, emails, saved views, and analytics.
- **Create** — add leads, import, create activities/notes/tasks/follow-ups/files, restore from duplicates.
- **Update** — edit leads, change status, bulk-update, restore archived leads, edit notes/activities/tasks/follow-ups.
- **Delete** — soft-delete leads, bulk archive/restore/permanently delete.
- **Admin** — manage Lead Configuration (sources, tags, deal statuses, opportunity statuses, custom fields), scoring rules, and Assignment Rules.

---

## 2. Opportunities

### 2.1 Module overview

An **Opportunity** is a Lead that has been qualified as a genuine sales possibility. Technically, Opportunities are still Lead records — converting a lead simply flips its `isOpportunity` flag on and gives it a pipeline status. This lets all the contact history, tasks, and notes carry forward seamlessly. Opportunities move through **Opportunity Statuses** (a customizable pipeline, e.g., New → Qualified → Proposal Sent → Negotiation → Won/Lost) rather than the plain Lead statuses.

### 2.2 Frequently asked questions

**How is an Opportunity different from a Lead?**
Same underlying record type, but an Opportunity has `isOpportunity = true` and moves through **Opportunity Statuses** instead of Lead statuses. Opportunities appear on the **Pipeline** board; ordinary leads do not (unless converted).

**How do I create a new Opportunity directly (not by converting a lead)?**
Use **New Opportunity** on the Pipeline/Opportunities page. Fill in Full name and Company (both required), plus optional job title, industry, company size, website, LinkedIn, deal name/description, deal value & currency, pipeline status, owner, and custom fields. Saving creates a brand-new Lead record already marked as an Opportunity.

**How do I convert an existing Lead into an Opportunity?**
From the Lead record or via the Opportunities "create" flow, submit with the existing lead's ID. The system updates that same lead in place (sets `isOpportunity = true`, assigns the initial Opportunity Status, and applies any contact/company/value overrides you provided) — it does **not** create a second record. An activity entry "Converted to opportunity" is logged.

**What are the default Opportunity statuses?**
New (initial), Qualified, Proposal Sent, Negotiation, Won, Lost — seeded automatically the first time your workspace opens Leads/Opportunities. Admins can rename, add, delete, and reorder these under **Lead Configuration → Opportunity status**.

**How do I move an Opportunity to a different status?**
Drag its card between columns on the **Pipeline** Kanban board, or use the status dropdown in list view / on the record itself. Each change is logged as a "status_change" activity ("Opportunity status changed from X to Y by [name]").

**Can I edit an Opportunity's details?**
Yes — full name, email, phone, job title, company, deal value/currency, deal name/description, tags, owner, and custom fields are all editable. Field changes are logged to the activity timeline just like Leads.

**Can I delete an Opportunity?**
Yes (requires Opportunities – Delete). This soft-deletes the underlying lead record.

**How do I turn an Opportunity into a Deal?**
Click **Add deal** on its Pipeline card (or from the Opportunity detail), which opens the Add Deal drawer pre-linked to that opportunity. See the Deals section below.

**Why do I see "Pipeline lead" as a default title?**
If you don't type a **Deal name**, the system auto-generates one from the company name and/or contact name (falls back to "Pipeline lead" if neither is available).

### 2.3 Step-by-step: Converting a lead to an opportunity

1. Open the lead you want to convert (or use the "Convert" action if available on its record).
2. Provide/confirm full name and company (pre-filled from the lead).
3. Optionally set a deal name, description, value, currency, and choose a starting pipeline status (defaults to the workspace's initial status).
4. Save — the same lead record now appears on the Pipeline board as an Opportunity, retaining all its history, tasks, and notes.

### 2.4 Permissions (Opportunities)

Governed by `main.opportunities`:
- **View** — see the opportunities list and individual records.
- **Create** — create new opportunities or convert leads into opportunities.
- **Update** — edit opportunity fields and change pipeline status.
- **Delete** — soft-delete an opportunity.

---

## 3. Pipeline

### 3.1 Module overview

The **Pipeline** page is the visual home for all your Opportunities. It offers a Kanban board (columns = Opportunity Statuses) and a sortable/filterable list view, with KPIs at the top (total in view, total value, average value, high-score count, and "needs attention" — unassigned or stale records).

### 3.2 Frequently asked questions

**What's the difference between Board and List view?**
Board (Kanban) groups opportunities into columns by status and lets you drag cards between columns to change status. List view is a sortable, filterable table with the same records, useful for scanning many records or bulk actions.

**What do the colored priority tags (High/Medium/Low) on a card mean?**
They're derived from the **Lead Score**: 80+ = High (rose), 50–79 = Medium (amber), below 50 = Low (slate). This is not a separate field — it's a visual read of the score.

**How do I filter the pipeline?**
Use Search (name/company/email/job title/phone), the **Status** multi-select, the **Assigned to** multi-select, and the sort dropdown (Recently updated, Deal value, Name, Company, Lead score, Newest first). An "Active filters" strip appears below so you can see and clear applied filters quickly.

**What does "Need attention" mean on the KPI row?**
The sum of unassigned opportunities (no owner) plus stale ones (no activity in the last 14 days).

**Can I export what I see on the Pipeline?**
Yes — the **Export** icon downloads the current page of filtered results as a CSV (deal name, contact, company, job title, email, phone, status, deal value/currency, lead score, owner, last activity).

**How do I create a Deal straight from a Pipeline card?**
Click **Add deal** on the card (list view) or the equivalent action in Board view — this opens the Add Deal drawer pre-linked to that opportunity.

**Why does the Board only show up to a few hundred records?**
For performance, Kanban mode loads up to 400 matching records at once; if you have more, refine your filters or switch to List view (which paginates 10/25/50 per page).

### 3.3 Step-by-step: Using the Pipeline Kanban board

1. Go to **Pipeline** in the navigation.
2. Make sure you're in **Board** view (toggle in the top-right of the filter bar).
3. Use Search/Status/Assigned-to filters to narrow down what's shown.
4. Grab a card by its drag handle (the grip icon that appears on hover) and drop it into a different status column to update its pipeline status — this fires a toast confirmation and logs an activity entry.
5. Click **Add deal** on any card to start a Deal for that opportunity, or click the card itself to open its full record.

### 3.4 Permissions

Pipeline reuses the **Opportunities** permission set (`main.opportunities`) described above — there is no separate Pipeline permission.

---

## 4. Deals

### 4.1 Module overview

A **Deal** represents a concrete sales agreement tied to a specific parent Opportunity (a "funnel opportunity lead"). Deals track their own name, description, monetary value, currency, stage (from **Deal Statuses**, e.g., Qualification → Proposal → Negotiation → Contract Sent → Won/Lost), owner, activity log, and (see next section) payments received. Multiple Deals can exist under the same Opportunity — useful for tracking multiple contracts, renewals, or upsells with the same account.

### 4.2 Frequently asked questions

**How is a Deal different from an Opportunity?**
An Opportunity is the overall sales possibility; a Deal is a concrete transaction record linked underneath it. **Deals cannot exist without a parent Opportunity** — the system explicitly blocks creating an "orphan" deal; you must either pick an existing funnel opportunity or convert a lead into one first.

**How do I create a new Deal?**
Click **New deal** on the Deals page (or **Add deal** from a Pipeline/Opportunity card). Pick the parent Opportunity (locked if you started from a specific card), enter Deal name (required), description, value, currency, and owner, then **Create deal**. New deals start in the workspace's initial Deal Status.

**What are the default Deal statuses?**
Qualification (initial), Proposal, Negotiation, Contract Sent, Won (marked as the "deal complete" status), Lost — seeded automatically and fully editable by admins under **Lead Configuration → Deal status name**.

**What does "Deal complete" mean on a status?**
Exactly one Deal Status can be flagged as the completion status (typically "Won"). This flag is used to identify closed/completed deals in reporting and in the pipeline board's completed column.

**How do I move a Deal to a new stage?**
Drag its card on the **Deals** board, or change the Stage dropdown in list view. Every stage change is logged as a Deal Activity ("Deal stage changed from X to Y by [name]").

**Can I edit or delete a Deal?**
Yes. Editing lets you change name, description, value, currency, and owner (requires Deals – Update). Deleting soft-deletes it (requires Deals – Delete).

**What is "Group by opportunity" on the Deals list?**
A toggle (list view only) that clusters deals under their parent opportunity, plus a "Direct deals" group for any deals without a visible parent grouping context — handy when one company has multiple deals running at once.

**How do I export deals?**
The **Export CSV** icon on the Deals page downloads the currently filtered/visible rows: parent opportunity ID, deal name, company, contact, stage, value, currency, owner, and last updated date.

**Can I deep-link into "create a deal for this opportunity" from elsewhere?**
Yes — navigating to `/deals?opportunityId=<id>` (or `leadId=<id>`) automatically creates a deal under that opportunity once, using the opportunity's title/value/currency/owner as defaults, and then clears the link from the URL.

### 4.3 Step-by-step: Creating a deal from an opportunity

1. On the **Pipeline** or **Deals** page, find the opportunity/card you want to convert into a deal.
2. Click **Add deal**.
3. The opportunity is pre-selected and locked; enter a **Deal name** (required), optional description, value, currency, and owner.
4. Click **Create deal**. The new deal appears on the Deals board in the initial stage.

### 4.4 Permissions (Deals)

Governed by `main.deals`:
- **View** — see deal list, detail, and activity feed.
- **Create** — create new deals.
- **Update** — edit deal fields and change stage.
- **Delete** — soft-delete a deal.

---

## 5. Deal Payments

### 5.1 Module overview

The **Deal Payments** tab (inside a Deal's detail view, and also as a workspace-wide "all payments" list) tracks money actually received (or pending/failed/refunded) against a Deal — separate from the deal's headline "value." This gives sales and finance a running ledger of installments, advances, or full payments per deal.

### 5.2 Frequently asked questions

**What fields does a payment have?**
Amount (required, must be greater than 0), Currency (3-letter code, defaults to the deal's currency), Payment date (required), Mode (Bank Transfer, Cash, Cheque, UPI, Card, Crypto, Other), Status (Received, Pending, Failed, Refunded), Reference/transaction ID (optional), and Notes (optional).

**What do the payment status colors mean?**
- **Received** — green, confirmed money in hand
- **Pending** — amber, expected but not yet confirmed
- **Failed** — red, the payment attempt did not succeed
- **Refunded** — gray, money was returned

**How do I record a payment?**
Open the Deal, go to its **Payments** tab, click **Add payment** (or similar), fill in amount/date/mode/status, and save. This immediately logs a Deal Activity entry describing the payment (amount, currency, mode, reference) and — if the deal has a parent opportunity — also logs it on that opportunity's activity feed so it's visible from either side.

**Can I edit or delete a recorded payment?**
Yes, both are supported per-payment from the Payments tab.

**Is there a workspace-wide payments view?**
Yes — a combined list across all deals in the workspace, filterable by status, mode, deal, the user who recorded it, and a date range. Useful for a finance/collections overview without opening each deal individually.

**Does a payment automatically update the deal's "value" or mark it Won?**
No — recording a payment is independent of the deal's stage and headline value. You still need to move the deal to its "Won"/complete stage separately; payments are a running record of money received, not a stage trigger.

### 5.3 Permissions

Deal Payments do not use a separate permission key — access is controlled by workspace membership on the parent Deal (any team member with access to the deal's workspace can view/record payments; it is intentionally **not** restricted to only the deal's owner, so any teammate covering the account can log a payment).

---

## 6. Lead Configuration

### 6.1 Module overview

**Lead Configuration** (found under Settings/Admin) is where administrators define the shared vocabulary used across Leads, Opportunities, and Deals for your whole workspace: **Sources**, **Tags**, **Custom fields**, **Opportunity statuses** (pipeline stages), and **Deal status names**. Everything here is scoped per workspace (except Tags, which are company-wide).

### 6.2 Frequently asked questions

**What can I configure here?**
Five tabs: **Source** (lead sources like Web Form, Manual, Referral), **Tags** (name + color), **Custom fields** (extra data points on leads/opportunities), **Opportunity status** (the pipeline stages Opportunities move through), and **Deal status name** (the stages Deals move through, plus which one is the "Deal complete" stage).

**Can I reorder statuses?**
Yes, for both Opportunity statuses and Deal statuses — drag rows to reorder. The **first** row in the order is automatically treated as the "Initial" status that new records start in.

**What does the "Initial" column mean?**
It marks which status a brand-new Opportunity/Deal starts in. It always tracks the first item in your sort order — you set it implicitly by dragging your desired starting status to the top.

**What does the "Deal complete" checkbox on a Deal status do?**
Only one Deal status at a time can be the completion status. Checking it on a row automatically un-checks it everywhere else.

**Can I delete a source, tag, status, or custom field?**
Sources, tags, and statuses can be deleted directly (a confirmation dialog warns this cannot be undone). Custom fields **cannot** be deleted while any lead still has a saved value for them — you'll get a "field in use" error naming how many records are affected.

**How do I add a custom field, and what types are supported?**
Click **Add custom field**, pick a type (Text, Long text, Number, Email, Phone, URL, Date, Dropdown, Multi-select, Radio, Checkbox), give it a label, decide if it's Required, and (for Dropdown/Multi-select/Radio) define its options. Fields can be reordered by drag-and-drop, and the order you set is the order they appear on the Lead/Opportunity forms.

### 6.3 Step-by-step: Setting up your pipeline stages

1. Go to **Lead Configuration → Opportunity status** (or **Deal status name** for the deals pipeline).
2. Click **Add opportunity status** / **Add deal status**, name it, and save.
3. Repeat for each stage you want.
4. Drag rows into the order you want them to appear as pipeline columns — the top row becomes the default starting stage for new records.
5. (Deal statuses only) Tick **Deal complete** on the stage that represents a won/closed deal.

### 6.4 Permissions

All Lead Configuration screens require **`main.leads` — Admin** permission (a step above regular Create/Update/Delete). This keeps pipeline/source/tag/custom-field structure changes limited to admins, since they affect every user's Leads and Opportunities views.

---

## 7. Lead Distribution

### 7.1 Module overview

**Lead Distribution** is a manual, on-demand tool for splitting a batch of currently **unassigned** leads or opportunities evenly across a chosen set of team members ("callers"), in strict round-robin order. It's designed for the common scenario of "we just got 50 new leads, split them evenly across the sales team right now."

### 7.2 Frequently asked questions

**How is this different from Assignment Rules?**
Assignment Rules run automatically the moment a lead is created. Lead Distribution is a manual action you trigger on demand for a batch of leads that are (or have become) unassigned.

**What records show up here?**
Only **unassigned** leads/opportunities, filtered by record type (All / Leads / Opportunities) and status. You can search by name, company, or email.

**How do I select which leads to distribute?**
Use the checkboxes to hand-pick rows, click **Select page** to grab everyone on the current page, or click **Select all N leads** to fetch and select every record matching your current filters (capped at 500 records per distribution run).

**How does the round-robin actually assign people?**
You pick one or more callers and put them in a specific order (using the up/down arrows). Leads are then handed out strictly caller 1, caller 2, caller 3, caller 1, caller 2… and so on until the selection is exhausted. The **Split preview** in the assignment dialog shows exactly how many each caller will receive before you confirm.

**What happens after I click "Confirm assignment"?**
Each selected lead's owner is set, an activity entry ("Lead assigned via round-robin distribution") is added to that lead, and each newly-assigned caller receives a batched notification. Leads that were already assigned to someone else (a race condition, e.g., someone else assigned them a moment earlier) are silently skipped and reported in the "skipped" count.

**Can inactive users receive leads through this tool?**
No — the system validates that every selected caller is an active user in your company; if any selected user is invalid or inactive, the whole distribution request is rejected with an error rather than partially assigning leads.

### 7.3 Step-by-step: Distributing unassigned leads to your team

1. Go to **Lead Distribution**.
2. Filter by record **Type** (All/Leads/Opportunities) and/or **Status** as needed, and search if you're looking for something specific.
3. Select the leads to distribute — use **Select page** for everything visible, or **Select all N leads** to grab every match across pages (up to 500).
4. Click **Assign leads**.
5. In the dialog, click each teammate you want to include — the order you click them in becomes the rotation order (adjustable afterward with the up/down arrows).
6. Review the **Split preview** (how many leads each person will get).
7. Click **Confirm assignment**. You'll see a toast confirming how many were assigned (and how many were skipped, if any).

### 7.4 Permissions

Lead Distribution relies on the same `main.leads` — **Update** permission used for reassigning individual leads (the underlying action is a bulk lead-assignment). You must also have access to the workspace the leads belong to.

---

## 8. Glossary

| Term | Meaning |
|---|---|
| **Lead** | A potential customer record — the base entity behind Leads, Opportunities, and (indirectly) Deals. |
| **Opportunity** | A Lead marked as a qualified sales possibility (`isOpportunity = true`), tracked through Opportunity Statuses. |
| **Deal** | A concrete sales transaction tied to a parent Opportunity; tracked through Deal Statuses and can have its own payments. |
| **Pipeline** | The Kanban/list view of all Opportunities, organized by Opportunity Status. |
| **Deal Status / Opportunity Status** | The customizable stage columns a Deal or Opportunity moves through (e.g., New → Qualified → Won). |
| **Owner / Assignee** | The primary user responsible for a record. Leads can also have additional **collaborators** (assigned users) beyond the single owner. |
| **Lead Score** | An automatically calculated 0–100 number reflecting how promising/engaged a lead is, driven by your company's scoring rules. |
| **Custom Field** | An extra data field your company defines beyond the standard form, attached to Leads/Opportunities. |
| **Tag** | A colored label you can attach to leads for quick visual grouping/filtering. |
| **Source** | Where a lead originated (Web Form, Manual, Referral, CSV Import, API, Campaign, LinkedIn, Cold Email, Other, Call Log). |
| **Duplicate queue** | A holding area for incoming leads/opportunities whose email or phone matches an existing record; reviewed via Merge or "create anyway." |
| **Merge** | The process of combining a duplicate entry into an existing lead, field by field. |
| **Archived lead** | A soft-deleted lead, recoverable via Restore, or permanently erasable. |
| **Round-robin** | An assignment method that distributes records evenly and in order across a chosen list of users. |
| **Assignment Rule** | An automatic rule (round robin, territory, tag, or capacity-based) that assigns new leads on creation. |
| **Workspace** | A team-scoped slice of your company's data; most Lead/Opportunity/Deal records and settings are scoped to one workspace. |
| **Requirement** | Free-text field capturing what the lead/opportunity needs (used as the "Deal description" once converted). |
| **Value / Deal Value** | The monetary size of the opportunity/deal, paired with a 3-letter currency code. |

---

*This Knowledge Base content reflects the Leads, Opportunities, Pipeline, Deals, Deal Payments, Lead Configuration, and Lead Distribution features as implemented in LeadNest's current codebase.*
