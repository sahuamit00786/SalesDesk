import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Check,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  RemoveFormatting,
  Underline,
} from 'lucide-react'
import { getFileUrl } from '@/features/documents/documentUtils'

const AUTO_SAVE_DELAY = 1500 // 1.5 seconds after last keystroke

function ToolbarButton({ onClick, title, children, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        if (disabled) return
        e.preventDefault()
      }}
      onClick={disabled ? undefined : onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function run(cmd, value = false) {
  try {
    document.execCommand(cmd, false, value)
  } catch {
    /* ignore */
  }
}

function escapeHtmlText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;')
}

/** Fix relative / encoded paths so <img> and <a> load in the dev shell and production. */
function normalizeMediaUrlsInEditor(root) {
  if (!root) return
  root.querySelectorAll('img[src]').forEach((img) => {
    const cur = (img.getAttribute('src') || '').trim()
    const next = getFileUrl(cur) || cur
    if (next) img.setAttribute('src', next)
    else img.removeAttribute('src')
  })
  root.querySelectorAll('img').forEach((img) => {
    if (!(img.getAttribute('src') || '').trim()) img.remove()
  })
  root.querySelectorAll('a[href]').forEach((a) => {
    const cur = (a.getAttribute('href') || '').trim()
    const next = getFileUrl(cur) || cur
    if (next) a.setAttribute('href', next)
  })
}

function pruneEmptyParagraphAfterRemoval(p) {
  if (!p || p.tagName !== 'P') return
  const hasMedia = p.querySelector('img,a')
  const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim()
  if (!hasMedia && !text) {
    p.innerHTML = '<br>'
  }
}

function attachEmbedRemoveControls(root) {
  if (!root) return

  root.querySelectorAll('img[src]').forEach((img) => {
    if (img.closest('.note-embed-shell')) return
    const shell = document.createElement('span')
    shell.className =
      'note-embed-shell group/note-emb relative my-1 inline-block max-w-full align-middle rounded-lg ring-1 ring-slate-200/80'
    shell.contentEditable = 'false'
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className =
      'note-embed-remove pointer-events-auto absolute -right-1.5 -top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm opacity-100 hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:transition sm:group-hover/note-emb:opacity-100'
    removeBtn.setAttribute('aria-label', 'Remove attachment')
    removeBtn.textContent = '×'
    removeBtn.onmousedown = (e) => e.preventDefault()
    removeBtn.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const hostP = shell.parentElement
      shell.remove()
      pruneEmptyParagraphAfterRemoval(hostP)
    }
    img.classList.add('max-h-[min(360px,55vh)]', 'w-auto', 'max-w-full', 'rounded-md', 'align-middle', 'block')
    img.parentNode?.insertBefore(shell, img)
    shell.appendChild(img)
    shell.appendChild(removeBtn)
  })

  root.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim()
    if (!href.includes('/uploads/')) return
    if (a.closest('.note-embed-shell')) return
    const shell = document.createElement('span')
    shell.className =
      'note-embed-shell group/note-emb relative my-1 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 align-middle ring-1 ring-slate-200/60'
    shell.contentEditable = 'false'
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className =
      'note-embed-remove pointer-events-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-700'
    removeBtn.setAttribute('aria-label', 'Remove attachment')
    removeBtn.textContent = '×'
    removeBtn.onmousedown = (e) => e.preventDefault()
    removeBtn.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const hostP = shell.parentElement
      shell.remove()
      pruneEmptyParagraphAfterRemoval(hostP)
    }
    a.classList.add('break-all', 'text-sm', 'font-medium')
    a.parentNode?.insertBefore(shell, a)
    shell.appendChild(a)
    shell.appendChild(removeBtn)
  })
}

function finalizeEditorDom(editorEl) {
  if (!editorEl) return
  normalizeMediaUrlsInEditor(editorEl)
  attachEmbedRemoveControls(editorEl)
}

