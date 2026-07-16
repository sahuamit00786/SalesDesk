# Email plan — single source of truth (Phase 2)

Where every email is sent, to whom, when, and where in the code it hooks. This
is the authoritative reference; `docs/notifications.md` in the runbook points here.

All emails flow through ONE pipeline:
`notify* helper → enqueueTeamNotification → BullMQ → createNotification (in-app + socket) + email`,
gated by `RoleNotificationPreference` / `UserNotificationPreference`, logged to
`NotificationDeliveryLog`. So "email" and "notification" are never divergent —
they're two channels of the same event.

Legend: ✅ already sending · 🆕 added in Phase 1/2 · ⏳ scheduled job

---

## Transactional (immediate) — fire from the domain write path

| Email | Recipient | Timing | Hook (file → handler) | Status |
|---|---|---|---|---|
| Welcome | new user | immediate | authController (register/verify) | ✅ |
| Email verification | new user | immediate | authController | ✅ |
| Password reset link | user | immediate | authController.forgotPassword | ✅ |
| Invitation | invitee | immediate | teamController / invitations | ✅ |
| Lead assigned | assignee | immediate (singles debounced 3s) | leadsController + assignmentRulesService → notifyLeadAssigned | ✅ |
| Lead reassigned (old owner) | previous assignee | immediate | leadsController update path → notifyLeadReassignedAway | 🆕 P1 |
| Lead status changed | owner + assignee (not actor) | immediate | leadsController.patchStatus → notifyLeadStatusChanged | 🆕 P1 |
| Opportunity created/stage | owner + assignee | immediate | opportunitiesController → notifyOpportunityStageChanged | 🆕 P1 |
| Deal created/stage | deal assignee/owner | immediate | dealsController.create/patchStage → notifyDealStageChanged | 🆕 P1 |
| Note added | lead owner/assignee (not author) | immediate | leadsController.createNote → notifyLeadNoteAdded | 🆕 P1 |
| Task assigned | assignee | immediate | leadsController → notifyTaskAssigned | ✅ |
| Task comment added | task assignee + creator (not author) | immediate | task-comment handler → notifyTaskCommentAdded | 🆕 P1 |
| Campaign leads added | campaign team | immediate | campaignsController → notifyCampaignLeadsAdded | ✅ |
| Meeting invitation | participants | immediate | meetingNotificationService.notifyMeetingParticipants | ✅ |
| Lead email reply | lead owner | immediate | gmailPushService → notifyLeadEmailReply | ✅ |
| Invoice created | admins + creator | immediate | invoicesController → notifyInvoicePayment(kind:'created') | 🆕 P1 |
| Invoice payment received | admins + creator | immediate | dealPaymentsController → notifyInvoicePayment(kind:'payment') | 🆕 P1 |
| Document shared | share target | immediate | documentsController.createDocumentShareLink → notifyDocumentShared | 🆕 P1 |
| Leave requested | approver | immediate | leaveController | ✅ |
| Leave decided | requester | immediate | leaveController → add notify beside existing in-app | 🆕 P2 |
| Security: password changed | affected user | immediate (mandatory) | authController.resetPassword → notifySecurityChange('password') | 🆕 P1 |
| Security: email changed | affected user | immediate (mandatory) | email-change handler → notifySecurityChange('email') | 🆕 P1 |

## Time-based reminders

| Email | Recipient | Timing | Hook | Status |
|---|---|---|---|---|
| Meeting reminder | participants | T-5 min (T-10 default in copy) | reminderJob → notifyMeetingReminderInternal | ✅ |
| Follow-up due | follow-up owner | at due time | reminderJob → notifyFollowupDue | ✅ |
| Call reminder | activity owner | T-15 min | reminderJob PASS A → CALL_REMINDER | 🆕 P2 ⏳ |

## Scheduled digests

| Email | Recipient | Timing | Hook | Status |
|---|---|---|---|---|
| Daily digest (meetings + tasks + follow-ups, ONE email) | every user with items | daily @ company digest hour (08:00) | dailyDigestJob.runDailyDigests | 🆕 P2 ⏳ |
| Missed follow-up escalation | rep's manager | daily 18:00, >24h overdue | reminderJob PASS B | 🆕 P2 ⏳ |
| Weekly team summary | managers + workspace admins | Mon 08:30 | periodicDigestJob (weekly) | 🆕 P2 ⏳ |
| Monthly analytics summary | company admins | 1st @ 09:00 | periodicDigestJob (monthly) | 🆕 P2 ⏳ |

---

## Timing policy (put a copy in docs/notifications.md)

- **Immediate:** assignment, security, invitation, meeting invite, document share,
  payment received, leave decision, status/stage/note/comment.
- **T-5 min:** meeting reminder · **T-15 min:** call reminder.
- **Daily 08:00:** ONE combined digest — never three separate morning emails.
- **Daily 18:00:** manager escalation, only when something is actually overdue.
- **Weekly Mon 08:30:** manager/team summary · **Monthly 1st 09:00:** admin analytics.

## Fatigue controls (the difference between "engaged" and "unsubscribed")

1. **Actor never emailed for their own action** — enforced in every notify helper
   (`skipActor`).
2. **Per-event preferences** — already exist (`UserNotificationPreference` /
   `RoleNotificationPreference`); every new event is preference-gated, EXCEPT the
   two mandatory security events.
3. **`digestOnly` flag (new)** — a per-user toggle that demotes all non-mandatory
   *immediate* emails into the daily digest. When set, immediate notifications
   still fire in-app + socket (real-time UX intact), but their EMAIL is suppressed
   and rolled into the 08:00 digest. See DIGEST_ONLY_FLAG.txt for the additive
   implementation. Mandatory (security, password reset, invitation) always email.
4. **Debounce** — rapid single-lead assignments already coalesce (3s window);
   apply the same pattern if any new event proves chatty.

## Recipient-scoping guarantee

Every recipient list is a concrete set of userIds resolved at emit time. Nothing
is company- or workspace-broadcast. Digests are per-user (own items only);
weekly/monthly summaries go ONLY to elevated roles (companyAdmin /
workspace_admin / manager), matching the visibility rule — they aggregate across
people, which only elevated roles may see.
