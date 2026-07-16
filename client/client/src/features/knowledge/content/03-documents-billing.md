# LeadNest Knowledge Base — Documents, Quotations, Invoices & Billing

This section covers every module you use to store files, create sales paperwork, and collect payments: **Documents**, **Quotations**, **Invoices**, **Document Templates**, **Document Settings (Numbering)**, and **Billing Profile (Company Info)**.

---

## 1. Documents

### Overview
The Documents module is your workspace's shared file library. It lets you upload contracts, proposals, images, and other files, organize them into folders, and link them to specific Leads or Companies so anyone on the deal can find the right paperwork without digging through email threads. Every lead and every company automatically gets its own virtual folder in Documents — you don't have to create these, they appear as soon as a file is linked to that lead/company.

### FAQ

**What file types can I upload?**
Any file up to 25 MB. When tagging a document you choose a type from: Contract, NDA, Proposal, Invoice, Presentation, Image, or Other. This is just a label for filtering — it doesn't restrict the actual file format.

**How do I organize files into folders?**
You can create your own folders (and nested sub-folders) from the Documents page using **New folder**. Separately, the system automatically maintains a **Leads** section and a **Companies** section in the sidebar — every lead/company that has at least one linked document shows up there automatically.

**How do I move a file into a folder?**
Three ways:
- Drag and drop a file card onto a folder in the sidebar or onto a folder tile in the main area.
- Select one or more files, click **Cut** (or press Ctrl+X), then click the destination folder to paste. Press Escape to cancel a cut.
- Select files and click **Move to…** to bulk-add them to a folder (this adds a folder link rather than moving them out of their current one).

**Can one file live in more than one folder, or be linked to more than one lead?**
Yes. A document can carry multiple folder links and multiple entity links (lead/company) at once — moving a file into a folder via drag-and-drop keeps its original lead/company links intact.

**How do I attach a document to a lead or deal?**
Upload directly while viewing that lead's Documents tab (the file is automatically linked to that lead), or use the document picker to attach an already-uploaded file from your library, a folder, or the "Unlinked" bucket to a lead.

**What happens to the file name I choose?**
The system automatically appends a timestamp (`_YYYYMMDD_HHmmss`) to the name you type, before the file extension, so re-uploading a file with the same name never overwrites or collides with an existing one.

**How do I preview a file without downloading it?**
Click any document card to open the preview dialog. Images support zoom in/out and reset; PDFs and other file types open in an embedded viewer. "Open original" opens the raw file in a new tab.

**Can I edit a document after uploading it?**
Yes — you can rename it and change its description at any time via **Edit**. You cannot replace the underlying file content from the edit form; upload a new file instead.

**What happens when I delete a document?**
A confirmation dialog appears. Once confirmed, the file is permanently removed — there is no undo, recycle bin, or restore for deleted documents.

**What happens when I delete a folder?**
Before deleting, LeadNest shows you how many files and sub-folders are inside so you know the scope of the deletion. Deleting a folder removes it (and its contents) — this cannot be undone.

**Can I search and filter documents?**
Yes — search by name/description, filter by type, group by file type or date added, and sort by name/date/size, both on the main Documents page and inside any lead's document tab.

**Who can view or manage documents?**
Viewing the Documents module requires the **Documents – View** permission. Uploading, editing, deleting, creating/deleting folders, moving files, and linking documents all require the **Documents – Edit** permission. Without edit permission you can browse and preview but not change anything.

### Step-by-step: Uploading a document to a deal/lead
1. Open the lead (or go to Documents → search for the lead in the "Leads" sidebar section).
2. Click **Upload**.
3. Choose the file — the name field auto-fills with the file name (minus extension).
4. Optionally add a description.
5. Click **Save**. The file is uploaded, a timestamp is appended to its stored name, and it's automatically linked to that lead.

### Tips & common mistakes
- If a file "isn't showing up" in a lead's folder, check whether it was uploaded from the **Documents** page without selecting that lead as the context first — it may have landed in "Unlinked" or a different folder instead.
- Cutting (Ctrl+X) a file and forgetting to paste it leaves it in a visibly "cut" (dimmed, dashed outline) state — press Escape or click a folder to resolve it.
- Deleting a folder deletes everything inside — always check the file/sub-folder count shown in the confirmation dialog first.

