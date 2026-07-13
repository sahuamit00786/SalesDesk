# Getting Started: Account, Workspaces & Team

## 1. Getting Started / First Login

### Module overview
This is how you get into LeadNest for the first time: creating an account, confirming your email address, and signing in. Every account belongs to one **company** (your organization) and, inside that company, one or more **workspaces** (teams or business units). The very first person to register for a company automatically becomes that company's **Company Admin** — everyone invited afterward joins as a regular team member with a role you assign.

### FAQ

**Q: How do I create an account?**
Go to the Register page, enter your full name, your company name, your work email, and a password (confirmed twice). Submitting creates your company and sends a 6-digit verification code to your email — you are not logged in yet at this point.

**Q: What are the password rules?**
The Register and Reset Password screens show a live checklist as you type your password, and the same rules are enforced by the invite-acceptance flow (minimum 10 characters is enforced there specifically). Follow the on-screen checklist — it turns green rule-by-rule as you meet each requirement.

**Q: I registered — why can't I log in yet?**
New accounts must verify their email first. If you try to log in before verifying, the app shows "Verify your email to continue" and sends you back to the registration screen's verification step automatically.

**Q: How does email verification work?**
After registering, you're on the "Verify your email" step. Enter the 6-digit code sent to your inbox. Codes are single-use and expire after a period — if yours expired, use "Resend code" (there is a short cooldown between resend requests, so wait a minute if you're told to). Once verified, you are automatically signed in.

**Q: I didn't get the code / resend isn't working. Why?**
Resend requests are rate-limited to prevent spam — you can only request a new code once every 60 seconds. If you request one too soon you'll see a "too many requests" message; just wait a moment and try again. Also check your spam folder — the email comes from the company's configured mail sender.

**Q: What happens if I try to register again with the same company name or email?**
If the email is already fully verified, registration is blocked with "Email already registered" — sign in instead. If you started registering before but never verified, registering again with the same email simply re-issues a new verification code for that same pending account (your company name and password can be updated at that point).

**Q: What does "Forgot password" do?**
Enter your email; if an account exists for it, you'll receive a 6-digit reset code by email. For privacy, the app always shows the same "if an account exists, a code was sent" message whether or not the email is registered — this way nobody can use the forgot-password form to check who has an account. Enter the code plus a new password (with confirmation) to finish. Codes expire after a short window, so complete the reset promptly.

**Q: Does resetting my password log me out of other devices?**
Yes. Resetting your password invalidates all previously issued long-lived sessions (refresh tokens), so you'll need to sign in fresh anywhere you were logged in.

**Q: Is two-factor authentication (2FA) available?**
Yes. From your account settings you can enable 2FA using an authenticator app (Google Authenticator, Authy, 1Password, etc.). Setup shows a QR code (and a manual key you can copy) — scan it, then enter the 6-digit code it generates to confirm and turn 2FA on. Once enabled, every login will prompt for a 6-digit authenticator code after your password.

**Q: What if my login has no menu access after signing in?**
If your account has zero menu permissions assigned, the app blocks sign-in with "Your account has no menu permissions. Please contact your administrator for access." Ask your Company Admin to grant you access to at least one menu (see the Permissions section below).

**Q: My account was deactivated — what happens if I try to log in?**
You'll see "Your account has been deactivated. Contact your workspace admin." Only a Company Admin can reactivate you.

### Step-by-step: Creating your account and signing in
1. Open the Register page and fill in your name, company name, work email, and password (with confirmation).
2. Submit — you'll land on the "Verify your email" step.
3. Check your inbox for the 6-digit code and enter it (use "Resend code" if needed, after waiting a minute).
4. On success, you're automatically signed in and redirected — Company Admins go to onboarding; everyone else goes straight to the dashboard.

### Step-by-step: Resetting your password
1. On the Login page, click "Forgot password?"
2. Enter your work email and submit — you'll always be told a code was sent (whether or not the email exists, for privacy).
3. Enter the 6-digit code from your inbox, plus your new password (twice, to confirm).
4. Submit — your password is updated and all your existing sessions are ended, so sign in again with the new password.

### Tips & common mistakes
- Use a real work email you check regularly — verification and password resets both depend on it.
- Don't share your password reset code — anyone with it (and access to reset the password) can take over the account within its short validity window.
- If invitations or verification emails aren't arriving, check spam and confirm with your admin that the company's email sending is configured correctly.

