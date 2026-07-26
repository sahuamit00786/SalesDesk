import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Bell, Check, MailOpen } from '@/components/ui/icons'
import { PinIcon } from '../PinIcon'
import { BellOffIcon } from '../BellOffIcon'

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted">
      <Icon size={15} className="shrink-0 text-ink-muted" />
      {label}
    </button>
  )
}

/** Right-click context menu for a conversation row, positioned at the click point. */
export function ConversationContextMenu({ x, y, conversation, onClose, onPin, onArchive, onMute, onToggleRead }) {
  const ref = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const left = Math.min(x, viewportWidth - 200)

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-[100] w-48 overflow-hidden rounded-xl border border-surface-border bg-white py-1 shadow-2xl"
      style={{ top: y, left }}
    >
      <MenuItem icon={PinIcon} label={conversation.isPinned ? 'Unpin chat' : 'Pin chat'} onClick={() => { onPin(!conversation.isPinned); onClose() }} />
      <MenuItem
        icon={conversation.unreadCount > 0 ? Check : MailOpen}
        label={conversation.unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}
        onClick={() => { onToggleRead(); onClose() }}
      />
      <MenuItem icon={conversation.isMuted ? Bell : BellOffIcon} label={conversation.isMuted ? 'Unmute notifications' : 'Mute notifications'} onClick={() => { onMute(!conversation.isMuted); onClose() }} />
      <MenuItem
        icon={Archive}
        label={conversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
        onClick={() => { onArchive(!conversation.isArchived); onClose() }}
      />
    </div>,
    document.body,
  )
}