### Troubleshooting
**Why can't I delete a document?** You likely don't have the Documents – Edit permission, or the request failed after the confirmation — check for a toast error message describing the specific failure.

**Why did my file get renamed with extra numbers/letters?** That's expected — LeadNest appends a timestamp to the base name so uploads never silently overwrite one another.

---

## 2. Quotations

### Overview
A Quotation (also called a quote/estimate) is a formal, non-payable proposal of what you'll charge a client before work is agreed. Sales reps use it to price out a deal, send it to the client for review, and — once accepted — convert it directly into an Invoice for billing. It solves the problem of needing a paper trail between "we discussed pricing" and "we're now collecting money."

### FAQ

**What statuses can a quotation have?**
`draft`, `sent`, `viewed`, `accepted`, `rejected`, `expired`, `converted`. You can set the status manually while editing, except `converted` — that only happens automatically when you convert the quotation to an invoice.

**Do I need a Lead or a Deal to create a quotation?**
You need at least one of them. You can attach a quotation to a Deal (which auto-fills the associated lead) or pick a Lead directly without a deal.

**Can quotations be paid directly?**
No. Quotations never accept payments — the UI explicitly states "Quotations are never payable — convert to an invoice to collect payment."

**How are line items and totals calculated?**
For each line: `line subtotal = quantity × unit price`. A discount (either a flat amount or a percentage) is subtracted first, then tax is calculated on the discounted amount. The grand total is the sum of all line totals plus any shipping and adjustment amounts you enter. Each line supports quantity, unit price, discount %, and tax %, plus optional SKU, HSN/SAC code, and billing period/duration (surfaced depending on your template settings).

**How is the quotation number generated?**
It's built from your workspace's **Quotation numbering** settings (Document Settings page): a prefix, a next sequence number, and a format (e.g. `PREFIX/DDMMYYYY/SEQ`, `PREFIX-SEQ`, or `PREFIX/YYYY/SEQ`). Every time you save a new quotation, the sequence number increments automatically.

**Can I edit a quotation after it's been sent or accepted?**
Yes, as long as its status isn't `converted`. Once a quotation is converted to an invoice, it becomes fully locked — the UI shows "Converted to invoice — locked" and the server rejects any further edits with an "Cannot edit converted quotation" error.

**Can I convert a quotation to an invoice?**
Yes, via the **Convert** action on the Quotations list. This is blocked if:
- The quotation is already converted (error: "Quotation already converted").
- The quotation's status is `rejected` (error: "A rejected quotation cannot be converted to an invoice").

Converting copies all line items and totals into a brand-new Invoice (status `issued`), links the invoice back to the quotation, and marks the quotation `converted` (locked, non-editable).

**What happens if I delete a quotation that was already converted to an invoice?**
The quotation and its line items are removed, and the linked invoice is simply un-linked from it (its `quotationId` is cleared) — the invoice itself is **not** deleted.

**Can I choose a layout/theme for the quotation PDF?**
Yes — pick a layout preset, an accent color, and a header style (light/dark band) in the Appearance section; these carry through to the print/PDF view.

**Is there a "Draft" watermark on the PDF?**
Yes, quotations with status `draft` show a "Draft" watermark on the printed/PDF view automatically.

### Step-by-step: Creating your first quotation
1. Go to **Quotations → New quotation**.
2. Optionally pick a **Deal** — this auto-fills the client and currency. Otherwise, pick a client under **Bill to**.
3. The quotation number is shown as a live preview (based on your numbering settings) until you save.
4. Set **Issue date** and **Valid until** (expiry).
5. Add one or more **Line items** — description, quantity, rate, discount %, tax %.
6. Optionally set shipping/adjustment amounts, notes, and payment terms text.
7. Choose an appearance (accent color, header style, layout preset).
8. Click **Save quotation**. The system assigns the real quotation number and totals.
9. Use **Print / PDF** to open the printable version and save/print it.

### Step-by-step: Converting a quotation to an invoice
1. Open **Quotations**, find the quotation (status should not be `rejected` or already `converted`).
2. Click **Convert** in the row actions.
3. Confirm in the dialog — it warns that the quotation becomes locked and that payments happen on the invoice, not the quotation.
4. A new invoice is created (status `issued`) with the same line items, totals, client, and terms. You're navigated to the Invoices list.

