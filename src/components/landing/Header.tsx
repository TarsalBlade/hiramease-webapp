import { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function Header({ onLoginClick, onSignUpClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HiramEase</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-primary-600 transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-primary-600 transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('who-its-for')} className="text-gray-600 hover:text-primary-600 transition-colors">
              Who It's For
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-primary-600 transition-colors">
              Pricing
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={onLoginClick} className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Login
            </button>
            <button onClick={onSignUpClick} className="btn-primary">
              Start Free Trial
            </button>
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <button onClick={() => scrollToSection('how-it-works')} className="text-left text-gray-600 hover:text-primary-600 py-2">
                How It Works
              </button>
              <button onClick={() => scrollToSection('features')} className="text-left text-gray-600 hover:text-primary-600 py-2">
                Features
              </button>
              <button onClick={() => scrollToSection('who-its-for')} className="text-left text-gray-600 hover:text-primary-600 py-2">
                Who It's For
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-left text-gray-600 hover:text-primary-600 py-2">
                Pricing
              </button>
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <button onClick={onLoginClick} className="btn-outline w-full">
                  Login
                </button>
                <button onClick={onSignUpClick} className="btn-primary w-full">
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
