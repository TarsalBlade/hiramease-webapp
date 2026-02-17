import { ArrowRight, Shield, TrendingUp, Users, CheckCircle } from 'lucide-react';

interface HeroSectionProps {
  onStartTrialClick: () => void;
  onDemoClick: () => void;
}

export function HeroSection({ onStartTrialClick, onDemoClick }: HeroSectionProps) {
  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-b from-primary-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-primary-700 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>Philippines-compliant lending platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 text-balance">
              Trust-focused{' '}
              <span className="gradient-text">secured lending</span>{' '}
              platform
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Make faster, safer credit decisions for your lending company. AI-assisted evaluation with human oversight, built for Philippine regulations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <button onClick={onStartTrialClick} className="btn-primary group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={onDemoClick} className="btn-secondary">
                Request Demo
              </button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                14-day free trial
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Setup in minutes
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-primary-600 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/30"></div>
                  <div className="w-3 h-3 rounded-full bg-white/30"></div>
                  <div className="w-3 h-3 rounded-full bg-white/30"></div>
                  <span className="ml-4 text-white/80 text-sm">Dashboard Overview</span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <DashboardCard icon={<Users className="w-5 h-5" />} label="Applications" value="24" trend="+12%" />
                  <DashboardCard icon={<TrendingUp className="w-5 h-5" />} label="Approved" value="18" trend="+8%" />
                  <DashboardCard icon={<Shield className="w-5 h-5" />} label="Low Risk" value="67%" trend="+5%" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-medium">JD</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Juan Dela Cruz</p>
                        <p className="text-xs text-gray-500">Business Loan - PHP 250,000</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Low Risk</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-medium">MS</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Maria Santos</p>
                        <p className="text-xs text-gray-500">Personal Loan - PHP 100,000</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Medium</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-medium">RG</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Roberto Garcia</p>
                        <p className="text-xs text-gray-500">Vehicle Loan - PHP 500,000</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Low Risk</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary-200 rounded-full blur-2xl opacity-50"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-sky-200 rounded-full blur-2xl opacity-50"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-primary-600 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-xs text-green-600 font-medium">{trend}</span>
      </div>
    </div>
  );
}
