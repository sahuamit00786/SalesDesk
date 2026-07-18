import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from '@/components/ui/icons'
import { useGetCampaignQuery } from '@/features/campaigns/campaignsApi'
import { CampaignReport } from '@/features/campaigns/components/CampaignReport'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonDetail } from '@/components/shared/SkeletonLoader'

export function CampaignReportPage() {
  const { id } = useParams()
  const { data: campRes, isLoading } = useGetCampaignQuery(id, { skip: !id })
  const campaign = campRes?.data

  return (
    <PageShell fullWidth mainClassName="border-t border-surface-border px-5 pb-10 pt-3">
      <div className="w-full">
        <div className="mt-4 flex items-center gap-3">
          <Link
            to={`/campaigns/${id}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-brand-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaign
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-4"><SkeletonDetail /></div>
        ) : (
          <>
            <div className="mt-4">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
                {campaign?.name || 'Campaign'} — Report
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Full payment and performance breakdown for this campaign.
              </p>
            </div>
            <CampaignReport campaignId={id} currency={campaign?.currency} />
          </>
        )}
      </div>
    </PageShell>
  )
}
