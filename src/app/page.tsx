'use client'

import dynamic from 'next/dynamic'

// Lazy load all landing page sections for performance
const Navbar = dynamic(
  () => import('@/components/landing/navbar').then((m) => m.default)
)
const HeroSection = dynamic(
  () => import('@/components/landing/hero-section').then((m) => m.default)
)
const LogoCloud = dynamic(
  () => import('@/components/landing/logo-cloud').then((m) => m.default)
)
const FeaturesGrid = dynamic(
  () => import('@/components/landing/features-grid').then((m) => m.default)
)
const FeatureSpotlight = dynamic(
  () => import('@/components/landing/feature-spotlight').then((m) => m.default)
)
const StatsSection = dynamic(
  () => import('@/components/landing/stats-section').then((m) => m.default)
)
const TestimonialsSection = dynamic(
  () => import('@/components/landing/testimonials-section').then((m) => m.default)
)
const PricingSection = dynamic(
  () => import('@/components/landing/pricing-section').then((m) => m.default)
)
const FAQSection = dynamic(
  () => import('@/components/landing/faq-section').then((m) => m.default)
)
const CTASection = dynamic(
  () => import('@/components/landing/cta-section').then((m) => m.default)
)
const Footer = dynamic(
  () => import('@/components/landing/footer').then((m) => m.default)
)

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <Navbar />
      <HeroSection />
      <LogoCloud />
      <FeaturesGrid />
      <FeatureSpotlight />
      <StatsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
