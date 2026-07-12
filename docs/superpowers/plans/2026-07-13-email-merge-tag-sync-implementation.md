# Email Merge Tag Sync-Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement auto-sync for repeated merge tags in email templates — filling one blank fills all instances of that tag immediately.

**Architecture:** Add `data-sync-group` attribute to merge blanks (alongside existing `data-merge-blank`). Attach input event listener to editor that detects blank edits and syncs all matching blanks with same group ID. Apply to both EmailComposerDrawer and LeadEmailComposeModal.

**Tech Stack:** React, contentEditable div, vanilla DOM manipulation (no new dependencies)

## Global Constraints

- Work in both `EmailComposerDrawer` (email page) and `LeadEmailComposeModal` (lead detail page)
- No breaking changes to existing merge tag system
- Silent auto-sync (no visual change to UI)
- Warning messages unchanged
- Sync-group ID = field key (lowercase, e.g., "company", "phone")

---

## File Structure

| File | Responsibility |
|------|-----------------|
| `client/src/features/email/EmailComposerDrawer.jsx` | Add sync-group to blanks; implement input handler for sync |
| `client/src/features/leads/components/LeadEmailComposeModal.jsx` | Add sync-group to blanks; implement input handler for sync |

Both files already have editors (contentEditable divs). No new files needed.

---

### Task 1: Add Sync-Group Support to EmailComposerDrawer

**Files:**
- Modify: `client/src/features/email/EmailComposerDrawer.jsx:28-50` (helper functions)
- Modify: `client/src/features/email/EmailComposerDrawer.jsx:200-290` (editor + sync logic)

**Interfaces:**
- Consumes: existing `mergeBlankSpan(key)` function, existing `fillBodyMergeTags()` function
- Produces: updated `mergeBlankSpan(key)` with sync-group attribute; new `syncMergeGroup(syncGroupId, newText)` helper; new `handleEditorInput` handler

---

#### Step 1: Update `mergeBlankSpan()` to include sync-group attribute

Current code (line 28-30):
```javascript
function mergeBlankSpan(key) {
  return `<span data-merge-blank="${key}" title="Type ${mergeFieldLabel(key).toLowerCase()} here"></span>`
}
```

Replace with:
```javascript
function mergeBlankSpan(key) {
  return `<span data-merge-blank="${key}" data-sync-group="${key}" title="Type ${mergeFieldLabel(key).toLowerCase()} here"></span>`
}
```

- [ ] Edit `client/src/features/email/EmailComposerDrawer.jsx` line 28-30
- [ ] Run dev server and verify no console errors: `npm run dev:client`
- [ ] Commit: `git add -A && git commit -m "feat: add sync-group attribute to merge blanks in EmailComposerDrawer"`

---

#### Step 2: Add `syncMergeGroup()` helper function

Add this new helper after the `formatBytes()` function (around line 165):

```javascript
function syncMergeGroup(editorRef, syncGroupId, newText) {
  if (!editorRef.current) return
  const blanks = editorRef.current.querySelectorAll(
    `[data-sync-group="${syncGroupId}"]`
  )
  for (const blank of blanks) {
    blank.textContent = newText
  }
}
```

- [ ] Add function to `client/src/features/email/EmailComposerDrawer.jsx` after line 165
- [ ] Verify syntax is correct (no IDE errors)
- [ ] Commit: `git add -A && git commit -m "feat: add syncMergeGroup helper for EmailComposerDrawer"`

---

#### Step 3: Add input event handler to detect blank edits

Add this new handler inside the component (around line 240, before the `if (!open) return null` check):

```javascript
function handleEditorInput() {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  
  const range = selection.getRangeAt(0)
  let node = range.commonAncestorContainer
  
  // Traverse up to find the blank span
  let blank = null
  if (node.nodeType === Node.TEXT_NODE) {
    blank = node.parentElement?.closest('[data-merge-blank]')
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    blank = node.closest('[data-merge-blank]')
  }
  
  if (!blank) return
  
  const syncGroupId = blank.getAttribute('data-sync-group')
  if (!syncGroupId) return
  
  const newText = blank.textContent
  syncMergeGroup(editorRef, syncGroupId, newText)
  setBodyHtml(editorRef.current?.innerHTML || '')
}
```

- [ ] Add function to `client/src/features/email/EmailComposerDrawer.jsx` around line 240
- [ ] Verify syntax (no IDE errors)
- [ ] Commit: `git add -A && git commit -m "feat: add handleEditorInput for merge blank sync in EmailComposerDrawer"`

---

#### Step 4: Attach input handler to editor in render

Find the contentEditable div (search for `contentEditable="true"`). It should be around line 500+. Add `onInput={handleEditorInput}` to the div:

