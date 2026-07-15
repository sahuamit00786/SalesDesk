import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { mergeTagToken } from '@/features/templates/mergeTags'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
  AtSign,
} from '@/components/ui/icons'

const TOOLBAR_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700'

/**
 * Rich text editor (contentEditable) with a toolbar for Bold / Italic / Underline,
 * lists, alignment, link, and an "insert variable" button. Emits HTML via onChange.
 *
 * Mention behavior is handled by the parent: it listens to onCaretChange to know
 * the current caret rect, watches the editor's text for `@query` patterns via
 * onTextChange, and inserts `@field` via the imperative `insertMergeTag` /
 * `replaceMentionToken` handle.
 */
export const TemplateRichEditor = forwardRef(function TemplateRichEditor(
  { value, onChange, onTextChange, onCaretChange, placeholder = 'Write your email body here. Type @ to insert lead fields like @first_name', minHeight = 260 },
  ref,
) {
  const editorRef = useRef(null)
  const lastValueRef = useRef('')

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastValueRef.current) {
      el.innerHTML = value || ''
      lastValueRef.current = value || ''
    }
  }, [value])

  useImperativeHandle(ref, () => ({
    focus() {
      editorRef.current?.focus()
    },
    getElement() {
      return editorRef.current
    },
    /** Replace the `@query` token at the current selection with `@field`. */
    replaceMentionToken(query, field) {
      const el = editorRef.current
      if (!el) return
      el.focus()
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const node = range.startContainer
      if (node.nodeType !== Node.TEXT_NODE) {
        insertTextAtCursor(mergeTagToken(field))
        emit()
        return
      }
      const text = node.textContent || ''
      const cursor = range.startOffset
      const tokenLen = (query?.length || 0) + 1 // includes the '@'
      const start = Math.max(0, cursor - tokenLen)
      const before = text.slice(0, start)
      const after = text.slice(cursor)
      const insertion = mergeTagToken(field)
      node.textContent = `${before}${insertion}${after}`
      const newRange = document.createRange()
      newRange.setStart(node, before.length + insertion.length)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
      emit()
    },
    /** Insert plain text or HTML at cursor (used for the toolbar variable button). */
    insertHtml(html) {
      editorRef.current?.focus()
      document.execCommand('insertHTML', false, html)
      emit()
    },
  }))

  function emit() {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    lastValueRef.current = html
    onChange?.(html)
    onTextChange?.(getEditorPlainText(el))
  }

  function exec(command, val) {
    editorRef.current?.focus()
    document.execCommand(command, false, val)
    emit()
  }

  function handleLink() {
    const url = window.prompt('Enter URL')
    if (!url) return
    exec('createLink', url)
  }

  function handleInsertVariable() {
    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand('insertText', false, '@')
    emit()
    requestAnimationFrame(() => onCaretChange?.())
  }

  return (
    <div className="rounded-xl border border-surface-border bg-white transition-colors focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-surface-border px-2 py-1.5">
        <button type="button" title="Bold" className={TOOLBAR_BUTTON} onClick={() => exec('bold')}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" title="Italic" className={TOOLBAR_BUTTON} onClick={() => exec('italic')}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" title="Underline" className={TOOLBAR_BUTTON} onClick={() => exec('underline')}>
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-surface-border" aria-hidden />
        <button type="button" title="Bulleted list" className={TOOLBAR_BUTTON} onClick={() => exec('insertUnorderedList')}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" title="Numbered list" className={TOOLBAR_BUTTON} onClick={() => exec('insertOrderedList')}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-surface-border" aria-hidden />
        <button type="button" title="Align left" className={TOOLBAR_BUTTON} onClick={() => exec('justifyLeft')}>
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" title="Align center" className={TOOLBAR_BUTTON} onClick={() => exec('justifyCenter')}>
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" title="Align right" className={TOOLBAR_BUTTON} onClick={() => exec('justifyRight')}>
          <AlignRight className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-surface-border" aria-hidden />
        <button type="button" title="Insert link" className={TOOLBAR_BUTTON} onClick={handleLink}>
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Insert lead variable"
          onClick={handleInsertVariable}
          className="ml-auto flex h-8 items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-100"
        >
          <AtSign className="h-3.5 w-3.5" />
          Insert variable
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder}
        className="template-rte prose prose-sm max-w-none px-4 py-3 text-sm text-ink outline-none"
        style={{ minHeight }}
        onInput={() => {
          emit()
          onCaretChange?.()
        }}
        onKeyUp={() => onCaretChange?.()}
        onClick={() => onCaretChange?.()}
        onFocus={() => onCaretChange?.()}
      />
    </div>
  )
})

function getEditorPlainText(el) {
  if (!el) return ''
  return (el.innerText || '').replace(/\u00a0/g, ' ')
}

/**
 * Inspect the text immediately before the caret inside a contentEditable element
 * for an `@query` token. Returns the query string (without the `@`) when the
 * dropdown should be open, or null when it should be closed.
 */
export function readMentionQueryFromSelection(rootEl) {
  if (!rootEl) return null
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!rootEl.contains(range.startContainer)) return null
  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return null
  const text = node.textContent || ''
  const cursor = range.startOffset
  const before = text.slice(0, cursor)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  const fragment = before.slice(at + 1)
  if (!/^[a-z0-9_]*$/i.test(fragment)) return null
  if (fragment.length > 40) return null
  return fragment
}

function insertTextAtCursor(text) {
  document.execCommand('insertText', false, text)
}
