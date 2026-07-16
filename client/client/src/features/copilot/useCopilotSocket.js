import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useDispatch, useSelector } from 'react-redux'
import { readAuthFromStorage } from '@/features/auth/authSlice'
import { copilotApi } from '@/features/copilot/copilotApi'
import { SOCKET_URL } from '@/config'

function resolveAccessToken(reduxToken) {
  const fromStorage = readAuthFromStorage().accessToken
  const pick = (t) => {
    if (typeof t !== 'string') return ''
    const s = t.trim()
    return !s || s === 'undefined' || s === 'null' ? '' : s
  }
  return pick(reduxToken) || pick(fromStorage) || null
}

/**
 * Opens a Socket.IO connection scoped to one copilot session while the drawer
 * is open (not a global app-wide connection). Handles token-by-token streaming,
 * structured blocks, and disambiguation prompts for the active turn.
 *
 * Tokens are fed into a typewriter buffer and revealed a few characters per
 * animation frame. This keeps the "typing" effect smooth even when the network
 * delivers many tokens in a single burst (which React would otherwise batch
 * into one render, making the whole answer appear at once).
 */
export function useCopilotSocket({ sessionId, enabled }) {
  const dispatch = useDispatch()
  const reduxToken = useSelector((s) => s.auth?.accessToken)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [liveBlocks, setLiveBlocks] = useState([])
  const [socketError, setSocketError] = useState(null)
  // Bumps once per fully-completed turn. This is the authoritative "turn is
  // over" signal — it fires even for turns that stream no text tokens (e.g. a
  // pure tool-call → disambiguation reply), which `isStreaming` never covers.
  const [doneTick, setDoneTick] = useState(0)
  const socketRef = useRef(null)

  // Typewriter state (refs so the rAF loop reads the latest without re-subscribing).
  const targetRef = useRef('') // full text received from server so far
  const shownRef = useRef(0) // chars already revealed on screen
  const doneRef = useRef(false) // server signalled end-of-turn
  const finalizedRef = useRef(false) // guard so a turn is finalized only once
  const rafRef = useRef(null)

  const finalizeTurn = useCallback(() => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    setIsStreaming(false)
    setDoneTick((t) => t + 1)
  }, [])

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const pump = useCallback(() => {
    if (rafRef.current) return
    const tick = () => {
      const target = targetRef.current
      if (shownRef.current < target.length) {
        // Reveal proportionally so a big backlog catches up fast but a trickle
        // still types out character-by-character.
        const remaining = target.length - shownRef.current
        const step = Math.max(2, Math.ceil(remaining / 12))
        shownRef.current = Math.min(target.length, shownRef.current + step)
        setStreamingText(target.slice(0, shownRef.current))
        rafRef.current = requestAnimationFrame(tick)
      } else if (doneRef.current) {
        // Fully drained and server is done — end the turn.
        rafRef.current = null
        finalizeTurn()
      } else {
        // Caught up but more tokens may still arrive.
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [finalizeTurn])

  useEffect(() => {
    if (!enabled || !sessionId) return undefined

    const token = resolveAccessToken(reduxToken)
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('copilot:join', sessionId)
    })

    socket.on('copilot:token', ({ token: chunk }) => {
      setIsStreaming(true)
      targetRef.current += chunk
      pump()
    })

    socket.on('copilot:block', (block) => {
      setLiveBlocks((prev) => [...prev, block])
    })

    // First message names the chat — patch the sidebar list cache live so the
    // title appears instantly, no refetch round-trip.
    socket.on('copilot:title', ({ sessionId: sid, title }) => {
      dispatch(
        copilotApi.util.updateQueryData('listCopilotSessions', undefined, (draft) => {
          const list = draft?.data
          if (!Array.isArray(list)) return
          const row = list.find((x) => x.id === sid)
          if (row) {
            row.title = title
            row.lastMessageAt = new Date().toISOString()
          }
        }),
      )
    })

    socket.on('copilot:done', () => {
      doneRef.current = true
      // If the buffer already drained (or there was never any text — e.g. a
      // disambiguation-only reply), finalize now; otherwise let the pump loop
      // finish typing and finalize when it drains.
      if (shownRef.current >= targetRef.current.length) finalizeTurn()
      else pump()
    })

    socket.on('copilot:error', ({ message }) => {
      setSocketError(message)
      stopRaf()
      finalizeTurn()
    })

    return () => {
      socket.emit('copilot:leave', sessionId)
      socket.disconnect()
      socketRef.current = null
      stopRaf()
    }
  }, [sessionId, enabled, reduxToken, pump, stopRaf, dispatch, finalizeTurn])

  const resetTurn = useCallback(() => {
    stopRaf()
    targetRef.current = ''
    shownRef.current = 0
    doneRef.current = false
    finalizedRef.current = false
    setStreamingText('')
    setLiveBlocks([])
    setSocketError(null)
  }, [stopRaf])

  return { streamingText, liveBlocks, isStreaming, socketError, doneTick, resetTurn }
}
