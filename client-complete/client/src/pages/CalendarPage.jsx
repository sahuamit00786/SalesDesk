import { PageShell } from '@/components/layout/PageShell'
import { CalendarWorkspace } from '@/features/calendar/components/CalendarWorkspace'

export default function CalendarPage() {
  return (
    <PageShell fullWidth>
      <CalendarWorkspace className="h-[calc(100vh-4rem)]" />
    </PageShell>
  )
}