```javascript
<div
  ref={editorRef}
  contentEditable="true"
  onInput={handleEditorInput}
  // ... rest of props
  className="..."
  style={{...}}
/>
```

- [ ] Find the contentEditable div in EmailComposerDrawer render
- [ ] Add `onInput={handleEditorInput}` prop
- [ ] Save file
- [ ] Run dev server: `npm run dev:client`
- [ ] Verify no console errors
- [ ] Commit: `git add -A && git commit -m "feat: attach input handler to editor in EmailComposerDrawer"`

---

#### Step 5: Manual test in EmailComposerDrawer

1. Start dev server: `npm run dev:client`
2. Navigate to `/email` in browser
3. Select a lead from dropdown
4. Pick a template that has a repeated merge tag (e.g., "Welcome Email" if it has `{{company}}` multiple times)
   - If no template has repeats, create a test template at `/templates` with `Hello {{company}}, Company: {{company}}`
5. Observe red blanks in email body
6. Click into the first `{{company}}` blank and type "Acme Corp"
7. **Expected:** Both (or all) `{{company}}` blanks should update to "Acme Corp" immediately
8. Clear one blank and type new text
9. **Expected:** All synced blanks clear and update together

- [ ] Perform manual test steps 1-9
- [ ] Screenshot or note success
- [ ] If failed, debug and fix before committing

---

### Task 2: Add Sync-Group Support to LeadEmailComposeModal

**Files:**
- Modify: `client/src/features/leads/components/LeadEmailComposeModal.jsx:28-70` (imports + merge logic)
- Modify: `client/src/features/leads/components/LeadEmailComposeModal.jsx:140-160` (template apply)
- Modify: `client/src/features/leads/components/LeadEmailComposeModal.jsx:300-450` (editor + sync logic)

**Interfaces:**
- Consumes: existing `fillMergeTags()` from mergeTags module, existing `applyTemplate()` function
- Produces: new `fillMergeTagsWithSyncGroups()` function that adds sync-group attrs; new `syncMergeGroup()` helper; new `handleEditorInput` handler

---

#### Step 1: Create `fillMergeTagsWithSyncGroups()` utility function

Add this function at the top of `LeadEmailComposeModal.jsx` (before the component definition, around line 30):

```javascript
/**
 * Like fillMergeTags, but adds data-sync-group attrs for sync behavior.
 */
function fillMergeTagsWithSyncGroups(input, values = {}) {
  let out = String(input || '')
  
  // Replace {{key}} patterns
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const k = String(key || '').toLowerCase()
    const v = values[k]
    if (v != null) return String(v)
    // Empty value: create blank span with sync-group
    return `<span data-merge-blank="${k}" data-sync-group="${k}" style="background-color: rgba(239, 68, 68, 0.2); color: rgb(127, 29, 29); padding: 0.125em 0.25em; border-radius: 0.125em;" title="Type ${k.replace(/_/g, ' ')} here"></span>`
  })
  
  // Replace @key patterns (known fields only)
  const KNOWN_FIELDS = new Set([
    'first_name', 'last_name', 'contact_name', 'name', 'company', 'designation',
    'email', 'phone', 'value', 'deal_value', 'source', 'status', 'city', 'state',
    'country', 'street', 'postal_code', 'title', 'sender_name', 'requirement',
  ])
  out = out.replace(/@([a-z][a-z0-9_]*)/gi, (match, key) => {
    const k = String(key || '').toLowerCase()
    if (!KNOWN_FIELDS.has(k)) return match
    const v = values[k]
    if (v != null) return String(v)
    // Empty value: create blank span with sync-group
    return `<span data-merge-blank="${k}" data-sync-group="${k}" style="background-color: rgba(239, 68, 68, 0.2); color: rgb(127, 29, 29); padding: 0.125em 0.25em; border-radius: 0.125em;" title="Type ${k.replace(/_/g, ' ')} here"></span>`
  })
  
  return out
}
```

- [ ] Add function to top of `client/src/features/leads/components/LeadEmailComposeModal.jsx` (before component)
- [ ] Verify syntax (no IDE errors)
- [ ] Commit: `git add -A && git commit -m "feat: add fillMergeTagsWithSyncGroups utility for LeadEmailComposeModal"`

---

#### Step 2: Update `applyTemplate()` to use new function

Find the `applyTemplate()` function (around line 145). Change the merge calls:

**Before:**
```javascript
function applyTemplate(template) {
  if (!template) return
  const mergeValues = buildLeadMergeValues(lead || {}, senderName)
  const mergedSubject = fillMergeTags(template.subject, mergeValues)
  const mergedBody = fillMergeTags(template.bodyHtml, mergeValues)
  setSubject(mergedSubject)
  setBodyHtml(mergedBody)
  // ...
}
```

