import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function LiveTranscriptPanel({ meetingId }) {
  const [lines, setLines] = useState([])
  const bottomRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || '', {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })
    socketRef.current = socket

    socket.emit('join_room', meetingId)
    socket.on('transcript_update', (chunk) => {
      setLines((prev) => [...prev, chunk])
    })

    return () => {
      socket.off('transcript_update')
      socket.disconnect()
    }
  }, [meetingId])

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="border rounded-xl p-4 h-full">
      <h3 className="font-semibold mb-4">Live Transcript</h3>
      <div className="space-y-3 overflow-auto h-[500px]">
        {lines.length === 0 && (
          <p className="text-sm text-gray-400">Waiting for transcript…</p>
        )}
        {lines.map((item, i) => (
          <div
            key={`${i}-${String(item.text || '').slice(0, 12)}`}
            className="bg-slate-50 rounded-lg p-3"
          >
            <p className="text-xs text-gray-400">{item.speaker}</p>
            <p>{item.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
