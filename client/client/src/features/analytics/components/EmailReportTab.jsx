import { EmailTrackingReportsPage } from '@/pages/EmailTrackingReportsPage'

/** Embedded email tracking report within unified reports hub */
export function EmailReportTab() {
  return (
    <div id="report-export-root" className="-mx-1">
      <EmailTrackingReportsPage embedded />
    </div>
  )
}