/** Remove editor-only wrappers/buttons before save (must not persist in note body). */
function stripEditorChromeForSave(root) {
  if (!root) return ''
  const clone = root.cloneNode(true)
  clone.querySelectorAll('.note-embed-remove').forEach((b) => b.remove())
  clone.querySelectorAll('.note-embed-shell').forEach((shell) => {
    const parent = shell.parentElement
    if (!parent) return
    while (shell.firstChild) parent.insertBefore(shell.firstChild, shell)
    shell.remove()
  })
  return clone.innerHTML
}

function insertHtmlIntoEditor(editorEl, html) {
  if (!editorEl) return
  const chunk = String(html || '').trim()
  if (!chunk) return
  editorEl.focus()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    editorEl.insertAdjacentHTML('beforeend', chunk)
    finalizeEditorDom(editorEl)
    return
  }
  const range = selection.getRangeAt(0)
  if (!editorEl.contains(range.commonAncestorContainer)) {
    editorEl.insertAdjacentHTML('beforeend', chunk)
    finalizeEditorDom(editorEl)
    return
  }
  range.deleteContents()
  const template = document.createElement('template')
  template.innerHTML = chunk
  const frag = template.content
  range.insertNode(frag)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  finalizeEditorDom(editorEl)
}

export function LeadRichNotesEditor({
  title,
  onTitleChange,
  initialHtml,
  editorKey,
  onSave,
  saving,
  isEditing,
  /** Upload file to storage; return public path/URL for img or link href */
  onUploadAttachment,
}) {
  const editorRef = useRef(null)
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  // Auto-save state: 'idle' | 'pending' | 'saving' | 'saved'
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const autoSaveTimerRef = useRef(null)
  const titleRef = useRef(title)

  // Keep titleRef in sync so auto-save closure always uses fresh title
  useEffect(() => { titleRef.current = title }, [title])

  const triggerAutoSave = useCallback(() => {
    if (!onSave || !isEditing) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setAutoSaveStatus('pending')
    autoSaveTimerRef.current = setTimeout(async () => {
      const html = stripEditorChromeForSave(editorRef.current)
      setAutoSaveStatus('saving')
      try {
        await onSave({ title: titleRef.current, html, autoSave: true })
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch {
        setAutoSaveStatus('idle')
      }
    }, AUTO_SAVE_DELAY)
  }, [onSave, isEditing])

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
  }, [])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const next = initialHtml?.trim() ? initialHtml : '<p><br></p>'
    el.innerHTML = next
    finalizeEditorDom(el)
  }, [editorKey, initialHtml])

  const focusEditor = () => {
    editorRef.current?.focus()
  }

  const exec = (cmd, val) => {
    focusEditor()
    run(cmd, val)
  }

  const promptLink = () => {
    focusEditor()
    const url = window.prompt('Link URL (https://…)')
    if (url?.trim()) run('createLink', url.trim())
  }

  const promptImage = () => {
    focusEditor()
    const url = window.prompt('Image URL')
    if (url?.trim()) {
      const fixed = getFileUrl(url.trim()) || url.trim()
      run('insertImage', fixed)
      if (editorRef.current) finalizeEditorDom(editorRef.current)
    }
  }

  const attachFile = () => {
    if (!onUploadAttachment) return
    focusEditor()
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '*/*'
    input.onchange = async () => {
      const files = Array.from(input.files || [])
      input.value = ''
      if (!files.length) return
      setAttachmentBusy(true)
      try {
        for (const file of files) {
          const { url, name, mimeType } = await onUploadAttachment(file)
          const href = String(url || '').trim()
          if (!href) continue
          const resolved = getFileUrl(href) || href
          const label = escapeHtmlText(name || file.name || 'Attachment')
          const mime = String(mimeType || file.type || '').toLowerCase()
          const snippet =
            mime.startsWith('image/')
              ? `<p><img src="${escapeAttr(resolved)}" alt="${escapeAttr(name || file.name || 'Image')}" /></p>`
              : `<p><a href="${escapeAttr(resolved)}" target="_blank" rel="noopener noreferrer">${label}</a></p>`
          insertHtmlIntoEditor(editorRef.current, snippet)
        }
      } catch {
        /* parent shows toast */
      } finally {
        setAttachmentBusy(false)
      }
    }
    input.click()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <input
          className="h-9 w-full max-w-md rounded-lg border border-slate-200 px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
          placeholder="Note title (optional)"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <div
        ref={editorRef}
        role="textbox"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[220px] max-h-[min(50vh,420px)] overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-ink outline-none [&_a]:text-brand-600 [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        onInput={() => {
          /* uncontrolled; parent reads on save */
          triggerAutoSave()
        }}
      />
      <p className="border-t border-slate-100 px-5 pb-2 pt-1 text-[11px] text-ink-muted">
        Hover an image or file chip, then × to remove.
      </p>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarButton title="Bold" onClick={() => exec('bold')}>
            <Bold size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => exec('italic')}>
            <Italic size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton title="Underline" onClick={() => exec('underline')}>
            <Underline size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton title="Clear formatting" onClick={() => exec('removeFormat')}>
            <RemoveFormatting size={17} />
          </ToolbarButton>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline-block" aria-hidden />
          <ToolbarButton title="Bullet list" onClick={() => exec('insertUnorderedList')}>
            <List size={17} />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" onClick={() => exec('insertOrderedList')}>
            <ListOrdered size={17} />
          </ToolbarButton>
          <ToolbarButton title="Align left" onClick={() => exec('justifyLeft')}>
            <AlignLeft size={17} />
          </ToolbarButton>
          <ToolbarButton title="Align center" onClick={() => exec('justifyCenter')}>
            <AlignCenter size={17} />
          </ToolbarButton>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <ToolbarButton title="Link" onClick={promptLink}>
            <Link2 size={17} />
          </ToolbarButton>
          <ToolbarButton title="Image from URL" onClick={promptImage}>
            <ImageIcon size={17} />
          </ToolbarButton>
          <ToolbarButton
            title={onUploadAttachment ? (attachmentBusy ? 'Uploading…' : 'Attach file') : 'Attachments unavailable'}
            onClick={attachFile}
            disabled={!onUploadAttachment || attachmentBusy}
          >
            <Paperclip size={17} />
          </ToolbarButton>
          <ToolbarButton title="Normal paragraph" onClick={() => exec('formatBlock', 'p')}>
            <span className="text-xs font-semibold">¶</span>
          </ToolbarButton>
          {/* Auto-save status indicator (only while editing) */}
          {isEditing && autoSaveStatus !== 'idle' && (
            <span
              className="flex items-center gap-1 text-[11px] text-ink-muted"
              aria-live="polite"
              aria-label={
                autoSaveStatus === 'pending' ? 'Waiting to auto-save'
                : autoSaveStatus === 'saving' ? 'Auto-saving note'
                : 'Note auto-saved'
              }
            >
              {autoSaveStatus === 'pending' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
              {autoSaveStatus === 'saving' && (
                <Loader2 className="h-3 w-3 animate-spin text-brand-500" />
              )}
              {autoSaveStatus === 'saved' && (
                <Check className="h-3 w-3 text-emerald-500" />
              )}
              <span className="sr-only">
                {autoSaveStatus === 'pending' ? 'Unsaved changes'
                  : autoSaveStatus === 'saving' ? 'Saving…'
                  : 'Saved'}
              </span>
              <span aria-hidden>
                {autoSaveStatus === 'pending' ? 'Unsaved'
                  : autoSaveStatus === 'saving' ? 'Saving…'
                  : 'Saved'}
              </span>
            </span>
          )}
          <button
            type="button"
            disabled={saving || attachmentBusy}
            onClick={() => {
              if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
              setAutoSaveStatus('idle')
              const html = stripEditorChromeForSave(editorRef.current)
              onSave({ title, html })
            }}
            className="ml-1 h-9 shrink-0 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEditing ? 'Save note' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  )
}