### Tips & best practices
- Set the client/deal **before** adding line items — changing the client later re-snapshots the billing address but won't retroactively fix a mismatched deal/company pairing.
- Use **Reference** / **PO number** fields to track the client's own purchase order — this carries over automatically into the invoice on conversion.
- Review totals in the live preview panel before saving; tax and discount are computed per line, not on the overall total.

### Troubleshooting
**Why can't I edit a sent/accepted quotation?** You can — only `converted` quotations are locked. If you can't edit, check whether it shows "Converted to invoice — locked" at the top of the editor.

**Why did convert fail?** Most common reasons: the quotation was already converted, or its status is `rejected`. Both return a clear error toast.

**Why is my quotation number sequence "wrong" (e.g. skipped or duplicated)?** The sequence increments every time a quotation is *saved* (created), even in draft. If someone manually lowered the "next number" in Document Settings below an already-used value, duplicate numbers can occur — the settings page explicitly warns about this before you save.

---

## 3. Invoices

### Overview
An Invoice is the payable, billable document that requests money from a client — either created directly or generated automatically when a quotation is converted. Invoices track amounts paid, outstanding balance, and payment history, and they mirror payments onto the linked Deal so revenue reporting stays consistent across the CRM.

### FAQ

**What statuses can an invoice have?**
`draft`, `issued`, `partially_paid`, `paid`, `overdue`, `cancelled`, `refunded`.
- `draft` and `issued`/`cancelled` can be set manually while editing.
- `partially_paid` and `paid` are **derived automatically** from recorded payments — you cannot set them by hand (the server rejects that with "Paid and partially paid statuses are derived from recorded payments and cannot be set manually").
- `overdue`/`refunded` are also system/administratively driven, not freely selectable in the editor's status dropdown.

**Can a draft invoice accept payments?**
No. Only invoices with status `issued`, `partially_paid`, or `overdue` can accept payments. Trying to record a payment on a `draft` invoice returns: "Draft invoices cannot accept payments. Save the invoice as issued first." Payments on `cancelled`/`refunded` invoices are also blocked.

**How is the total calculated?**
Same line-level logic as quotations (quantity × rate, discount then tax per line), plus an optional **round-off** adjustment specific to invoices, plus shipping and adjustment. `grandTotal = sum(line totals) + shipping + adjustment + roundOff`.

**How do I record a payment?**
Open the invoice's payment history panel, enter an amount, date, payment mode (bank transfer, cash, cheque, UPI, card, crypto, other), and an optional reference (transaction ID / cheque number), then save.

**Can I overpay an invoice?**
No — the system blocks any payment that would exceed the remaining balance due, with an "OVERPAYMENT" error showing the exact balance still owed.

**What happens after I record a payment?**
The invoice's `amountPaid` updates, and its status is recalculated automatically: fully paid → `paid`; partially paid → `partially_paid`; if you later delete all payments, it falls back to `issued` (or stays `draft`/`cancelled`/`refunded` as appropriate).

**Does a payment on an invoice affect the Deal?**
Yes — if the invoice is linked to a Deal, every payment is automatically mirrored as a Deal Payment record (with a note like "Synced from invoice INV-…"), so the deal's revenue tracking stays accurate without double entry. Deleting the invoice payment also removes the mirrored deal payment.

**Can I delete a recorded payment?**
Yes, from the payment history panel. Deleting it recalculates `amountPaid` and the invoice status, and removes the synced Deal Payment.

**Can I edit an invoice's line items after it's partially paid?**
Yes, but the new grand total cannot drop below the amount already paid — the server blocks this with: "New total (…) is below the amount already paid (…). Remove payments first."

**How is the invoice number generated?**
Same numbering system as quotations (prefix + sequence + format), stored in your workspace's Billing Profile, *unless* the invoice uses a template with "Use template numbering" turned on — in that case the template's own prefix/next-number sequence is used instead, and that counter increments separately.

**What are the bank/payment details shown on the invoice PDF?**
They're taken from your company's Billing Profile bank fields (or overridden per-template), captured into the invoice at creation time. This "payment block snapshot" means later edits to your Billing Profile bank details won't silently rewrite already-issued invoices unless those specific snapshot fields are empty.

**Can I delete an invoice?**
Yes, with confirmation ("This cannot be undone"). Deleting an invoice also deletes its line items and payment records (and their mirrored deal payments). If the invoice originated from a quotation, that quotation is unlinked and its status reverts from `converted` back to `accepted` so it's editable again.

