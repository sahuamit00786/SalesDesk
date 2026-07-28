import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Archive, ArrowLeft, MessageCircle, Search, Star } from '@/components/ui/icons'
import { IconInput } from '@/components/ui/IconInput'
import { cn } from '@/utils/cn'
import {
  useUpdateWhatsAppConversationMutation,
  useReorderWhatsAppPinnedChatsMutation,
  useMarkWhatsAppConversationReadMutation,
  useMarkWhatsAppConversationUnreadMutation,
} from '@/features/whatsapp/whatsappApi'
import { ConversationContextMenu } from './ConversationContextMenu'
import { PinIcon } from '../PinIcon'
import { BellOffIcon } from '../BellOffIcon'
import { WhatsAppFormattedText } from '../WhatsAppFormattedText'

const ROW_HEIGHT = 68

function formatRelativeTime(value) {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(value).toLocaleDateString()
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export function WhatsAppSidebar({
  conversations,
  loading,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onStartNewChat,
  startingNewChat,
  showArchived,
  onToggleArchived,
  onOpenStarred,
  searchInputRef,
}) {
  const parentRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [draggedId, setDraggedId] = useState(null)

  const [updateConversation] = useUpdateWhatsAppConversationMutation()
  const [reorderPins] = useReorderWhatsAppPinnedChatsMutation()
  const [markRead] = useMarkWhatsAppConversationReadMutation()
  const [markUnread] = useMarkWhatsAppConversationUnreadMutation()

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => conversations[index]?.id ?? index,
  })

  const searchDigits = digitsOnly(search)
  const looksLikePhone = searchDigits.length >= 6
  const showStartNewChat = !showArchived && looksLikePhone && !loading && conversations.length === 0

  async function handlePin(conversation, pinned) {
    try {
      await updateConversation({ id: conversation.id, isPinned: pinned }).unwrap()
    } catch {
      toast.error('Could not update pin')
    }
  }
  async function handleArchive(conversation, archived) {
    try {
      await updateConversation({ id: conversation.id, isArchived: archived }).unwrap()
    } catch {
      toast.error('Could not update archive state')
    }
  }
  async function handleMute(conversation, muted) {
    try {
      await updateConversation({ id: conversation.id, isMuted: muted }).unwrap()
    } catch {
      toast.error('Could not update mute state')
    }
  }
  async function handleToggleRead(conversation) {
    try {
      if (conversation.unreadCount > 0) await markRead(conversation.id).unwrap()
      else await markUnread(conversation.id).unwrap()
    } catch {
      toast.error('Could not update read state')
    }
  }
  async function handlePinDrop(targetConversation) {
    if (!draggedId || draggedId === targetConversation.id) return
    const pinnedIds = conversations.filter((c) => c.isPinned).map((c) => c.id)
    const fromIndex = pinnedIds.indexOf(draggedId)
    const toIndex = pinnedIds.indexOf(targetConversation.id)
    if (fromIndex === -1 || toIndex === -1) return
    const next = [...pinnedIds]
    next.splice(fromIndex, 1)
    next.splice(toIndex, 0, draggedId)
    try {
      await reorderPins(next).unwrap()
    } catch {
      toast.error('Could not reorder pinned chats')
    }
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-surface-border bg-white lg:w-[360px]">
      <div className="flex shrink-0 items-center gap-1 border-b border-surface-border px-2 py-2" style={{ backgroundColor: 'var(--wa-panel)' }}>
        {showArchived ? (
          <button type="button" className="shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-surface-muted" onClick={() => onToggleArchived(false)} aria-label="Back">
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <IconInput
          ref={searchInputRef}
          icon={Search}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search or start new chat"
          title="Ctrl+K to focus"
          wrapperClassName="min-w-0 flex-1"
          className="h-9 min-h-0 rounded-full bg-surface-muted/40 text-sm"
          aria-label="Search WhatsApp conversations"
        />
        {!showArchived ? (
          <button type="button" className="shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onOpenStarred} aria-label="Starred messages">
            <Star size={16} />
          </button>
        ) : null}
      </div>

      {!showArchived ? (
        <button
          type="button"
          onClick={() => onToggleArchived(true)}
          className="flex shrink-0 items-center gap-2.5 border-b border-surface-border px-3 py-2 text-left hover:bg-surface-muted"
        >
          <Archive size={16} className="text-ink-muted" />
          <span className="text-xs font-medium text-ink-muted">Archived chats</span>
        </button>
      ) : (
        <div className="shrink-0 border-b border-surface-border bg-surface-subtle px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Archived
        </div>
      )}

      {showStartNewChat ? (
        <button
          type="button"
          onClick={() => onStartNewChat(search)}
          disabled={startingNewChat}
          className="flex shrink-0 items-center gap-2.5 border-b border-surface-border bg-emerald-50/60 px-3 py-2.5 text-left hover:bg-emerald-50 disabled:opacity-60"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <MessageCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-emerald-800">
              {startingNewChat ? 'Starting conversation…' : 'Start new conversation'}
            </p>
            <p className="truncate text-xs text-ink-muted">with {search.trim()}</p>
          </div>
        </button>
      ) : null}

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading && !conversations.length ? (
          <div className="divide-y divide-surface-border/60">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-2.5 px-3" style={{ height: ROW_HEIGHT }}>
                <div className="h-10 w-10 shrink-0 rounded-full bg-surface-muted" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="h-3 w-2/5 rounded bg-surface-muted" />
                  <div className="h-2.5 w-4/5 rounded bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 && !showStartNewChat ? (
          <p className="p-4 text-center text-xs text-ink-muted">{showArchived ? 'No archived chats' : 'No WhatsApp conversations yet'}</p>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const c = conversations[virtualItem.index]
              if (!c) return null
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ conversation: c, x: e.clientX, y: e.clientY })
                  }}
                  draggable={c.isPinned}
                  onDragStart={() => setDraggedId(c.id)}
                  onDragOver={(e) => { if (c.isPinned) e.preventDefault() }}
                  onDrop={(e) => { e.preventDefault(); if (c.isPinned) handlePinDrop(c) }}
                  onDragEnd={() => setDraggedId(null)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualItem.start}px)`,
                    backgroundColor: selectedId === c.id ? 'var(--wa-panel)' : undefined,
                  }}
                  className={cn(
                    'flex items-center gap-2.5 border-b border-surface-border/60 px-3 text-left transition-colors hover:bg-surface-muted',
                    c.isPinned && 'cursor-grab active:cursor-grabbing',
                    draggedId === c.id && 'opacity-50',
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300 bg-emerald-100 text-sm font-semibold text-emerald-800">
                      {(c.contactName || c.waPhoneNumber || '?').charAt(0).toUpperCase()}
                    </div>
                    {c.lead?.id ? (
                      <span
                        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                        title="Linked to an existing lead"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{c.contactName || c.waPhoneNumber}</p>
                      <span className="shrink-0 text-[11px] text-ink-muted">{formatRelativeTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1 truncate text-xs text-ink-muted">
                        {c.isPinned ? <PinIcon size={12} className="shrink-0 text-ink-muted" /> : null}
                        {c.isMuted ? <BellOffIcon size={12} className="shrink-0 text-ink-muted" /> : null}
                        <span className="truncate">
                          {c.lastMessageDirection === 'outbound' ? 'You: ' : ''}
                          {c.lastMessagePreview ? <WhatsAppFormattedText text={c.lastMessagePreview} /> : ' '}
                        </span>
                      </p>
                      {c.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {menu ? (
        <ConversationContextMenu
          x={menu.x}
          y={menu.y}
          conversation={menu.conversation}
          onClose={() => setMenu(null)}
          onPin={(pinned) => handlePin(menu.conversation, pinned)}
          onArchive={(archived) => handleArchive(menu.conversation, archived)}
          onMute={(muted) => handleMute(menu.conversation, muted)}
          onToggleRead={() => handleToggleRead(menu.conversation)}
        />
      ) : null}
    </aside>
  )
}
