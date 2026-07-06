import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { ArrowUp, BarChart3, CalendarClock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { copilotApi, useGetCopilotSessionMessagesQuery, useSendCopilotMessageMutation } from '@/features/copilot/copilotApi'
import { useCopilotSocket } from '@/features/copilot/useCopilotSocket'
import { MessageBubble } from './MessageBubble'

const SUGGESTIONS = [
  { icon: Users, label: 'Show active campaigns', text: 'Show active campaigns' },
  { icon: TrendingUp, label: 'Best conversion rate', text: 'Which sales users have the best conversion rate?' },
  { icon: CalendarClock, label: "Today's follow-ups", text: "Show today's follow-ups" },
  { icon: BarChart3, label: 'Leads by source', text: 'Break down my leads by source as a chart' },
]

export function CopilotConversation({ sessionId }) {
  const dispatch = useDispatch()
  const [inputText, setInputText] = useState('')
  const [pendingUserText, setPendingUserText] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const [sendMessage] = useSendCopilotMessageMutation()
  const { data: history, refetch: refetchMessages } = useGetCopilotSessionMessagesQuery(sessionId, { skip: !sessionId })

  const { streamingText, liveBlocks, isStreaming, socketError, resetTurn } = useCopilotSocket({
    sessionId,
    enabled: Boolean(sessionId),
  })

  // Reset per-session UI state when switching conversations.
  useEffect(() => {
    setPendingUserText(null)
    setIsSending(false)
  }, [sessionId])

  const wasStreamingRef = useRef(false)
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      refetchMessages()
      resetTurn()
      setPendingUserText(null)
      setIsSending(false)
      // First turn names the session server-side — refresh the sidebar so the
      // new title and ordering show up.
      dispatch(copilotApi.util.invalidateTags(['CopilotSession']))
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming, refetchMessages, resetTurn, dispatch])

  useEffect(() => {
    if (socketError) {
      setPendingUserText(null)
      setIsSending(false)
    }
  }, [socketError])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, streamingText, liveBlocks, pendingUserText])

  const messages = history?.data || []
  const disambiguationBlock = liveBlocks.find((b) => b.type === 'disambiguation')
  const isBusy = isSending || isStreaming
  const isEmpty = !messages.length && !pendingUserText && !streamingText && !isStreaming

  function sendText(text) {
    const trimmed = text.trim()
    if (!trimmed || !sessionId || isBusy) return
    setInputText('')
    setPendingUserText(trimmed)
    setIsSending(true)
    sendMessage({ sessionId, text: trimmed })
  }

  function handleSelectDisambiguation(option) {
    if (!disambiguationBlock || !sessionId || isBusy) return
    setPendingUserText(`Selected: ${option.label}`)
    setIsSending(true)
    sendMessage({
      sessionId,
      selection: {
        entityType: option.entityType,
        nameQuery: disambiguationBlock.nameQuery,
        selectedId: option.id,
        selectedLabel: option.label,
      },
    })
  }

  if (!sessionId) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Sparkles className="h-7 w-7" />
        </span>
        <p className="max-w-xs text-sm text-ink-muted">Start a new chat to ask about your CRM data.</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-gradient-to-b from-surface-muted/40 to-white">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {isEmpty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/25">
              <Sparkles className="h-8 w-8" />
            </span>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">How can I help you today?</h2>
              <p className="text-sm text-ink-muted">Ask about leads, deals, campaigns, or your team performance.</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => sendText(text)}
                  className="group flex items-center gap-3 rounded-2xl border border-surface-border bg-white/80 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{label}</span>
                    <span className="block truncate text-xs text-ink-faint">{text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} blocks={m.blocks} />
            ))}

            {pendingUserText ? <MessageBubble role="user" content={pendingUserText} /> : null}

            {(streamingText || liveBlocks.length > 0) && (
              <MessageBubble
                role="assistant"
                content={streamingText}
                blocks={liveBlocks.length ? liveBlocks : streamingText ? [{ type: 'text', markdown: streamingText }] : []}
                onSelectDisambiguation={handleSelectDisambiguation}
                disambiguationDisabled={isBusy}
              />
            )}

            {isSending && !isStreaming && !streamingText && !liveBlocks.length && (
              <div className="flex items-center gap-2 px-1 text-sm text-ink-muted">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
                </span>
                Thinking…
              </div>
            )}

            {socketError ? <p className="px-1 text-xs text-danger">{socketError}</p> : null}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 sm:px-8">
        <div className="w-full">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
              <button
                key={label}
                type="button"
                onClick={() => sendText(text)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-surface-border bg-white p-2 shadow-sm transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendText(inputText)
                }
              }}
              placeholder="Ask the copilot anything…"
              disabled={isBusy}
              rows={1}
              className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => sendText(inputText)}
              disabled={isBusy || !inputText.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary,#5B21B6)] text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-ink-faint">Copilot can make mistakes. Verify important data.</p>
        </div>
      </div>
    </div>
  )
}
