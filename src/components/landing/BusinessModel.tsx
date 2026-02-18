import { useState, useEffect } from 'react';
import {
  Users, Shield, Layers, Zap,
  ArrowRight, CheckCircle, BarChart3, Globe, Smartphone, CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BusinessModelProps {
  onGetStarted: () => void;
}

export function BusinessModel({ onGetStarted }: BusinessModelProps) {
  const [plans, setPlans] = useState<{ name: string; price: number; features: string[] }[]>([]);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('name, price_php, features')
      .eq('is_active', true)
      .order('price_php', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setPlans((data as any[]).map(p => ({
            name: p.name,
            price: p.price_php,
            features: Array.isArray(p.features) ? p.features : [],
          })));
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-20 bg-gradient-to-b from-gray-900 to-gray-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-primary-500/20 text-primary-300 text-sm font-medium rounded-full mb-6">
              Business Model
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              How HiramEase Creates Value
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              A SaaS-based credit management platform that empowers Philippine lending companies
              with digital tools for loan processing, credit scoring, and portfolio management.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Revenue Model</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              HiramEase generates revenue through a tiered subscription model designed to scale with lending operations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <RevenueStream
              icon={<CreditCard className="w-6 h-6" />}
              title="Subscription Fees"
              description="Monthly recurring revenue from lending companies using the platform, with tiers based on loan volume and features."
              percentage="70%"
              color="bg-blue-100 text-blue-600"
            />
            <RevenueStream
              icon={<Zap className="w-6 h-6" />}
              title="Origination Fees"
              description="Percentage-based fees on loan disbursements processed through the platform, aligning revenue with lending volume."
              percentage="20%"
              color="bg-green-100 text-green-600"
            />
            <RevenueStream
              icon={<BarChart3 className="w-6 h-6" />}
              title="Premium Analytics"
              description="Advanced reporting, custom dashboards, and financial projections for enterprise-tier subscribers."
              percentage="10%"
              color="bg-amber-100 text-amber-600"
            />
          </div>

          {plans.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-8 mb-16">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Subscription Tiers</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-1">{plan.name}</h4>
                    <p className="text-2xl font-bold text-gray-900 mb-4">
                      PHP {Math.floor(plan.price).toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Value Proposition Canvas</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              How we solve key pain points in Philippine micro-lending operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary-600" />
                Customer Segments
              </h3>
              <div className="space-y-4">
                <SegmentItem
                  title="Micro-Lending Companies"
                  description="Small to medium lending firms registered with SEC or DTI seeking to digitize operations."
                />
                <SegmentItem
                  title="Credit Cooperatives"
                  description="Community-based lending organizations needing modern credit assessment tools."
                />
                <SegmentItem
                  title="Individual Borrowers"
                  description="Filipinos seeking accessible and transparent loan application processes."
                />
              </div>
            </div>

            <div className="card p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary-600" />
                Key Benefits
              </h3>
              <div className="space-y-4">
                <BenefitItem
                  title="Automated Credit Scoring"
                  description="AI-powered risk assessment reduces manual evaluation time by up to 80%."
                />
                <BenefitItem
                  title="Digital Document Management"
                  description="Secure cloud storage for all loan documents with verification workflows."
                />
                <BenefitItem
                  title="Real-Time Portfolio Analytics"
                  description="Live dashboards for monitoring loan performance, delinquency, and revenue."
                />
                <BenefitItem
                  title="Multi-Channel Notifications"
                  description="Email, SMS, and in-app notifications keep all parties informed."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Market Opportunity</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The Philippine micro-lending market presents significant growth potential for digital solutions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <MarketStat value="PHP 2.5T" label="Total Philippine Lending Market" />
            <MarketStat value="15,000+" label="Registered Lending Companies" />
            <MarketStat value="56%" label="Unbanked Filipino Adults" />
            <MarketStat value="35%+" label="Annual Digital Lending Growth" />
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Competitive Advantages</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <Advantage icon={<Globe className="w-6 h-6" />} title="Cloud-Based" text="No installation required, accessible anywhere" />
              <Advantage icon={<Shield className="w-6 h-6" />} title="Compliant" text="Built for Philippine lending regulations" />
              <Advantage icon={<Smartphone className="w-6 h-6" />} title="Mobile-Ready" text="Responsive design for all devices" />
              <Advantage icon={<Layers className="w-6 h-6" />} title="Multi-Tenant" text="One platform serves multiple companies" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Cost Structure</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Lean operational model leveraging cloud infrastructure for maximum efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Fixed Costs</h3>
              <div className="space-y-3">
                <CostItem label="Cloud Infrastructure (Supabase)" percentage={25} />
                <CostItem label="Development & Maintenance" percentage={35} />
                <CostItem label="Customer Support" percentage={15} />
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Variable Costs</h3>
              <div className="space-y-3">
                <CostItem label="Payment Processing (PayMongo)" percentage={10} />
                <CostItem label="SMS & Email Services" percentage={8} />
                <CostItem label="Marketing & Acquisition" percentage={7} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Lending Business?</h2>
          <p className="text-lg text-gray-400 mb-8">
            Join hundreds of Philippine lending companies already using HiramEase.
          </p>
          <button onClick={onGetStarted} className="btn-primary text-lg px-8 py-4">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 inline-block" />
          </button>
        </div>
      </section>
    </div>
  );
}

function RevenueStream({ icon, title, description, percentage, color }: {
  icon: React.ReactNode; title: string; description: string; percentage: string; color: string;
}) {
  return (
    <div className="card p-6 text-center">
      <div className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{percentage}</p>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function SegmentItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function BenefitItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function MarketStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
      <p className="text-3xl font-bold text-primary-600 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function Advantage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-white/20 mx-auto mb-3 flex items-center justify-center text-white">
        {icon}
      </div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-primary-200">{text}</p>
    </div>
  );
}

function CostItem({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
