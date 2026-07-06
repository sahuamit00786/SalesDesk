import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { setActiveCopilotSession } from '@/features/copilot/copilotSlice'
import {
  useCreateCopilotSessionMutation,
  useDeleteCopilotSessionMutation,
  useListCopilotSessionsQuery,
} from '@/features/copilot/copilotApi'
import { CopilotSessionList } from '@/features/copilot/components/CopilotSessionList'
import { CopilotConversation } from '@/features/copilot/components/CopilotConversation'

export function CopilotPage() {
  const dispatch = useDispatch()
  const activeSessionId = useSelector((s) => s.copilot.activeSessionId)

  const { data: sessionsRes, isSuccess: sessionsLoaded, isFetching: sessionsFetching } = useListCopilotSessionsQuery()
  const [createSession, { isLoading: creatingSession }] = useCreateCopilotSessionMutation()
  const [deleteSession] = useDeleteCopilotSessionMutation()

  const sessions = sessionsRes?.data || []

  useEffect(() => {
    // Drop a stale pointer to a session that was deleted (otherwise the
    // conversation pane keeps rendering a chat that no longer exists).
    // Guard on !fetching so the brief empty window after creating a new chat
    // (before the list refetch lands) doesn't wipe the just-selected session.
    if (activeSessionId && sessionsLoaded && !sessionsFetching && !sessions.some((s) => s.id === activeSessionId)) {
      dispatch(setActiveCopilotSession(null))
      return
    }
    if (!activeSessionId && sessions.length) {
      dispatch(setActiveCopilotSession(sessions[0].id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, activeSessionId, sessionsLoaded, sessionsFetching])

  async function handleNewChat() {
    try {
      const res = await createSession().unwrap()
      dispatch(setActiveCopilotSession(res.data.id))
    } catch {
      toast.error('Could not start a new chat')
    }
  }

  async function handleDelete(sessionId) {
    try {
      await deleteSession(sessionId).unwrap()
      if (sessionId === activeSessionId) dispatch(setActiveCopilotSession(null))
    } catch {
      toast.error('Could not delete conversation')
    }
  }

  return (
    <PageShell fullWidth>
      <div className="h-full px-2 py-2.5 lg:px-3">
        <section className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          <div className="grid min-h-0 flex-1 divide-y divide-surface-border lg:grid-cols-[minmax(260px,28%)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
            <CopilotSessionList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={(id) => dispatch(setActiveCopilotSession(id))}
              onNew={handleNewChat}
              onDelete={handleDelete}
              creatingNew={creatingSession}
            />
            <CopilotConversation sessionId={activeSessionId} />
          </div>
        </section>
      </div>
    </PageShell>
  )
}