### Troubleshooting
- **"Invalid credentials"** — your email/password combination doesn't match any account; double-check for typos, or use Forgot Password.
- **"Verify your email before signing in"** — you registered but never completed the OTP step; go back to Register with `?verify=1` (the app does this automatically) and enter the code.
- **"Your account has been deactivated"** — an admin turned off your access; contact them, only they can turn it back on.
- **"Your account has no menu permissions"** — you're a legitimate user but haven't been granted access to any part of the app yet; contact your admin to set up your permissions (see below).

---

## 2. Workspaces

### Module overview
A **Workspace** is a division inside your company — for example, separate business units, regions, or teams that each want their own leads, deals, and pipeline data kept apart, while still belonging to the same overall company and billing account. Most companies start with one default workspace; larger companies create several. You always work "inside" one active workspace at a time, and can switch between the ones you have access to using the Workspace Switcher in the top bar. Every request your browser sends to the server includes which workspace you're currently in, so records stay scoped to the right team.

### FAQ

**Q: What's the difference between a Company and a Workspace?**
Your **Company** is your whole organization — one company holds one billing profile, one set of roles, and all your team members. A **Workspace** is a sub-division within that company (e.g., "Enterprise Accounts," "SMB Sales," "Marketing Team"). Leads, deals, and teams can be scoped to a specific workspace so different teams don't see each other's day-to-day records, while admins can still manage the whole company from one place.

**Q: How do I switch workspaces?**
Click the workspace name/building icon in the top bar. A dropdown lists every workspace you belong to; click one to switch into it. Your last choice is remembered for next time you log in.

