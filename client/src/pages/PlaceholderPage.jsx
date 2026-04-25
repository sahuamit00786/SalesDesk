import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sparkles } from 'lucide-react'

export function PlaceholderPage({ title, description }) {
  return (
    <PageShell title={title} description={description}>
      <EmptyState
        icon={Sparkles}
        title="Module scaffolded"
        description="This screen follows the LeadFlow layout system. Add feature routes and RTK Query endpoints here."
      />
    </PageShell>
  )
}
