import { useState } from 'react';
import { Shield, ArrowLeft, Loader2, CheckCircle, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onLogin: () => void;
}

export function ForgotPasswordPage({ onBack, onLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Supabase appends #access_token=...&type=recovery to this URL.
    // We only need the origin — the hash is parsed automatically by the JS client.
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">HiramEase</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">Reset your password</h1>
          <p className="text-primary-100 text-lg">
            We'll send a secure link to your email so you can get back in quickly.
          </p>
        </div>
        <div className="text-primary-200 text-sm">
          &copy; {new Date().getFullYear()} HiramEase. Data Privacy Act (RA 10173) Compliant.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HiramEase</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600 mb-2">
                We sent a password reset link to
              </p>
              <p className="font-semibold text-gray-900 mb-6">{email}</p>
              <p className="text-sm text-gray-500 mb-8">
                Click the link in that email to set a new password. The link expires in 1 hour. If you don't see it, check your spam folder.
              </p>
              <button
                onClick={onLogin}
                className="btn-primary w-full"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
              <p className="text-gray-600 mb-8">
                Enter your account email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-9"
                      placeholder="you@company.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <p className="text-center mt-6 text-sm text-gray-500">
                Remembered it?{' '}
                <button onClick={onLogin} className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
