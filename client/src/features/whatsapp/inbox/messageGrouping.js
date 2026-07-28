function dateLabelFor(date) {
  const now = new Date()
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Flattens messages into a render list of { kind: 'date' | 'message', ... } items —
 * a date separator whenever the calendar day changes, and consecutive
 * same-direction messages tagged isFirstInGroup/isLastInGroup for tighter spacing
 * (mirrors WhatsApp's grouped-bubble look without needing per-message avatars in a 1:1 chat).
 */
/**
 * @param {number|null} unreadDividerBeforeIndex - insert a "New messages" divider
 *   immediately before this index in `messages` (index captured once per conversation
 *   open, before markRead clears the count) — null/undefined skips it.
 * @param {number} unreadCount - shown on the divider label.
 */
export function buildMessageTimeline(messages, unreadDividerBeforeIndex, unreadCount) {
  const items = []
  let lastDateKey = null
  let lastDirection = null

  messages.forEach((message, index) => {
    const date = new Date(message.waTimestamp || message.createdAt)
    const dateKey = date.toDateString()
    if (dateKey !== lastDateKey) {
      items.push({ kind: 'date', key: `date-${dateKey}`, label: dateLabelFor(date) })
      lastDateKey = dateKey
      lastDirection = null
    }
    if (unreadDividerBeforeIndex != null && index === unreadDividerBeforeIndex && unreadCount > 0) {
      items.push({ kind: 'divider', key: 'unread-divider', count: unreadCount })
      lastDirection = null
    }
    const next = messages[index + 1]
    const isLastInGroup =
      !next || next.direction !== message.direction || new Date(next.waTimestamp || next.createdAt).toDateString() !== dateKey
    items.push({
      kind: 'message',
      key: message.id,
      message,
      isFirstInGroup: lastDirection !== message.direction,
      isLastInGroup,
    })
    lastDirection = message.direction
  })

  return items
}
