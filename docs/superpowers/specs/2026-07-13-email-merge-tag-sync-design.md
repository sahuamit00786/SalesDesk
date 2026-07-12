# Email Merge Tag Sync-Group System Design

**Date:** 2026-07-13  
**Feature:** Auto-sync missing merge fields across template when same tag appears multiple times  
**Scope:** Both email compose modals (EmailComposerDrawer + LeadEmailComposeModal)

## Problem

When an email template uses the same merge tag multiple times (e.g., `{{Company}}` appears 3x in body), users must fill the missing field in each location separately. This is tedious and error-prone when a field is repeated.

**Desired behavior:** Fill a merge tag once → auto-populate all other instances of that tag immediately.

## Solution: Sync-Group Data Attributes

Each missing merge blank will carry two attributes:
- `data-merge-blank="${key}"` — identifies as a typable blank (existing system)
- `data-sync-group="${key}"` — groups all instances of same field for synchronized editing

When user types/pastes into one blank, all blanks in the same sync-group update together silently.

## Detailed Design

### 1. Data Structure

**Current (EmailComposerDrawer):**
```html
<span data-merge-blank="company" title="Type company here"></span>
```

**Updated:**
```html
<span data-merge-blank="company" data-sync-group="company" title="Type company here"></span>
```

Sync-group ID = field key (lowercase, normalized). All instances of `{{company}}` or `@company` share the same group ID.

### 2. Affected Components

#### 2a. EmailComposerDrawer (`client/src/features/email/EmailComposerDrawer.jsx`)

**Modify `mergeBlankSpan(key)` function:**
- Add `data-sync-group` attribute to blank span
- Keep existing title and styling

**Modify `fillBodyMergeTags(input, values)` function:**
- Call updated `mergeBlankSpan(key)` that includes sync-group
- No other changes to merge logic

**Add sync handler to editor:**
- Listen to `input` events on contentEditable div
- Detect if edit is within a blank (check for `data-merge-blank` parent)
- If yes, extract the sync-group ID and new text
- Call `syncMergeGroup(syncGroupId, newText)` to update all blanks
- Update `bodyHtml` state from modified DOM

#### 2b. LeadEmailComposeModal (`client/src/features/leads/components/LeadEmailComposeModal.jsx`)

**Modify merge function to add sync-groups:**
- Currently uses `fillMergeTags()` from `mergeTags.js` (simple string replace, no blanks)
- Either:
  - Create new function `fillMergeTagsWithSyncGroups()` in this modal, OR
  - Modify `fillMergeTags()` to accept an option flag
  - Output HTML with `data-sync-group` attributes

**Add same sync handler:**
- Same input event listener on contentEditable editor
- Same `syncMergeGroup()` helper
- Same DOM→state update

### 3. Sync Implementation

**Helper function `syncMergeGroup(syncGroupId, newText)`:**
```javascript
function syncMergeGroup(syncGroupId, newText) {
  // Find all blanks with matching sync-group
  const blanks = editorRef.current?.querySelectorAll(
    `[data-sync-group="${syncGroupId}"]`
  ) || []
  
  // Update all matching blanks
  for (const blank of blanks) {
    blank.textContent = newText
  }
  
  // Update state from modified DOM
  setBodyHtml(editorRef.current?.innerHTML || '')
}
```

**Input event handler:**
```javascript
function handleEditorInput() {
  // Check if edit is in a blank (data-merge-blank ancestor)
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  
  const range = selection.getRangeAt(0)
  const blank = range.commonAncestorContainer?.parentElement?.closest('[data-merge-blank]')
  
  if (!blank) return
  
  const syncGroupId = blank.getAttribute('data-sync-group')
  const newText = blank.textContent
  
  if (syncGroupId) {
    syncMergeGroup(syncGroupId, newText)
  }
}

editorRef.current?.addEventListener('input', handleEditorInput)
```

### 4. Edge Cases & Behavior

**Case 1: User types into first blank**
- Blank 1 text: "Acme Corp"
- Sync-group detected, all blanks with same sync-group update
- Blank 2, 3 text: "Acme Corp" (auto-sync)

**Case 2: User deletes/clears a blank**
- Delete content from Blank 1
- All blanks in group clear
- Warning still shows field is missing (if still empty)

**Case 3: User pastes multi-line text**
- Paste into blank
- Only text content syncs (no HTML markup)
- All blanks update with pasted text

**Case 4: User selects multiple blanks + deletes**
- Select across Blank 1–2
- Delete
- Only blanks selected are affected (not whole group)
- This is acceptable — user made explicit selection

**Case 5: Mixed tags in template**
- Template has `{{company}}` (2x), `{{phone}}` (1x)
- Two sync-groups created: "company" and "phone"
- Editing company blank only syncs other company blanks
- Phone blank stays independent

**Case 6: Manual text in template**
- Template: "Hi {{company}} from {{sender_name}}"
- Company blank filled → syncs to all company blanks
- sender_name has no blanks (has fallback)
- No sync needed

### 5. Warning Message

No change to warning display. Remains:
```
"Missing on this lead: Company, Phone"
```

Sync behavior is silent — users learn by observing that filling one field fills others.

### 6. Testing Strategy

**Unit:**
- `syncMergeGroup()` updates all matching blanks
- Blanks with different sync-groups stay independent
- Empty string syncs correctly (blanks clear)

**Integration (EmailComposerDrawer):**
1. Load template with `{{company}}` 3x
2. Type "Acme Corp" in first blank
3. Assert other 2 blanks have "Acme Corp"
4. Delete content from blank 2
5. Assert all 3 blanks clear
6. Type new text
7. Assert all sync again

**Integration (LeadEmailComposeModal):**
- Same tests with different merge function

**E2E:**
- Select lead + template with repeated tags
- Compose email, fill blanks, observe sync
- Send email, verify sent with correct merged values

## Implementation Files

| File | Change |
|------|--------|
| `client/src/features/email/EmailComposerDrawer.jsx` | Add sync-group to blanks; add sync handler |
| `client/src/features/leads/components/LeadEmailComposeModal.jsx` | Add sync-group to blanks; add sync handler |
| `client/src/features/templates/mergeTags.js` | Optional: expose sync-group generation if shared function |

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Sync handler on every keystroke = perf impact | Handler only runs if edit is within blank; early return otherwise |
| DOM position tracking fragile | Using data attributes (stable) not positions |
| User confused by auto-sync | No visual change; behavior becomes intuitive after first use |
| Sync interferes with undo/redo | Browser undo/redo still works (operates on DOM) |

## Success Criteria

1. ✅ User fills one missing merge tag → all instances update immediately
2. ✅ Works in both EmailComposerDrawer and LeadEmailComposeModal
3. ✅ Synced blanks stay locked (user cannot edit them independently)
4. ✅ Clearing one blank clears all in sync-group
5. ✅ Warning messages unchanged (silent sync)
6. ✅ No performance regression
7. ✅ Existing merge/fill logic unaffected

## Open Questions

None at this time. Design approved by user.
