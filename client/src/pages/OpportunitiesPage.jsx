import { LeadsListPage } from '@/features/leads/pages/LeadsListPage'

/** Funnel opportunities: `is_opportunity` on the lead. Deals use the Deals page (`/deals`). */
export function OpportunitiesPage() {
  return <LeadsListPage variant="opportunities" />
}
