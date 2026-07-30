import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, Search, X } from '@/components/ui/icons'
import {
  useGetWhatsAppMessagesQuery,
  useLazyGetWhatsAppMessagesQuery,
  useLazySearchWhatsAppMessagesQuery,
  useMarkWhatsAppConversationReadMutation,
  useReactToWhatsAppMessageMutation,
  useStarWhatsAppMessageMutation,
  useUpdateWhatsAppConversationMutation,
  useDeleteWhatsAppConversationMutation,
} from '@/features/whatsapp/whatsappApi'
import { WhatsAppMessageBubble } from './WhatsAppMessageBubble'
import { WhatsAppComposer } from './WhatsAppComposer'
import { TemplatePickerModal } from './TemplatePickerModal'
import { ConfirmDialog } from './ConfirmDialog'
import { VerticalDotsIcon } from '../VerticalDotsIcon'
import { buildMessageTimeline } from './messageGrouping'

const PAGE_SIZE_HINT = 30
const MAX_HISTORY_WALK = 15
const WINDOW_MS = 24 * 60 * 60 * 1000

/** `incoming` always wins on id collisions — it's the fresher data at every call site
 * (a live poll result, or a page just fetched from the server), while `existing` is
 * whatever was already sitting in local state. Getting this backwards is why reactions,
 * status ticks, etc. on already-loaded messages could silently fail to visually update. */
function mergeById(existing, incoming) {
  const map = new Map()
  for (const m of existing) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return Array.from(map.values())
}

