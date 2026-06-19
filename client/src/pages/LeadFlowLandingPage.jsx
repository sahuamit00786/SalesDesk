import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { SmoothScrollProvider } from '@/features/leadflow-landing/SmoothScrollProvider'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { LandingNav } from '@/features/leadflow-landing/components/LandingNav'
import { HeroSection } from '@/features/leadflow-landing/sections/HeroSection'
import { StatsStripSection } from '@/features/leadflow-landing/sections/StatsStripSection'
import { ScreenshotShowcaseSection } from '@/features/leadflow-landing/sections/ScreenshotShowcaseSection'
import { FeaturesSection } from '@/features/leadflow-landing/sections/FeaturesSection'
import { AutomationSection } from '@/features/leadflow-landing/sections/AutomationSection'
import { ModulesMarquee } from '@/features/leadflow-landing/sections/ModulesMarquee'
import { FaqSection } from '@/features/leadflow-landing/sections/FaqSection'
import { ContactCtaSection } from '@/features/leadflow-landing/sections/ContactCtaSection'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'

export function LeadFlowLandingPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const prev = document.title
    document.title = 'LeadNest — Lead management, pipeline, and team workspace'
    let meta = document.querySelector('meta[name="description"]')
    let created = false
    const desc =
      'LeadFlow CRM: full lifecycle lead management with pipeline, email inbox, workflow automation, campaigns, quotations, invoices, HR, and team roles.'
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
      <div className="leadflow-landing min-h-screen bg-white text-[#0a0714]">
        <LandingNav />
        <main>
          <HeroSection />
          <StatsStripSection />
          <ScreenshotShowcaseSection />
          <FeaturesSection />
          <AutomationSection />
          <ModulesMarquee />
          <FaqSection />
          <ContactCtaSection />
        </main>
        <FooterSection />
      </div>
    </SmoothScrollProvider>
  )
}
