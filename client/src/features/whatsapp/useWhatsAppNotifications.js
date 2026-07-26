import { useEffect, useRef } from 'react'

let audioCtx = null

/** Short synthesized ping — no bundled audio asset needed. */
function playBeep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.25)
  } catch {
    // Web Audio unavailable — silently skip, sound is a nicety not a requirement.
  }
}

function notifyDesktop(conversation) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(conversation.contactName || conversation.waPhoneNumber, {
      body: conversation.lastMessagePreview || 'New WhatsApp message',
      tag: `whatsapp-${conversation.id}`,
    })
  } catch {
    // Some browsers restrict Notification() outside a service worker — skip quietly.
  }
}

/**
 * Beeps + fires a desktop notification when a NON-muted conversation's unread
 * count increases while it isn't the one currently open. Also requests
 * Notification permission once, on first mount, if not yet decided.
 */
export function useWhatsAppNotifications(conversations, selectedId) {
  const prevUnreadRef = useRef(new Map())
  const askedPermissionRef = useRef(false)

  useEffect(() => {
    if (askedPermissionRef.current) return
    askedPermissionRef.current = true
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    for (const c of conversations) {
      const prev = prevUnreadRef.current.has(c.id) ? prevUnreadRef.current.get(c.id) : c.unreadCount
      if (c.unreadCount > prev && c.id !== selectedId && !c.isMuted) {
        playBeep()
        if (document.hidden || !document.hasFocus()) notifyDesktop(c)
      }
      prevUnreadRef.current.set(c.id, c.unreadCount)
    }
  }, [conversations, selectedId])
}

/** Reflects total unread (non-muted) chats in the browser tab title while mounted. */
export function useWhatsAppTitleBadge(conversations) {
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : '')

  useEffect(() => {
    const unread = conversations.filter((c) => !c.isMuted && c.unreadCount > 0).length
    document.title = unread > 0 ? `(${unread}) ${originalTitleRef.current}` : originalTitleRef.current
  }, [conversations])

  useEffect(() => () => {
    document.title = originalTitleRef.current
  }, [])
}
