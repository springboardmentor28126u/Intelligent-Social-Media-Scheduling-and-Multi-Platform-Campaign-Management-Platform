import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import PlatformSection from '@/components/landing/PlatformSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ProductExperience from '@/components/landing/ProductExperience';
import HowItWorks from '@/components/landing/HowItWorks';
import CampaignSection from '@/components/landing/CampaignSection';
import CalendarSection from '@/components/landing/CalendarSection';
import AnalyticsSection from '@/components/landing/AnalyticsSection';
import AccountConnectionSection from '@/components/landing/AccountConnectionSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50">
      <LandingNav />
      <main>
        <Hero />
        <PlatformSection />
        <FeaturesSection />
        <ProductExperience />
        <HowItWorks />
        <CampaignSection />
        <CalendarSection />
        <AnalyticsSection />
        <AccountConnectionSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