**Can I delete just one payment without deleting the invoice?**
Yes, from the payment history panel — see above.

### Step-by-step: Setting up invoice numbering
1. Go to **Documents → Document Settings** (numbering page).
2. Under **Invoice numbering**, set a **Prefix** (e.g. `INV`), a **Next number**, and a **Format** (`PREFIX/DDMMYYYY/SEQ`, `PREFIX-SEQ`, or `PREFIX/YYYY/SEQ`).
3. The live preview shows exactly what the next invoice number will look like.
4. If you lower the next number below its current value, a warning appears that this can cause duplicate invoice numbers — you can still save, but double-check first.
5. Click **Save numbering settings**.
6. Note: any invoice template with "Use template numbering" enabled overrides these workspace settings for invoices created from that specific template.

### Step-by-step: Printing/downloading a PDF invoice
1. Open the invoice (from Invoices list or right after saving).
2. Click **Print / PDF**.
3. The print-optimized page opens in a new tab, showing your company's billing/bank details, the client's billing address, all line items, totals, and payment history.
4. Click **Print / Save as PDF** and choose "Save as PDF" in your browser's print dialog.

### Tips & best practices
- Save the invoice as `issued` (not `draft`) before trying to record a payment — this is the single most common blocker.
- Use the **Deal balance card** while creating an invoice to see how much of the deal's total value has already been invoiced, so you don't over-invoice a deal.
- If you need to correct a mistake on a paid/partially-paid invoice's amounts, remove the excess payment(s) first, then edit line items.

### Troubleshooting
**Why can't I record a payment?** Check the invoice status. Draft invoices must be issued first; cancelled/refunded/paid invoices don't accept new payments either.

**Why won't my invoice total save?** If you're lowering the total below what's already been paid, the server blocks it — remove/adjust payments first.

**Why is the invoice number using a different prefix than my Document Settings?** The invoice was likely created from a template that has "Use template numbering" (autoNumbering) turned on — check Document Templates for that specific template.

**Why is my invoice showing as "Overdue" or "Paid" and I can't change it?** These statuses are either payment-derived (paid/partially paid) or system-managed — they cannot be set manually from the editor.

---

## 4. Document Templates (Sales Doc Templates)

### Overview
Templates let you pre-configure the look, defaults, and behavior of quotations and invoices so your team doesn't have to re-enter the same settings (currency, payment terms, layout, tax rules) every time. There are two independent template types — Quotation templates and Invoice templates — each with their own fields.

### FAQ

**What can I configure on a Quotation template?**
Name, code (unique per workspace), default currency, status (active/inactive/draft), layout preset, default payment terms, category, language, default tax type (GST/VAT/none), default validity (days), watermark (draft/approved/none), theme color/font, logo override, which columns show (SKU, HSN, discount, tax per line), default notes/terms blocks, and approval rules.

**What can I configure on an Invoice template?**
Name, code, default currency, layout preset, template type (GST/VAT/proforma/general), a numbering prefix and next-number counter, an **"Use template numbering"** (autoNumbering) toggle, theme style, and tax profile. It can also control whether bank details are shown on the PDF (`sectionSettings.showBankDetails`).

**Can I change a template's document type after creating it?**
No — `docType` (quotation vs. invoice) is locked once created; the server rejects attempts to change it.

**What happens if I use a duplicate template code?**
Creation/update fails with "Template code must be unique in workspace."

**If I delete a template, do existing quotations/invoices break?**
No — each quotation/invoice stores its own snapshot of the values it needs (numbers, totals, theme), so deleting a template afterward doesn't affect documents already created from it. New documents just can't reference the deleted template anymore.

**How do I create a quotation/invoice from a template?**
From the Document Templates gallery, use the template's "Create" action, which opens the New Quotation/New Invoice page pre-filled with that template's defaults (currency, terms, notes, layout, numbering behavior).

### Tips
- Use a `draft`/`inactive` status on templates you're still designing so they don't show up as selectable options for new documents until ready.
- If you want per-template invoice numbering independent of your workspace default, turn on "Use template numbering" and set its own prefix/next number.

---

## 5. Document Settings — Numbering

### Overview
This page controls how quotation and invoice numbers are generated workspace-wide: the prefix (e.g. `QT`, `INV`), the starting/next sequence number, and the number format.

