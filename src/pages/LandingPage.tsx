import {
  Header,
  HeroSection,
  TrustStrip,
  HowItWorks,
  Features,
  WhoItsFor,
  DashboardPreview,
  Pricing,
  CTASection,
  Footer,
} from '../components/landing';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function LandingPage({ onLoginClick, onSignUpClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={onLoginClick} onSignUpClick={onSignUpClick} />
      <main>
        <HeroSection onStartTrialClick={onSignUpClick} onDemoClick={onLoginClick} />
        <TrustStrip />
        <HowItWorks />
        <Features />
        <WhoItsFor />
        <DashboardPreview />
        <Pricing onSelectPlan={onSignUpClick} />
        <CTASection onGetStarted={onSignUpClick} />
      </main>
      <Footer />
    </div>
  );
}