**Q: Why don't I see a workspace I expect to see?**
You only see workspaces you have been explicitly added to (unless you're a Company Admin, who can see and manage all of them). Archived workspaces are hidden from the switcher entirely. If a workspace is missing, ask your admin to add you to it from Team → member access.

**Q: How do I create a new workspace?**
Go to Workspace settings → Workspaces tab → "Add workspace." Give it a name (required), an optional description (up to ~200 characters), a default currency, and optionally customize its theme color and sidebar text color for visual distinction. Only Company Admins can create/edit/delete workspaces.

**Q: Can I delete a workspace?**
Yes, from the same Workspaces list — but this cannot be undone, so most companies prefer to **archive** a workspace instead (toggle "Archive"), which hides it from active use without permanently deleting its data.

**Q: What is the workspace theme color for?**
Each workspace can have its own accent color and sidebar text color, so your team can visually tell at a glance which workspace they're currently in — handy when switching frequently between several.

**Q: What is workspace currency?**
Each workspace has a default currency used for deals, leads, and reports created inside it. If a workspace has no currency set, the company's overall base currency (set on the Company Information page) is used instead.

**Q: I created a workspace but new team members don't automatically see it — why?**
Membership is per-user. Creating a workspace doesn't add existing team members to it. Go to Team → open a member's access drawer, and toggle the new workspace on for anyone who should have access to it.

### Step-by-step: Creating your first workspace
1. Go to **Workspace settings** (left nav, under Settings).
2. Make sure you're on the **Workspaces** tab.
3. Click **Add workspace**.
4. Enter a name (required) and, optionally, a description, a default currency, and theme colors.
5. Click **Create workspace**. It appears in your list and in the workspace switcher immediately (for users who are members of it).
6. Go to **Team** to add members to the new workspace via each member's access drawer.

### Tips & best practices
- Keep workspace names short and clear (e.g., "APAC Sales" rather than long descriptive text) — the switcher truncates long names.
- Archive workspaces you no longer use rather than deleting them, in case you need the historical data later.
- Set a distinct theme color per workspace if your teams frequently switch between them — it prevents accidentally acting in the wrong one.

### Troubleshooting
- **"No workspaces linked yet"** in the switcher — your account has not been added to any workspace; contact your Company Admin.
- **Workspace disappeared** — it was likely archived; check the "Archived" filter on the Workspaces tab, or ask an admin to restore it.
- **Data doesn't match what a colleague sees** — you're probably in different workspaces; check the workspace switcher and confirm you're both looking at the same one.

---

## 3. Team & Roles / Permissions

### Module overview
This is where a Company Admin manages **who** has access to the CRM and **what** each person can do once inside. It covers three linked concepts: **Members** (the people in your company), **Roles** (a label describing someone's job function, like "Sales" or "Manager" — used mainly for filtering/reporting), and **Menu Permissions** (the actual, fine-grained control over which pages a specific person can view, create in, edit, or delete from). This module answers the classic business question: "Sarah just joined — how do I get her into the CRM with the right access, and how do I make sure she can't accidentally delete things she shouldn't touch?"

### FAQ

**Q: How is a "Role" different from "Permissions"?**
A **Role** (e.g., Manager, Sales, Telecaller, Marketing, Finance, HR, Auditor, Support, Workspace Admin) is just a label — it's used for reporting, filtering the team list, and general classification of what someone's job is. It does **not** by itself control what a person can see or do in the app. **Menu permissions** are the real access control — they are set **per individual person**, not per role. So two people can have the same role ("Sales") but very different actual access, if their menu permissions differ.

**Q: What roles are available?**
The built-in role types are: Workspace admin, Manager, Sales, Telecaller, Campaign manager, Marketing, Finance, HR, Auditor, and Support (plus a legacy "Custom" type). Every company gets one role per type automatically created; you can rename them, add a description, or delete a non-default (custom) one.

**Q: What does "Company Admin" mean, and how do you become one?**
Whoever is the very first person to register for a company automatically becomes its Company Admin. Company Admins have unrestricted access to every page and action — the system treats them as having every permission ("wildcard admin"), bypassing the per-menu permission checks entirely. A company admin's role can't be changed or removed through the normal role-editing screens — it's a fixed, permanent designation.

**Q: How do menu permissions actually work?**
Every page/menu in the app (Leads, Deals, Team, Reports, etc.) has four possible access levels you can grant to a person, individually, per menu:
- **View** — can see and open the page/list.
- **Create** — can add new records there (this also implies View — you can't create something you're not allowed to see).
- **Edit/Update** — can modify existing records there (also implies View).
- **Delete** — can remove records there (also implies View).

Granting Create, Edit, or Delete automatically includes View, but the reverse is not true, and these three don't imply each other — someone with only "Create" rights on Leads cannot edit or delete leads, only add new ones.

**Q: Where do I set someone's menu permissions?**
Go to Team → find the member → click the lock icon ("Manage menu permissions") or open their profile page. You'll see every visible menu grouped by section (Main, Engage, Manage, Automate, Insights, Settings), each with a "Select all" toggle plus individual View / Create / Edit / Delete checkboxes. Save to apply.

**Q: Who can change someone else's menu permissions?**
Only Company Admins. Even a custom role that has "Team admin" style access cannot grant itself or others unlimited permissions — this specific action is hard-locked to Company Admins only, as a safeguard against privilege escalation.

**Q: How do I invite a new team member?**
Go to Team → Members tab → "Add user." Fill in their name (optional but recommended), email (required), role, and optionally job title, phone/WhatsApp numbers, address, and profile photo. Choose which workspace(s) they'll join (defaults to whichever workspace is currently active in your sidebar). Click "Send invitation." They receive an email with a secure link.

**Q: What happens when someone accepts an invite?**
They open the invite link, see a preview of your company name, assigned role, and workspaces, then set their name (if not already provided by you) and choose a password. On submit, their account is created (or, if they already had an unverified account with that email, it's activated), they're automatically added to the workspace(s) you selected, and they're signed straight in.

**Q: How long does an invitation stay valid?**
48 hours from when it was sent. After that, the link stops working and you'll need to send a new invitation (creating a new invite for the same email automatically replaces any older pending one).

**Q: Can I cancel a sent invitation?**
Yes — from Team → Invitations tab, click the cancel (X) icon next to the pending invite.

**Q: I invited someone whose email is already registered in our company. What happens?**
If that email already belongs to a verified user in your company, no new invite is created — instead, they're immediately added to the workspace(s) you selected (and their role is updated if you picked a different one), and you're told "User already exists — added to selected workspace(s)."

**Q: How do I edit an existing team member's role, workspaces, or profile?**
Team → Members tab → click the pencil icon on their row ("Edit member access"). This opens a drawer where you can change their name, contact details, address, profile photo, role, and which workspaces they belong to, all in one place — the same fields as the invite form.

**Q: Can I change my own role?**
No — you cannot change your own role through the role-assignment screen; you'll get "Ask another admin to change your role." This prevents someone from silently promoting themselves.

**Q: How do I deactivate someone (e.g., they left the company)?**
Team → Members tab → click the "Deactivate user" icon. You'll be asked to confirm. You can optionally reassign their owned leads to another active team member as part of deactivation. Deactivated users cannot log in until reactivated. You cannot deactivate yourself, and Company Admin accounts are managed separately (they can't be deactivated from this screen).

**Q: How do I bring a deactivated person back?**
Click the "Reactivate" icon on their row — this restores their ability to log in immediately.

**Q: What is a "Team" (as distinct from a workspace or a role)?**
Teams are smaller working groups within a specific workspace — a way to group a handful of people together (e.g., "North Region Callers") for organizational purposes, separate from roles or workspace membership. You create/manage these under Team → Teams (add members individually to a named team).

**Q: Can I create a custom role?**
Yes. Team → Roles tab → create with a name, description, and a role "type" (chosen from the fixed list above, since role type drives some reporting classifications). Note again: creating a role only creates a label — you still need to separately grant menu permissions to each person who has that role.

**Q: What happens to users if I delete a role that's in use?**
You must first choose a "fallback role" to reassign all affected users to — the system blocks deletion until you do. Default (system-seeded) roles can never be deleted.

### Permissions — full explanation
LeadNest's access model has three layers, and it helps to think of them separately:

1. **Company Admin flag** — a single yes/no flag on a user. If set, that person can do absolutely everything, everywhere, and this cannot be edited via the role or permission screens (it's fixed to whoever created the company, or promoted through other means outside these screens).
2. **Role (label)** — describes what kind of job the person does (Sales, Finance, HR, etc.). Useful for filtering the team list and for some reports, but grants **no actual access by itself**.
3. **Per-person menu permissions** — the real access control. For every page in the CRM, an admin can grant that specific person View, Create, Edit, and/or Delete rights, independently of their role. If a user has no permissions at all recorded for a page, they simply cannot see it — it won't even appear in their sidebar navigation, and trying to open its URL directly will be blocked.

Because permissions are per-person rather than per-role, changing someone's role does **not** automatically change what they can access — you must also update their menu permissions if their new job requires different access.

### Step-by-step: Inviting a team member
1. Go to **Team** → **Members** tab → click **Add user**.
2. Fill in their email (required) and, ideally, name, job title, and contact details.
3. Select their role from the dropdown.
4. Confirm the workspace(s) they should join (pre-filled from your currently active workspace).
5. Click **Send invitation**. They'll receive an email valid for 48 hours.
6. Once they accept, go back to **Team** and set up their specific menu permissions via the lock icon on their row (invites don't automatically grant page access — that's a separate, deliberate step for security).

### Step-by-step: Setting up a custom role
1. Go to **Team** → **Roles** tab → click to add a new role (via the role management UI).
2. Give it a clear name and description, and pick the closest matching role "type" from the fixed list (this affects reporting classification only).
3. Save.
4. Assign this role to specific members from their access drawer (Team → Members → pencil icon).
5. Separately, open each assigned member's menu permissions (lock icon) and grant exactly the pages/actions their job needs — don't assume the role name implies any access.

### Tips & best practices, and common mistakes
- **Don't over-grant Delete permissions.** Delete is destructive and often unnecessary for day-to-day work — most team members only need View, and some need Create/Edit. Reserve Delete for a small number of trusted people.
- **Common mistake: assuming a role grants permissions.** Renaming someone's role to "Manager" does nothing to their actual page access — you must still configure their menu permissions.
- **Don't make everyone a Company Admin "to be safe."** Company Admin bypasses every permission check entirely and can't be limited — use it only for the people who truly need full, unrestricted access. Prefer granular menu permissions for everyone else.
- **Review permissions when people change roles** (e.g., promoted from Sales to Manager) — the system won't do this automatically.
- **Use deactivation, not deletion, for departing employees** so their historical activity, leads, and records are preserved and their leads can be reassigned cleanly.
- **Keep invitations tidy** — cancel invites you no longer need rather than letting them expire silently, especially if the email was mistyped.

### Troubleshooting
- **"You do not have permission for this action"** — the logged-in user's menu permissions don't include the required action (view/create/update/delete) for that page. An admin needs to grant it via Team → member → menu permissions.
- **"Only company admin can perform this action"** — certain actions (creating/editing/deleting roles, granting menu permissions, changing company settings) are hard-restricted to Company Admins regardless of any custom permission grants.
- **A page is completely missing from the sidebar** — the user has no View permission on that menu; it won't render in navigation and direct URL access is blocked too.
- **"Ask another admin to change your role"** — you're trying to change your own role; have a different admin do it.
- **Can't delete a role** — it's either a default system role (never deletable) or still assigned to users (pick a fallback role first).
- **Invited user says the link doesn't work** — invitations expire after 48 hours, or a newer invite may have replaced the old one; send a fresh invite.
- **"This email belongs to another organization"** — the invited email is already tied to a different company's account in the system; they'll need a different email or must leave their previous company first.

---

## 4. Company Settings

### Module overview
Company Settings hold the information that identifies your business on official documents (quotations, invoices) and controls company-wide defaults — legal name, tax ID, address, logo, bank details, base currency, and notification preferences. Most of this is only editable by a Company Admin.

### FAQ

**Q: Where do I update my company's legal name, address, and logo?**
Go to **Workspace settings** → **Company information** tab. This covers legal/company name, contact email and phone, website, registered address, logo, and tax registration details.

**Q: Does LeadNest support GSTIN (Indian tax ID)?**
Yes — the Tax ID field lets you choose from GSTIN (India), VAT ID, EIN (US), ABN (Australia), Company registration no., PAN (India), or a fully custom label, then enter the corresponding number. GSTIN input is auto-formatted to uppercase alphanumeric, capped at 15 characters; PAN is capped at 10 characters with a hint about its format.

**Q: What are the bank and payment fields for?**
Under Company information → "Bank & documents" tab, you can add your bank name, branch, account holder name, account type, account number, IFSC code, MICR code, SWIFT/BIC (for international wires), UPI ID, a payment/collection link, and free-text payment instructions, plus signature and company stamp images. These details are printed automatically on your quotations and invoices.

**Q: How does the company logo get used?**
Upload it (or paste a URL) on the Company information tab — it appears in the app's company info panel, and on generated quotation/invoice PDFs.

**Q: What is "base currency" and how is it different from workspace currency?**
Base currency is the company-wide default currency, used whenever a specific workspace doesn't have its own default currency set. Set it on the Company information tab; each workspace can still override it individually.

**Q: Who can edit company settings?**
Only Company Admins. Regular members attempting to save changes here are blocked with "Only company admins can update company settings."

**Q: What are Email Notification settings?**
Under Workspace settings → Email notifications tab, admins can turn on/off (and choose Email vs. In-app delivery for) specific event types: lead assigned, campaign leads added, task assigned, and a daily digest of tasks due today (with a configurable send hour/minute and timezone label). There's also a company-wide "quiet hours" window that delays outbound notification emails until it ends. Non-admins can view current settings (to understand what they'll receive) but cannot change them.

**Q: What's the "Delivery history" panel for?**
It's an admin-only audit log of every notification email/in-app alert the system queued, showing when it was sent, to whom, its subject, channel, and delivery status (queued/sent/skipped/failed) — useful for confirming a teammate actually received (or didn't receive) an assignment notice.

### Step-by-step: Updating company information
1. Go to **Workspace settings** → **Company information** tab.
2. On "Company & address," fill in legal name, email, phone, website, and base currency.
3. Fill in the registered address fields (used on invoice/quotation headers).
4. Upload your logo (drag a file in, or paste an image URL) and set your Tax ID type + number.
5. Switch to the "Bank & documents" tab to add bank details, UPI/payment links, and optionally a signature/stamp image.
6. Click **Save changes** (only enabled once you've actually changed something).

### Tips & best practices
- Keep your legal name and tax ID accurate and up to date — they print directly on invoices and quotations sent to customers.
- Upload signature and stamp images once, company-wide, so every generated document looks consistent and professional.
- Use quiet hours if your team spans time zones, so notification emails don't wake people up outside working hours.

### Troubleshooting
- **"Only company admins can update company settings"** — you're not a Company Admin; ask one to make the change or grant you that status.
- **Save button stays disabled** — nothing has actually changed yet (the form only allows saving once a field differs from the last saved values).
- **Notification settings look read-only** — you're not a Company Admin; you can view but not edit them.

---

## 5. Integrations & API

### Module overview
This is where LeadNest connects to outside tools your company already uses. Today the built-in integration is **Google** (Gmail + Calendar), used for sending/reading email inside the CRM, syncing lead conversations, and creating Google Meet links for meetings. A placeholder exists for enterprise SSO (Google/SAML) but isn't active yet.

### FAQ

**Q: What does connecting Google actually do?**
It links one Google account to your CRM login so you can: send and receive email without leaving the CRM (a full inbox view tied to leads), automatically sync email threads with the right lead, and create Google Meet links/calendar events for scheduled meetings.

**Q: How do I connect my Google account?**
Go to **Integrations & API** in the sidebar and click **Continue with Google**. This opens Google's standard permission screen; approve the requested access, and you'll be redirected back with a "Google account connected successfully" confirmation.

**Q: Why does it say "Inbox read access missing" even though I connected Google?**
Your saved Google connection doesn't include permission to read your Gmail inbox (only to send). Click **Reconnect Google** and make sure you approve every permission requested this time — otherwise the in-app email inbox and unread badge can't load.

**Q: Why does it say "Calendar access missing"?**
Meeting links (Google Meet) require Calendar access specifically. If it's missing, click **Reconnect Google** and approve all permissions, including Calendar.

**Q: How up-to-date is my inbox inside the CRM?**
If your server is configured with Gmail's real-time push notifications (Pub/Sub), updates arrive near-instantly. Otherwise, the CRM relies on periodic syncing, so there may be a short delay before new emails show up.

**Q: Is there an API for custom integrations?**
This page is titled "Integrations & API," reflecting that it's the intended home for API-based connections, though the currently available integration is the Google connector described above; ask your administrator about additional integrations planned for your account.

**Q: Is SSO (Single Sign-On) available?**
Not yet for self-serve setup — the system currently returns "Google / SAML SSO is available for enterprise workspaces. Contact sales to enable it" if this feature is requested. Reach out to your account contact if your company needs enterprise SSO.

### Step-by-step: Connecting Google Calendar / Email
1. Go to **Integrations & API** from the sidebar.
2. Click **Continue with Google** (or **Reconnect Google** if you've connected before but are missing permissions).
3. On Google's consent screen, review and approve **all** requested permissions — don't skip any, since partial approval leads to the "Inbox read access missing" or "Calendar access missing" warnings.
4. You'll be redirected back to the Integrations page with a confirmation banner and updated connection status.

### Tips & best practices
- Always approve every permission Google asks for during connect/reconnect — partially granting access silently breaks specific features (inbox reading, Meet links) without an obvious error at connection time.
- Only one Google account can be connected per user — if you need to switch accounts, use "Reconnect Google" and sign in with the new one.
- If your company relies on instant email sync, ask your technical admin whether Gmail Pub/Sub push has been configured on the server — otherwise inbox updates rely on periodic polling.

### Troubleshooting
- **"Not connected" status persists after clicking connect** — the OAuth flow may have been cancelled or denied; try again and make sure to click "Allow" on every Google permission screen.
- **Inbox / unread badge never loads** — reconnect and confirm Gmail read access was granted, not just send access.
- **Meeting Meet links aren't generated** — reconnect and confirm Calendar access was granted.
- **SSO doesn't work** — it's not enabled by default; contact your sales/account contact to enable it for your organization.

---

## 6. Onboarding

### Module overview
Onboarding is a short guided setup wizard shown only to the Company Admin, right after their account is created (and only until it's completed). It gathers basic company profile information LeadNest needs to tailor the experience — industry, country, team size, monthly lead volume, and current tooling/goals — then provisions your primary workspace and default roles behind the scenes.

### FAQ

**Q: Who sees the onboarding wizard?**
Only the Company Admin of a company that hasn't finished onboarding yet. Regular team members never see it — if they're not an admin, or if onboarding is already complete, visiting the onboarding page redirects straight to the dashboard.

**Q: What information does onboarding collect?**
Four steps: (1) Company basics — name, industry, country, whether to add your website now or later, and base currency; (2) Scale — your team size and how many leads you handle monthly; (3) Goals & tools — what problems you're trying to solve and what tools you currently use; (4) Activation — a final review/confirm screen before the system finishes setting things up.

**Q: What happens if I close the browser mid-onboarding?**
Your progress is saved locally in your browser as you go (per company), so reopening onboarding later resumes where you left off, including which step you'd reached.

**Q: What does "Complete setup" actually do?**
It provisions your company's primary workspace and default roles on the server (showing a short progress overlay while this happens), then marks your company's onboarding as completed. After that, you're taken to your dashboard (or wherever you were trying to go before being redirected into onboarding).

**Q: Can I skip onboarding?**
No — each step is required before you can continue (e.g., you must select an industry, a country, and a base currency on step 1; team size and monthly lead volume on step 2; at least one goal on step 3). However, some fields like your website URL can explicitly be deferred ("add later").

**Q: Can I revisit earlier steps?**
Yes, you can navigate back to any step you've already reached (but not skip ahead past steps you haven't completed yet) using the step indicator or the Back button.

### Step-by-step: Completing onboarding
1. **Company basics** — enter your company name, pick an industry (or describe it if "Other"), select your country, optionally add your website now or defer it, and confirm your base currency.
2. **Scale** — select your team size range and your typical monthly lead volume.
3. **Goals & tools** — choose the goals you want the CRM to help with, and note any tools you currently use.
4. **Activate** — review, then click **Complete setup**. Wait for the short provisioning animation to finish — this creates your default workspace and roles.
5. You're redirected to your dashboard, ready to invite your team (see the Team & Roles section above).

### Tips & best practices
- Fill in accurate company details during onboarding — several of these fields (industry, currency, country) feed directly into defaults used elsewhere in the CRM (e.g., your company's base currency).
- If you're not ready to add your website, use the "add later" option rather than leaving the field in a half-filled state.
- Complete onboarding promptly — until it's finished, your account keeps getting redirected to the wizard instead of the dashboard.

### Troubleshooting
- **Getting redirected back to onboarding every time I try to reach the dashboard** — your company's onboarding hasn't been marked complete yet; finish all four steps and click "Complete setup."
- **A non-admin teammate says they see the onboarding wizard** — they shouldn't; if this happens, it likely means their account was miscategorized as a Company Admin — check Team → Members for their actual admin flag.
- **My previously entered onboarding answers disappeared** — the draft is stored per-browser/per-company in local storage; if you cleared browser data or switched browsers/devices, you'll need to re-enter that step's answers (already-saved steps sent to the server, like company name/industry, are preserved either way once you'd clicked Continue on that step).

---

## Glossary

| Term | Plain-language meaning |
|---|---|
| **Company** | Your whole organization's account in LeadNest. Holds your billing profile, roles, and every team member. |
| **Workspace** | A team or business-unit division inside your company (e.g., "APAC Sales"). You belong to one or more; you work "inside" one at a time via the workspace switcher. |
| **Company Admin** | The special, unrestricted-access status held by whoever created the company (or was promoted). Can do anything, anywhere — bypasses all fine-grained permission checks. |
| **Role** | A label describing someone's job function (Sales, Manager, Finance, etc.). Used for filtering/reporting — does **not** by itself grant any access. |
| **Menu Permission** | The actual access control — set per individual person, per page, with four levels: View, Create, Edit, Delete. This is what really determines what someone can do. |
| **Invitation** | An emailed link that lets someone join your company. Valid for 48 hours; includes their assigned role and workspace(s) ahead of time. |
| **Access Token** | A short-lived pass (about 15 minutes) your browser uses to prove you're logged in on every request. |
| **Refresh Token** | A longer-lived pass (about 7 days) used behind the scenes to silently get you a new access token when the short one expires — this is what "keeps you logged in" without asking for your password again every 15 minutes. When it finally expires (or you reset your password/log out), you're asked to sign in again. |
| **OTP (One-Time Password)** | The 6-digit code sent to your email for verifying your address or resetting your password. Expires after a short window. |
| **Team (within Team & Roles)** | A smaller named group of people inside a specific workspace, used for organizing members — separate from Roles or Workspace membership. |
| **Base Currency** | The company-wide default currency, used wherever a workspace hasn't set its own. |
| **Onboarding** | The one-time guided setup wizard a new Company Admin completes to describe their company before reaching the main dashboard. |