### FAQ

**What formats are available?**
`PREFIX/DDMMYYYY/SEQ` (e.g. `INV/11052026/1001`), `PREFIX-SEQ` (e.g. `INV-1001`), `PREFIX/YYYY/SEQ` (e.g. `INV/2026/1001`).

**What happens if I leave the prefix blank?**
Saving is blocked: "Prefixes cannot be empty."

**What happens if I set an invalid next number?**
Saving is blocked unless it's a whole number of at least 1: "Next number must be a whole number of at least 1."

**What if I lower the next number below what's currently in use?**
It's allowed, but a warning is shown: "Lowering the next number below its current value (…) can produce duplicate document numbers. Allowed, but double-check before saving."

**Do these settings apply retroactively to already-created documents?**
No — the number is generated and locked in at the moment a quotation/invoice is created; changing settings only affects future documents.

**Does this page affect invoices created from templates with their own numbering?**
No — invoice templates with "Use template numbering" enabled override these workspace settings; that's called out directly on the page.

---

## 6. Billing Profile / Company Info

### Overview
This is your company's "letterhead" data — legal name, tax ID, address, logo, bank/payment details, and signature/stamp images — that appears on every quotation and invoice PDF. It's stored per workspace (`WorkspaceBillingProfile`), so different workspaces in the same company can have different billing identities if needed.

### FAQ

**What fields can I set?**
Legal name, logo URL, tax ID label/value, address (two lines, city, state, postal code, country), phone, email, website, bank name, account holder name, branch, MICR code, account type/number, IFSC, SWIFT, UPI ID, payment link URL, payment instructions text, and signature/stamp image URLs.

**Where does this information show up?**
On every quotation and invoice PDF/print view — company details in the header, bank/payment details in the payment section of invoices (unless a template hides bank details).

**If I update my bank details, does that change invoices that already exist?**
Not automatically. Each invoice captures a "payment block snapshot" of the billing profile's bank fields at creation/conversion time; the print view uses that snapshot first and only falls back to the live Billing Profile fields where the snapshot is empty.

**Is the Billing Profile created automatically?**
Yes — the first time it's requested (e.g. opening Document Settings or creating a quotation/invoice), the system auto-creates a default profile with `QT`/`INV` prefixes starting at sequence 1001 if one doesn't exist yet.

---

## 7. Permissions Summary

| Action | Required permission |
|---|---|
| View documents, folders, previews | Documents – View |
| Upload, edit, delete, move, link documents/folders | Documents – Edit |
| View quotations | manage.quotations – view |
| Create quotations | manage.quotations – create |
| Edit / convert quotations | manage.quotations – update |
| Delete quotations | manage.quotations – delete |
| View invoices | manage.invoices – view |
| Create invoices | manage.invoices – create |
| Edit invoices, record/delete payments | manage.invoices – update |
| Delete invoices | manage.invoices – delete |

If an action fails silently or a button seems missing, check with your admin whether your role has the corresponding permission above.

---

## 8. Glossary

- **Quotation** — A non-payable price proposal sent to a client before work/sale is confirmed.
- **Invoice** — A payable billing document requesting payment for goods/services, trackable through partial/full payment.
- **Line Item** — A single row on a quotation/invoice: description, quantity, unit price, discount %, tax %.
- **Grand Total** — The final amount due after subtotal, discounts, tax, shipping, adjustment (and round-off for invoices).
- **Billing Profile** — Your company's stored identity (legal name, address, tax ID, bank details) used to generate quotation/invoice PDFs.
- **Document Folder** — A user-created (or auto-generated, for Leads/Companies) container used to organize files in the Documents module.
- **Document Template** — A reusable preset of defaults (currency, terms, layout, numbering behavior) for creating new quotations or invoices.
- **Numbering Format** — The pattern (prefix + date/year + sequence) used to generate quotation/invoice numbers.
- **Converted (quotation status)** — Terminal, locked state a quotation enters once it's been turned into an invoice.
- **Payment-derived status** — An invoice status (`paid`, `partially_paid`) computed automatically from recorded payments, not settable by hand.
- **Balance Due** — Grand total minus amount already paid on an invoice.
- **Deal Balance Card** — A widget shown while creating a quotation/invoice that shows how much of the linked deal's value has already been invoiced, and how much remains.
