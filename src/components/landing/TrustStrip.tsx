import { Shield, Award, Lock, MapPin } from 'lucide-react';

export function TrustStrip() {
  const items = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Data Privacy Act',
      description: 'RA 10173 Compliant',
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'SEC / DTI Ready',
      description: 'Regulatory Aligned',
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Encrypted & Secure',
      description: 'Bank-grade Security',
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Philippines-based',
      description: 'Local Support',
    },
  ];

  return (
    <section className="py-8 bg-primary-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 text-white">
              <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                <p className="text-xs sm:text-sm text-primary-100">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
