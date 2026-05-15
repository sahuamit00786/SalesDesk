import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { SmoothScrollProvider } from '@/features/leadflow-landing/SmoothScrollProvider'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { LandingNav } from '@/features/leadflow-landing/components/LandingNav'
import { HeroSection } from '@/features/leadflow-landing/sections/HeroSection'
import { TourSection } from '@/features/leadflow-landing/sections/TourSection'
import { TrustedMarquee } from '@/features/leadflow-landing/sections/TrustedMarquee'
import { ProblemSolutionSection } from '@/features/leadflow-landing/sections/ProblemSolutionSection'
import { FeaturesSection } from '@/features/leadflow-landing/sections/FeaturesSection'
import { PipelineDemoSection } from '@/features/leadflow-landing/sections/PipelineDemoSection'
import { AutomationSection } from '@/features/leadflow-landing/sections/AutomationSection'
import { OmnichannelSection } from '@/features/leadflow-landing/sections/OmnichannelSection'
import { ReportingSection } from '@/features/leadflow-landing/sections/ReportingSection'
import { TestimonialsSection } from '@/features/leadflow-landing/sections/TestimonialsSection'
import { PricingSection } from '@/features/leadflow-landing/sections/PricingSection'
import { FaqSection } from '@/features/leadflow-landing/sections/FaqSection'
import { FinalCtaSection } from '@/features/leadflow-landing/sections/FinalCtaSection'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'

export function LeadFlowLandingPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const prev = document.title
    document.title = 'LeadFlow AI — Turn conversations into revenue'
    let meta = document.querySelector('meta[name="description"]')
    let created = false
    const desc =
      'LeadFlow AI: AI-powered lead management and CRM with omnichannel inbox, workflows, meetings, pipeline, and analytics.'
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
      created = true
    }
    const prevDesc = meta.getAttribute('content')
    meta.setAttribute('content', desc)
    return () => {
      document.title = prev
      if (created) meta.remove()
      else if (prevDesc != null) meta.setAttribute('content', prevDesc)
      else meta.removeAttribute('content')
    }
  }, [])

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <SmoothScrollProvider disabled={reduced}>
      <div className="leadflow-landing min-h-screen bg-lf-page text-lf-ink">
        <LandingNav />
        <main>
          <HeroSection />
          <TourSection />
          <TrustedMarquee />
          <ProblemSolutionSection />
          <FeaturesSection />
          <PipelineDemoSection />
          <AutomationSection />
          <OmnichannelSection />
          <ReportingSection />
          <TestimonialsSection />
          <PricingSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <FooterSection />
      </div>
    </SmoothScrollProvider>
  )
}
