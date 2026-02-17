import { FileText, Upload, Brain, UserCheck } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: <FileText className="w-8 h-8" />,
      step: '01',
      title: 'Apply',
      description: 'Borrowers submit credit applications with basic information and loan requirements.',
    },
    {
      icon: <Upload className="w-8 h-8" />,
      step: '02',
      title: 'Upload & Verify',
      description: 'Upload required documents. Your team manually verifies authenticity.',
    },
    {
      icon: <Brain className="w-8 h-8" />,
      step: '03',
      title: 'AI-Assisted Scoring',
      description: 'Our AI analyzes documents and provides explainable risk assessment.',
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      step: '04',
      title: 'Human Approval',
      description: 'Your lending officers make final decisions with full visibility.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A streamlined process that combines AI efficiency with human judgment
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="card p-6 h-full hover:shadow-lg transition-shadow duration-300">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-primary-500 mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary-200"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