**After:**
```javascript
function applyTemplate(template) {
  if (!template) return
  const mergeValues = buildLeadMergeValues(lead || {}, senderName)
  const mergedSubject = fillMergeTags(template.subject, mergeValues)
  const mergedBody = fillMergeTagsWithSyncGroups(template.bodyHtml, mergeValues)
  setSubject(mergedSubject)
  setBodyHtml(mergedBody)
  if (editorRef.current) {
    editorRef.current.innerHTML = mergedBody || ''
  }
  setTemplateAttachments(templateAttachmentsToEmailShape(template.attachments))
}
```

- [ ] Edit `applyTemplate()` in `client/src/features/leads/components/LeadEmailComposeModal.jsx`
- [ ] Change `fillMergeTags(template.bodyHtml, ...)` to `fillMergeTagsWithSyncGroups(template.bodyHtml, ...)`
- [ ] Add editor.innerHTML sync
- [ ] Verify syntax
- [ ] Commit: `git add -A && git commit -m "feat: use fillMergeTagsWithSyncGroups in LeadEmailComposeModal applyTemplate"`

---

#### Step 3: Add `syncMergeGroup()` helper function

Add after line 40 (or after the utility function from Step 1):

```javascript
function syncMergeGroup(editorRef, syncGroupId, newText) {
  if (!editorRef.current) return
  const blanks = editorRef.current.querySelectorAll(
    `[data-sync-group="${syncGroupId}"]`
  )
  for (const blank of blanks) {
    blank.textContent = newText
  }
}
```

- [ ] Add function to `client/src/features/leads/components/LeadEmailComposeModal.jsx` after line 40
- [ ] Verify syntax
- [ ] Commit: `git add -A && git commit -m "feat: add syncMergeGroup helper for LeadEmailComposeModal"`

---

#### Step 4: Add input event handler

Add handler function inside component (before return JSX, around line 180):

```javascript
function handleEditorInput() {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  
  const range = selection.getRangeAt(0)
  let node = range.commonAncestorContainer
  
  // Traverse up to find the blank span
  let blank = null
  if (node.nodeType === Node.TEXT_NODE) {
    blank = node.parentElement?.closest('[data-merge-blank]')
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    blank = node.closest('[data-merge-blank]')
  }
  
  if (!blank) return
  
  const syncGroupId = blank.getAttribute('data-sync-group')
  if (!syncGroupId) return
  
  const newText = blank.textContent
  syncMergeGroup(editorRef, syncGroupId, newText)
  setBodyHtml(editorRef.current?.innerHTML || '')
}
```

- [ ] Add function to `client/src/features/leads/components/LeadEmailComposeModal.jsx` around line 180
- [ ] Verify syntax
- [ ] Commit: `git add -A && git commit -m "feat: add handleEditorInput for merge blank sync in LeadEmailComposeModal"`

---

#### Step 5: Attach input handler to editor in render

Find the contentEditable div in the return JSX (search for `contentEditable="true"`). Add `onInput={handleEditorInput}`:

```javascript
<div
  ref={editorRef}
  contentEditable="true"
  onInput={handleEditorInput}
  // ... rest of props
/>
```

- [ ] Find contentEditable div in LeadEmailComposeModal render
- [ ] Add `onInput={handleEditorInput}` prop
- [ ] Save file
- [ ] Run dev server: `npm run dev:client`
- [ ] Verify no console errors
- [ ] Commit: `git add -A && git commit -m "feat: attach input handler to editor in LeadEmailComposeModal"`

---

#### Step 6: Manual test in LeadEmailComposeModal

1. Start dev server: `npm run dev:client`
2. Navigate to `/leads` and open a lead detail page
3. Scroll to email section (or find "Send email" button)
4. Click to open email compose modal
5. Select a template with repeated merge tags (create test template if needed with `{{company}}` 2x)
6. Observe blanks in email body
7. Click into first blank and type "Test Company"
8. **Expected:** All `{{company}}` blanks should update to "Test Company" immediately
9. Delete content and type new text
10. **Expected:** All synced blanks clear and update together

- [ ] Perform manual test steps 1-10
- [ ] Screenshot or note success
- [ ] If failed, debug and fix before committing

---

### Task 3: Create Test Template with Repeated Tags

To properly test both modals, ensure a template exists with repeated merge tags.

#### Step 1: Create template via UI

1. Start dev server: `npm run dev:client`
2. Navigate to `/templates`
3. Click "Create Template" or similar button
4. Fill in:
   - **Name:** "Test Sync Template"
   - **Subject:** "Hello {{first_name}}"
   - **Body:** 
   ```
   Dear {{company}},
   
   We specialize in {{company}} solutions.
   Contact {{company}} directly for demos.
   ```
5. Save template

- [ ] Create template via UI with 3x `{{company}}` in body
- [ ] Note the template ID or name
- [ ] Screenshot

