import { Building2, Users2, Banknote } from 'lucide-react';

export function WhoItsFor() {
  const audiences = [
    {
      icon: <Building2 className="w-10 h-10" />,
      title: 'Small Lending Companies',
      description: 'Streamline your lending operations without the overhead of enterprise solutions. Perfect for growing portfolios.',
      benefits: ['Easy onboarding', 'Affordable pricing', 'Quick implementation'],
    },
    {
      icon: <Users2 className="w-10 h-10" />,
      title: 'Cooperatives',
      description: 'Serve your members better with efficient credit evaluation while maintaining your cooperative values.',
      benefits: ['Member-focused workflows', 'Transparent processes', 'Community compliance'],
    },
    {
      icon: <Banknote className="w-10 h-10" />,
      title: 'Microfinance Institutions',
      description: 'Reach more borrowers with faster processing times while maintaining rigorous risk assessment.',
      benefits: ['High-volume processing', 'Risk segmentation', 'Inclusive lending support'],
    },
  ];

  return (
    <section id="who-its-for" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Who It's For
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built specifically for Philippine lending institutions
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <div key={index} className="card p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 mb-6">
                {audience.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{audience.title}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{audience.description}</p>
              <ul className="space-y-2">
                {audience.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
