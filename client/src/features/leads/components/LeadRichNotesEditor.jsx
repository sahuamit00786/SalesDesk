import { useEffect, useRef } from 'react'
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  RemoveFormatting,
  Underline,
} from 'lucide-react'

function ToolbarButton({ onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-ink"
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

export function LeadRichNotesEditor({
  title,
  onTitleChange,
  initialHtml,
  editorKey,
  onSave,
  saving,
  isEditing,
}) {
  const editorRef = useRef(null)

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const next = initialHtml?.trim() ? initialHtml : '<p><br></p>'
    el.innerHTML = next
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
    if (url?.trim()) run('insertImage', url.trim())
  }

  const attachFile = () => {
    focusEditor()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        if (typeof dataUrl === 'string') run('insertImage', dataUrl)
      }
      reader.readAsDataURL(file)
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
        }}
      />
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
          <ToolbarButton title="Attach image" onClick={attachFile}>
            <Paperclip size={17} />
          </ToolbarButton>
          <ToolbarButton title="Normal paragraph" onClick={() => exec('formatBlock', 'p')}>
            <span className="text-xs font-semibold">¶</span>
          </ToolbarButton>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const html = editorRef.current?.innerHTML || ''
              onSave({ title, html })
            }}
            className="ml-1 h-9 shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEditing ? 'Save note' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  )
}
