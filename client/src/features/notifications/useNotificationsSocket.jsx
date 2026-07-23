import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useSelector, useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { SOCKET_URL } from '@/config'
import { readAuthFromStorage } from '@/features/auth/authSlice'
import { notificationsApi } from '@/features/notifications/notificationsApi'

/**
 * Web realtime notifications — the browser counterpart of the mobile
 * RealtimeProvider. Mount ONCE in the authed app shell (Topbar hosts the bell
 * and is always mounted while authed):
 *
 *   function Topbar() {
 *     useNotificationsSocket()
 *     ...
 *   }
 *
 * Guarantees:
 *  - Server emits ONLY to the recipient's private room → every event here is
 *    for the signed-in user.
 *  - `notification:new` → clickable toast that routes to notification.link, and
 *    invalidates the RTK Query Notification LIST + UNREAD_COUNT tags so the bell
 *    badge + notification center refresh instantly (same tags mark-read uses).
 *  - Fresh token on every (re)connect; polling stays as the fallback.
 */

function resolveAccessToken(reduxToken) {
  return reduxToken || readAuthFromStorage().accessToken || null
}

export function useNotificationsSocket() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const reduxToken = useSelector((s) => s.auth?.accessToken)
  const token = resolveAccessToken(reduxToken)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return undefined

    const socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: resolveAccessToken(reduxToken) }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    })
    socketRef.current = socket

    const invalidate = () =>
      dispatch(
        notificationsApi.util.invalidateTags([
          { type: 'Notification', id: 'LIST' },
          { type: 'Notification', id: 'UNREAD_COUNT' },
          { type: 'Notification', id: 'SUMMARY' },
        ]),
      )

    const onNew = (n) => {
      invalidate()
      const title = n?.title || 'Notification'
      const body = n?.message ? `${title} — ${n.message}` : title
      // Clickable toast: tap routes to the entity via the web route in n.link.
      toast.custom(
        (t) => (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id)
              if (n?.link) navigate(n.link)
            }}
            className="max-w-sm rounded-xl bg-ink px-4 py-3 text-left text-sm text-white shadow-lg"
          >
            {body}
          </button>
        ),
        { id: n?.id || undefined, duration: 4000 },
      )
    }

    socket.on('notification:new', onNew)
    socket.on('notification:badge', invalidate)

    return () => {
      socket.off('notification:new', onNew)
      socket.off('notification:badge', invalidate)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, reduxToken, dispatch, navigate])
}