---

#### Step 2: Test EmailComposerDrawer with template

1. Navigate to `/email`
2. Select any lead (must have email)
3. Pick "Test Sync Template" from dropdown
4. Observe 3 red `{{company}}` blanks
5. Click first blank, type "Acme Labs"
6. **Expected:** All 3 blanks show "Acme Labs"
7. Clear first blank
8. **Expected:** All 3 blanks clear
9. Type "New Corp"
10. **Expected:** All 3 blanks show "New Corp"

- [ ] Perform test steps 1-10
- [ ] Verify sync works in EmailComposerDrawer
- [ ] Note any issues

---

#### Step 3: Test LeadEmailComposeModal with template

1. Navigate to `/leads` and open any lead detail
2. Open email compose modal
3. Pick "Test Sync Template"
4. Observe blanks in body
5. Click first blank, type "Beta Inc"
6. **Expected:** All blanks show "Beta Inc"
7. Clear and type "Delta Ltd"
8. **Expected:** All blanks show "Delta Ltd"

- [ ] Perform test steps 1-8
- [ ] Verify sync works in LeadEmailComposeModal
- [ ] Note any issues

- [ ] Commit: `git add -A && git commit -m "test: verify merge tag sync in both email modals"`

---

### Task 4: Edge Case Testing

#### Step 1: Test mixed tags (different sync groups)

1. Create new template with:
   ```
   {{company}} is interested.
   Contact {{company}} at {{phone}}.
   Phone: {{phone}}
   ```
   (company 2x, phone 2x)

2. Test in EmailComposerDrawer:
   - Fill first company blank → both company blanks sync
   - Fill first phone blank → both phone blanks sync (company blanks don't change)

- [ ] Create test template with mixed tags
- [ ] Test EmailComposerDrawer sync isolation (company syncs separately from phone)
- [ ] Verify syncs don't cross groups
- [ ] Note any issues

---

#### Step 2: Test clearing blanks

1. Fill a sync group (3x company blanks)
2. Delete text from middle blank
3. **Expected:** All 3 blanks clear

- [ ] Test delete/clear behavior
- [ ] Verify all blanks in group clear together
- [ ] Note any issues

---

#### Step 3: Test pasting into blanks

1. Copy text "Pasted Company"
2. Click into first blank
3. Paste text
4. **Expected:** All blanks sync to pasted text (text only, no markup)

- [ ] Test paste behavior
- [ ] Verify plain text pastes sync
- [ ] Note any issues

- [ ] Commit: `git add -A && git commit -m "test: verify edge cases for merge tag sync"`

---

### Task 5: Final Integration Test & Cleanup

#### Step 1: End-to-end test: EmailComposerDrawer

1. Navigate to `/email`
2. Select a lead
3. Pick template with repeated tags
4. Fill blanks → verify sync
5. Add CC/BCC recipients
6. Attach file
7. Send email
8. **Expected:** Email sent successfully with all blanks filled correctly

- [ ] Perform full E2E test for EmailComposerDrawer
- [ ] Verify email sends without errors
- [ ] Note any issues

---

#### Step 2: End-to-end test: LeadEmailComposeModal

1. Navigate to `/leads` and open lead detail
2. Open compose modal
3. Pick template with repeated tags
4. Fill blanks → verify sync
5. Send email
6. **Expected:** Email sent successfully

- [ ] Perform full E2E test for LeadEmailComposeModal
- [ ] Verify email sends without errors
- [ ] Note any issues

---

#### Step 3: Verify no regressions

1. Run existing tests (if any): `npm run test -- client`
2. Test normal (non-sync) template usage:
   - Single-occurrence tags should work as before
   - Non-template emails should work as before
   - Sending without blanks filled should still gate correctly

- [ ] Run test suite
- [ ] Verify no new failures
- [ ] Test non-sync templates work normally
- [ ] Note any regressions

---

#### Step 4: Final commit

- [ ] Run dev server one final time: `npm run dev:client`
- [ ] Spot-check both modals work
- [ ] Commit any leftover changes: `git add -A && git commit -m "feat: complete merge tag sync-group implementation"`

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: EmailComposerDrawer sync-group + input handler (Design §2a, §3)
- ✅ Task 2: LeadEmailComposeModal sync-group + input handler (Design §2b, §3)
- ✅ Task 3: Test templates created
- ✅ Task 4: Edge cases tested (Design §4)
- ✅ Task 5: Integration tests + regression check (Design §6)

**Placeholders:** None found. All code blocks complete with exact implementations.

**Type consistency:** 
- `syncMergeGroup(editorRef, syncGroupId, newText)` consistent across both modals
- `handleEditorInput()` same signature in both
- `data-sync-group` attribute consistent

**Scope:** Single focused feature (merge tag sync). Both modals get identical treatment.

