import { FileCheck, Brain, Users, Lock, ClipboardList, BarChart3 } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: <FileCheck className="w-6 h-6" />,
      title: 'Document-based Credit Evaluation',
      description: 'Structured document collection and verification process for comprehensive borrower assessment.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Explainable AI Scoring',
      description: 'Transparent risk scores with clear reasoning. Know exactly why each decision was recommended.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Human-in-the-Loop Decisions',
      description: 'AI assists, humans decide. Final credit decisions always require human approval.',
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Single-Tenant Data Isolation',
      description: 'Your data is completely isolated. No sharing, no cross-tenant access, ever.',
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      title: 'Audit Logs & Compliance',
      description: 'Complete audit trail for every action. BIR-ready exports and NPC-compliant data handling.',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Real-time Analytics',
      description: 'Monitor applications, track approvals, and analyze risk distribution at a glance.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Key Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to run a compliant, efficient lending operation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card-hover p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
