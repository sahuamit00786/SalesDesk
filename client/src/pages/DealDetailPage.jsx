import { useParams, useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonDetail } from '@/components/shared/SkeletonLoader'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { useGetDealQuery } from '@/features/deals/dealsApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

export function DealDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useGetDealQuery(id, { skip: !id })
  const deal = data?.data
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const opportunityStages = formMetaData?.data?.opportunityStages || []
  const dealStatuses = rawDealStatuses.length
    ? [...rawDealStatuses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : opportunityStages

  if (!id) {
    return (
      <PageShell>
        <p className="p-8 text-sm text-neutral-500">Missing deal id.</p>
      </PageShell>
    )
  }

  return (
    <PageShell flush fullWidth mainClassName="bg-white">
      {isLoading && !deal ? <div className="p-6"><SkeletonDetail /></div> : null}
      {!isLoading && (isError || !deal) ? (
        <p className="p-8 text-sm text-neutral-600">Deal not found or you do not have access.</p>
      ) : null}
      {deal ? (
        <DealDetailPanel
          open
          onClose={() => navigate('/deals')}
          opp={deal}
          opportunityStages={dealStatuses}
        />
      ) : null}
    </PageShell>
  )
}