export function WhatsAppThreadPane({ conversation, onBack, initialJumpMessageId, hideActions = false }) {
  const navigate = useNavigate()
  const scrollParentRef = useRef(null)
  const pendingScrollAdjustRef = useRef(null)
  const prevTailIdRef = useRef(null)
  const timelineRef = useRef([])
  const highlightTimeoutRef = useRef(null)
  const searchDebounceRef = useRef(null)

  // BUG FIX (§15.2 of the bug audit) — the highlight timeout and the search debounce
  // timer both fired unconditionally after unmount (e.g. closing the pane mid-search),
  // calling setState/jumpToMessage on a gone component. Clear both on unmount.
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current)
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const [olderMessages, setOlderMessages] = useState([])
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [dividerDismissed, setDividerDismissed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchIndex, setSearchIndex] = useState(-1)
  const [bannerTemplateOpen, setBannerTemplateOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // null | 'archive' | 'delete'
  const [openMenuKey, setOpenMenuKey] = useState(null)

  // Meta only allows free-form messages within 24h of the customer's last message —
  // outside that, a plain text send gets rejected and a Template is required instead.
  const windowOpen = useMemo(() => {
    if (!conversation.lastInboundMessageAt) return false
    return Date.now() - new Date(conversation.lastInboundMessageAt).getTime() < WINDOW_MS
  }, [conversation.lastInboundMessageAt])

  // Captured once (component remounts on conversation change via `key`) — the
  // divider must reflect the count BEFORE markRead below zeroes it out.
  const [unreadSnapshot] = useState(() => conversation.unreadCount || 0)

  const { data: latestPageRes, isSuccess: latestLoaded } = useGetWhatsAppMessagesQuery(
    { id: conversation.id },
    { pollingInterval: 15000 },
  )
  const [fetchMessagesPage] = useLazyGetWhatsAppMessagesQuery()
  const [runSearch] = useLazySearchWhatsAppMessagesQuery()
  const [markRead] = useMarkWhatsAppConversationReadMutation()
  const [reactToMessage] = useReactToWhatsAppMessageMutation()
  const [starMessage] = useStarWhatsAppMessageMutation()
  const [updateConversation] = useUpdateWhatsAppConversationMutation()
  const [deleteConversation] = useDeleteWhatsAppConversationMutation()

  useEffect(() => {
    markRead(conversation.id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const latestMessages = useMemo(() => (Array.isArray(latestPageRes?.data) ? latestPageRes.data : []), [latestPageRes?.data])

  const combinedMessages = useMemo(() => {
    const merged = mergeById(olderMessages, latestMessages)
    merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    return merged
  }, [olderMessages, latestMessages])

  const messageByWaId = useMemo(() => {
    const map = new Map()
    for (const m of combinedMessages) if (m.waMessageId) map.set(m.waMessageId, m)
    return map
  }, [combinedMessages])

  const unreadDividerIndex =
    unreadSnapshot > 0 && !dividerDismissed ? Math.max(combinedMessages.length - unreadSnapshot, 0) : null

  const timeline = useMemo(
    () => buildMessageTimeline(combinedMessages, unreadDividerIndex, unreadSnapshot),
    [combinedMessages, unreadDividerIndex, unreadSnapshot],
  )
  timelineRef.current = timeline

  const virtualizer = useVirtualizer({
    count: timeline.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 56,
    overscan: 12,
    getItemKey: (index) => timeline[index]?.key ?? index,
  })

  // Scroll to bottom on first paint and whenever a new message lands at the tail
  // (not when older history is prepended — the tail id is unchanged then).
  useEffect(() => {
    const tail = combinedMessages[combinedMessages.length - 1]
    if (!tail) return
    if (prevTailIdRef.current !== tail.id) {
      prevTailIdRef.current = tail.id
      requestAnimationFrame(() => virtualizer.scrollToIndex(timeline.length - 1, { align: 'end' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedMessages])

  // Preserve scroll position when older messages are prepended (classic
  // "measure before/after, offset by the delta" technique).
  useLayoutEffect(() => {
    const pending = pendingScrollAdjustRef.current
    if (!pending) return
    pendingScrollAdjustRef.current = null
    const { el, prevHeight, prevScrollTop } = pending
    if (!el) return
    el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight)
  }, [olderMessages])

  async function fetchOlderPage(beforeCursor) {
    const res = await fetchMessagesPage({ id: conversation.id, before: beforeCursor }).unwrap()
    return Array.isArray(res?.data) ? res.data : []
  }

  async function loadOlder() {
    if (loadingOlder || !hasMoreOlder) return
    const earliest = combinedMessages[0]
    if (!earliest) return
    setLoadingOlder(true)
    const el = scrollParentRef.current
    const prevHeight = el?.scrollHeight || 0
    const prevScrollTop = el?.scrollTop || 0
    try {
      const rows = await fetchOlderPage(earliest.createdAt)
      if (rows.length < PAGE_SIZE_HINT) setHasMoreOlder(false)
      if (rows.length) {
        setOlderMessages((prev) => mergeById(prev, rows))
        pendingScrollAdjustRef.current = { el, prevHeight, prevScrollTop }
      }
    } catch {
      // transient — user can scroll again to retry
    } finally {
      setLoadingOlder(false)
    }
  }

  function handleScroll(e) {
    if (e.target.scrollTop < 150) loadOlder()
  }

  function scrollAndHighlight(messageId) {
    const idx = timelineRef.current.findIndex((item) => item.kind === 'message' && item.message.id === messageId)
    if (idx === -1) return
    virtualizer.scrollToIndex(idx, { align: 'center' })
    setHighlightId(messageId)
    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = window.setTimeout(
      () => setHighlightId((cur) => (cur === messageId ? null : cur)),
      1500,
    )
  }

  /** Finds a message already loaded, or walks backward through history to load it. */
  async function jumpToMessage({ id, waMessageId }) {
    const matches = (m) => (waMessageId ? m.waMessageId === waMessageId : m.id === id)
    if (combinedMessages.some(matches)) {
      scrollAndHighlight(combinedMessages.find(matches).id)
      return
    }

    let cursor = combinedMessages[0]?.createdAt
    let more = hasMoreOlder
    const accumulated = []
    let guard = 0
    while (cursor && more && guard < MAX_HISTORY_WALK) {
      const rows = await fetchOlderPage(cursor).catch(() => [])
      guard += 1
      if (!rows.length) {
        more = false
        break
      }
      accumulated.unshift(...rows)
      if (rows.length < PAGE_SIZE_HINT) more = false
      cursor = rows[0].createdAt
      if (rows.some(matches)) break
    }
    if (accumulated.length) setOlderMessages((prev) => mergeById(prev, accumulated))
    if (!more) setHasMoreOlder(false)

    const found = accumulated.find(matches) || combinedMessages.find(matches)
    if (found) {
      requestAnimationFrame(() => scrollAndHighlight(found.id))
    } else {
      toast.error('Message not found in loaded history')
    }
  }

  // One-time jump when opened from the starred-messages panel — waits for the
  // latest page to resolve so jumpToMessage has a valid cursor to walk back from.
  useEffect(() => {
    if (initialJumpMessageId && latestLoaded) jumpToMessage({ id: initialJumpMessageId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestLoaded])

  function scheduleSearch(query) {
    setSearchQuery(query)
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        setSearchResults([])
        setSearchIndex(-1)
        return
      }
      try {
        const res = await runSearch({ id: conversation.id, q }).unwrap()
        const rows = Array.isArray(res?.data) ? res.data : []
        setSearchResults(rows)
        setSearchIndex(rows.length ? 0 : -1)
        if (rows.length) jumpToMessage(rows[0])
      } catch {
        setSearchResults([])
        setSearchIndex(-1)
      }
    }, 350)
  }

  function goToSearchResult(nextIndex) {
    if (!searchResults.length) return
    const clamped = ((nextIndex % searchResults.length) + searchResults.length) % searchResults.length
    setSearchIndex(clamped)
    jumpToMessage(searchResults[clamped])
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchIndex(-1)
  }

  async function handleReact(message, emoji) {
    try {
      await reactToMessage({ id: conversation.id, messageId: message.id, emoji }).unwrap()
    } catch {
      toast.error('Reaction failed to send')
    }
  }

  async function handleStar(message, starred) {
    try {
      await starMessage({ id: conversation.id, messageId: message.id, starred }).unwrap()
    } catch {
      toast.error('Could not update star')
    }
  }

  async function handleArchiveConfirmed() {
    setConfirmAction(null)
    try {
      await updateConversation({ id: conversation.id, isArchived: !conversation.isArchived }).unwrap()
      toast.success(conversation.isArchived ? 'Chat unarchived' : 'Chat archived')
      if (!conversation.isArchived) onBack()
    } catch {
      toast.error('Could not update archive state')
    }
  }

  async function handleDeleteConfirmed() {
    setConfirmAction(null)
    try {
      await deleteConversation(conversation.id).unwrap()
      toast.success('Chat deleted')
      onBack()
    } catch {
      toast.error('Could not delete chat')
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lf-wa-thread-in">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-white" style={{ backgroundColor: 'var(--wa-header)' }}>
        <button type="button" className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10 lg:hidden" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-semibold text-white">
          {(conversation.contactName || conversation.waPhoneNumber || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{conversation.contactName || conversation.waPhoneNumber}</p>
          <p className="truncate text-xs text-white/75">{conversation.waPhoneNumber}</p>
        </div>
        {conversation.lead?.id ? (
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/25"
            onClick={() => navigate(`/leads/${conversation.lead.id}`)}
          >
            {conversation.lead.title || conversation.lead.contactName || 'Linked lead'}
          </button>
        ) : null}
        {conversation.lead?.id ? (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-2 ring-white/40" title="Linked to an existing lead" />
        ) : null}
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10"
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          aria-label="Search in chat"
        >
          <Search size={18} />
        </button>
        {!hideActions ? (
          <div className="relative shrink-0">
            <button
              type="button"
              className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              aria-label="More options"
            >
              <VerticalDotsIcon size={18} />
            </button>
            {headerMenuOpen ? (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 top-full z-[100] mt-1 w-44 overflow-hidden rounded-xl border border-surface-border bg-white py-1 text-ink shadow-2xl">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    onClick={() => { setHeaderMenuOpen(false); setConfirmAction('archive') }}
                  >
                    {conversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-surface-muted"
                    onClick={() => { setHeaderMenuOpen(false); setConfirmAction('delete') }}
                  >
                    Delete chat
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {searchOpen ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-border px-3 py-2" style={{ backgroundColor: 'var(--wa-panel)' }}>
          <Search size={14} className="shrink-0 text-ink-muted" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => scheduleSearch(e.target.value)}
            placeholder="Search in this conversation…"
            className="h-8 min-w-0 flex-1 rounded-md border border-surface-border bg-white px-2 text-xs outline-none focus:border-[var(--wa-accent)]"
          />
          <span className="shrink-0 text-[11px] text-ink-muted">
            {searchResults.length ? `${searchIndex + 1}/${searchResults.length}` : '0/0'}
          </span>
          <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-white disabled:opacity-40" disabled={!searchResults.length} onClick={() => goToSearchResult(searchIndex - 1)} aria-label="Previous match">
            <ChevronUp size={16} />
          </button>
          <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-white disabled:opacity-40" disabled={!searchResults.length} onClick={() => goToSearchResult(searchIndex + 1)} aria-label="Next match">
            <ChevronDown size={16} />
          </button>
          <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-white" onClick={closeSearch} aria-label="Close search">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {!windowOpen ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle size={16} className="shrink-0 text-red-600" />
          <p className="min-w-0 flex-1 text-xs text-red-900">
            {conversation.lastInboundMessageAt
              ? "Outside the 24-hour window — this contact hasn't messaged you recently."
              : "This contact has never messaged you."}{' '}
            Free-form text will be rejected by WhatsApp — send an approved template instead.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ backgroundColor: 'var(--wa-accent)' }}
            onClick={() => setBannerTemplateOpen(true)}
          >
            Send template
          </button>
        </div>
      ) : null}

      <div ref={scrollParentRef} onScroll={handleScroll} className="lf-wa-chat-bg min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loadingOlder ? <p className="pb-2 text-center text-xs text-ink-muted">Loading earlier messages…</p> : null}
        {!latestLoaded ? (
          <div className="space-y-2">
            {[false, true, false, true, true].map((outbound, i) => (
              <div key={i} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                <div className="h-10 w-2/5 animate-pulse rounded-2xl bg-white/70" />
              </div>
            ))}
          </div>
        ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {combinedMessages.length === 0 ? (
            <p className="pt-8 text-center text-xs text-ink-muted">No messages yet</p>
          ) : (
            virtualizer.getVirtualItems().map((virtualItem) => {
              const item = timeline[virtualItem.index]
              if (!item) return null
              return (
                <div
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    zIndex: openMenuKey === item.key ? 30 : undefined,
                  }}
                >
                  {item.kind === 'date' ? (
                    <div className="flex justify-center py-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-ink-muted shadow-sm">{item.label}</span>
                    </div>
                  ) : item.kind === 'divider' ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px flex-1 bg-emerald-300/60" />
                      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                        New messages ({item.count})
                      </span>
                      <div className="h-px flex-1 bg-emerald-300/60" />
                    </div>
                  ) : (
                    <WhatsAppMessageBubble
                      message={item.message}
                      quotedMessage={item.message.replyToWaMessageId ? messageByWaId.get(item.message.replyToWaMessageId) : null}
                      isFirstInGroup={item.isFirstInGroup}
                      isLastInGroup={item.isLastInGroup}
                      highlighted={highlightId === item.message.id}
                      onReply={setReplyingTo}
                      onReact={(emoji) => handleReact(item.message, emoji)}
                      onStar={(starred) => handleStar(item.message, starred)}
                      onJumpToReply={(waId) => jumpToMessage({ waMessageId: waId })}
                      onMenuOpenChange={(open) => setOpenMenuKey((cur) => (open ? item.key : cur === item.key ? null : cur))}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
        )}
      </div>

      <WhatsAppComposer
        conversationId={conversation.id}
        leadId={conversation.lead?.id}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSent={() => setDividerDismissed(true)}
        windowOpen={windowOpen}
      />

      {bannerTemplateOpen ? (
        <TemplatePickerModal
          conversationId={conversation.id}
          leadId={conversation.lead?.id}
          onClose={() => setBannerTemplateOpen(false)}
          onSent={() => setDividerDismissed(true)}
        />
      ) : null}

      {confirmAction === 'archive' ? (
        <ConfirmDialog
          title={conversation.isArchived ? 'Unarchive this chat?' : 'Archive this chat?'}
          message={
            conversation.isArchived
              ? 'It will move back to your main chat list.'
              : "It'll move to Archived chats. New messages bring it back automatically."
          }
          confirmLabel={conversation.isArchived ? 'Unarchive' : 'Archive'}
          onConfirm={handleArchiveConfirmed}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}

      {confirmAction === 'delete' ? (
        <ConfirmDialog
          title="Delete this chat?"
          message="This removes it from your inbox view only — WhatsApp has no way to delete a delivered message for the other side, and this reopens automatically if they message again."
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </div>
  )
}
