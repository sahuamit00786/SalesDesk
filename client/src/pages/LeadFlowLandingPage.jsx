import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { useAppSelector } from '@/app/hooks'
import { LandingNav } from '@/features/leadflow-landing/components/LandingNav'
import { HeroSection } from '@/features/leadflow-landing/sections/HeroSection'
import { TrustedStripSection } from '@/features/leadflow-landing/sections/TrustedStripSection'
import { ProductPreviewSection } from '@/features/leadflow-landing/sections/ProductPreviewSection'
import { CrmFeaturesSection } from '@/features/leadflow-landing/sections/CrmFeaturesSection'
import { AiFeaturesSection } from '@/features/leadflow-landing/sections/AiFeaturesSection'
import { PipelineSection } from '@/features/leadflow-landing/sections/PipelineSection'
import { AutomationSection } from '@/features/leadflow-landing/sections/AutomationSection'
import { CollaborationSection } from '@/features/leadflow-landing/sections/CollaborationSection'
import { MobileAppSection } from '@/features/leadflow-landing/sections/MobileAppSection'
import { AnalyticsSection } from '@/features/leadflow-landing/sections/AnalyticsSection'
import { TestimonialsSection } from '@/features/leadflow-landing/sections/TestimonialsSection'
import { FaqSection } from '@/features/leadflow-landing/sections/FaqSection'
import { FinalCtaSection } from '@/features/leadflow-landing/sections/FinalCtaSection'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'

export function LeadFlowLandingPage() {
  const token = useAppSelector((s) => s.auth.accessToken)

  useEffect(() => {
    if (token) return undefined
    const prev = document.title
    document.title = 'LeadNest — AI-powered CRM for modern sales teams'
    let meta = document.querySelector('meta[name="description"]')
    let created = false
    const desc =
      'LeadNest CRM: lead management, visual pipeline, built-in email, call intelligence, WhatsApp conversations, no-code automation, and analytics — in one workspace.'
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
  }, [token])

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="leadflow-landing min-h-screen">
        <LandingNav />
        <main>
          <HeroSection />
          <TrustedStripSection />
          <ProductPreviewSection />
          <CrmFeaturesSection />
          <AiFeaturesSection />
          <PipelineSection />
          <AutomationSection />
          <CollaborationSection />
          <MobileAppSection />
          <AnalyticsSection />
          <TestimonialsSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <FooterSection />
      </div>
    </MotionConfig>
  )
}
