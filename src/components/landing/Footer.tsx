import { Shield, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HiramEase</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Trust-focused secured lending platform for Philippine lending companies.
            </p>
            <div className="space-y-2">
              <a href="mailto:support@hiramease.ph" className="flex items-center gap-2 text-sm hover:text-primary-400 transition-colors">
                <Mail className="w-4 h-4" />
                support@hiramease.ph
              </a>
              <a href="tel:+639123456789" className="flex items-center gap-2 text-sm hover:text-primary-400 transition-colors">
                <Phone className="w-4 h-4" />
                +63 912 345 6789
              </a>
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Manila, Philippines
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-primary-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary-400 transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-primary-400 transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">API Documentation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Data Processing Agreement</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="py-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {currentYear} HiramEase. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span>Data Privacy Act (RA 10173) Compliant</span>
            <span className="text-gray-700">|</span>
            <span>SEC/DTI Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
