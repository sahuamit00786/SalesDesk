import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import {
  useGetWhatsAppSettingsQuery,
  useGetWhatsAppConversationsQuery,
  useCreateWhatsAppConversationMutation,
} from '@/features/whatsapp/whatsappApi'
import { WhatsAppSidebar } from '@/features/whatsapp/inbox/WhatsAppSidebar'
import { WhatsAppThreadPane } from '@/features/whatsapp/inbox/WhatsAppThreadPane'
import { StarredMessagesPanel } from '@/features/whatsapp/inbox/StarredMessagesPanel'
import { useWhatsAppNotifications, useWhatsAppTitleBadge } from '@/features/whatsapp/useWhatsAppNotifications'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppIcon'

function isEditableTarget(el) {
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable
}

export function WhatsAppPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('conversationId')
  const jumpMessageId = searchParams.get('jumpMessageId')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [starredOpen, setStarredOpen] = useState(false)
  const [overrideConversation, setOverrideConversation] = useState(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    // Never send '+' for filtering/finding — a phone typed as "+91 700..." must still
    // match a conversation stored digit-only ("91700...").
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().replace(/\+/g, '')), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const { data: settingsData, isLoading: loadingSettings } = useGetWhatsAppSettingsQuery()
  const connected = settingsData?.data?.status === 'verified'

  const { data: conversationsRes, isFetching } = useGetWhatsAppConversationsQuery(
    { search: debouncedSearch || undefined, archived: showArchived || undefined },
    { skip: !connected, pollingInterval: 20000 },
  )
  const conversations = useMemo(() => (Array.isArray(conversationsRes?.data) ? conversationsRes.data : []), [conversationsRes?.data])

  const selectedConversation = useMemo(() => {
    if (overrideConversation?.id === selectedId) return overrideConversation
    return conversations.find((c) => c.id === selectedId) || null
  }, [conversations, selectedId, overrideConversation])

  // Notifications/title only make sense against the always-active, unfiltered inbox —
  // not whatever search/archived view happens to be open right now.
  const { data: allConversationsRes } = useGetWhatsAppConversationsQuery({}, { skip: !connected, pollingInterval: 20000 })
  const allConversations = useMemo(
    () => (Array.isArray(allConversationsRes?.data) ? allConversationsRes.data : []),
    [allConversationsRes?.data],
  )
  useWhatsAppNotifications(allConversations, selectedId)
  useWhatsAppTitleBadge(allConversations)

  const [createConversation, { isLoading: startingNewChat }] = useCreateWhatsAppConversationMutation()

  function selectConversation(id) {
    setOverrideConversation(null)
    setSearchParams(id ? { conversationId: id } : {}, { replace: true })
  }

  function openStarredMessage(message) {
    setOverrideConversation(message.conversation)
    setStarredOpen(false)
    setShowArchived(false)
    setSearch('')
    setSearchParams({ conversationId: message.conversation.id, jumpMessageId: message.id }, { replace: true })
  }

  async function handleStartNewChat(phoneNumber) {
    try {
      const res = await createConversation({ phoneNumber }).unwrap()
      setSearch('')
      selectConversation(res?.data?.id)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start conversation')
    }
  }

  // Keyboard shortcuts: Ctrl/Cmd+K focus search, Esc closes the open thread,
  // arrow keys move between conversations — the latter two skip while typing.
  useEffect(() => {
    function handleKeyDown(e) {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (isEditableTarget(document.activeElement)) return
      if (e.key === 'Escape' && selectedId) {
        selectConversation(null)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!conversations.length) return
        e.preventDefault()
        const currentIndex = conversations.findIndex((c) => c.id === selectedId)
        const nextIndex =
          e.key === 'ArrowDown'
            ? Math.min(currentIndex + 1, conversations.length - 1)
            : Math.max(currentIndex - 1, 0)
        selectConversation(conversations[Math.max(nextIndex, 0)]?.id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedId])

  if (loadingSettings) return <PageShell fullWidth />

  return (
    <PageShell fullWidth>
      <div className="lf-wa-theme h-full px-2 py-2.5 lg:px-3">
        <section className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          {!connected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: 'var(--wa-green)' }}>
                <WhatsAppIcon className="h-7 w-7 text-white" />
              </div>
              <p className="max-w-md text-sm font-semibold text-ink">Connect WhatsApp Business API</p>
              <p className="max-w-lg text-sm text-ink-muted">
                Connect your company's WhatsApp Business number in Integrations to send, receive, and store WhatsApp
                messages here.
              </p>
              <button
                type="button"
                className="h-10 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-colors"
                style={{ backgroundColor: 'var(--wa-accent)' }}
                onClick={() => navigate('/integrations')}
              >
                Open Integrations
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className={selectedConversation ? 'hidden lg:flex' : 'flex'}>
                <WhatsAppSidebar
                  conversations={conversations}
                  loading={isFetching}
                  search={search}
                  onSearchChange={setSearch}
                  selectedId={selectedId}
                  onSelect={selectConversation}
                  onStartNewChat={handleStartNewChat}
                  startingNewChat={startingNewChat}
                  showArchived={showArchived}
                  onToggleArchived={setShowArchived}
                  onOpenStarred={() => setStarredOpen(true)}
                  searchInputRef={searchInputRef}
                />
              </div>
              {selectedConversation ? (
                <WhatsAppThreadPane
                  key={selectedConversation.id}
                  conversation={selectedConversation}
                  onBack={() => selectConversation(null)}
                  initialJumpMessageId={jumpMessageId}
                />
              ) : (
                <div className="lf-wa-chat-bg hidden flex-1 flex-col items-center justify-center gap-3 text-center lg:flex">
                  <div className="grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: 'var(--wa-panel)' }}>
                    <WhatsAppIcon className="h-9 w-9 text-[var(--wa-green)]" />
                  </div>
                  <p className="text-base font-medium text-ink">WhatsApp Business</p>
                  <p className="max-w-xs text-xs text-ink-muted">Select a conversation from the list to view messages, or search a number to start a new one.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {starredOpen ? <StarredMessagesPanel onClose={() => setStarredOpen(false)} onOpenMessage={openStarredMessage} /> : null}
    </PageShell>
  )
}
