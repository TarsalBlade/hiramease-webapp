import { useState } from 'react';
import { Shield, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignUpPageProps {
  onBack: () => void;
  onLogin: () => void;
  onSuccess: () => void;
  onSubscribe: () => void;
}

type SignUpStep = 'role' | 'company' | 'account' | 'consent';
type UserRole = 'lending_admin' | 'borrower' | 'super_admin';

export function SignUpPage({ onBack, onLogin, onSuccess, onSubscribe }: SignUpPageProps) {
  const { signUp, refreshProfile } = useAuth();
  const [step, setStep] = useState<SignUpStep>('role');
  const [role, setRole] = useState<UserRole>('borrower');

  const [companyName, setCompanyName] = useState('');
  const [registrationType, setRegistrationType] = useState<'DTI' | 'SEC'>('DTI');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!consentGiven) {
      setError('You must consent to data processing to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await signUp(email, password);

      if (signUpError || !authData.user) {
        throw signUpError || new Error('Sign up failed');
      }

      const userId = authData.user.id;

      if (role === 'lending_admin') {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('register_lending_company', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
          p_email: email,
          p_company_name: companyName,
          p_registration_type: registrationType,
          p_registration_number: registrationNumber,
          p_company_email: companyEmail,
          p_company_phone: companyPhone || null,
        });

        if (rpcError) throw rpcError;
        if (!rpcResult?.success) {
          throw new Error(rpcResult?.error || 'Failed to register company');
        }
      
      } else if (role === 'borrower') {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('register_borrower', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
        });

        if (rpcError) throw rpcError;
        if (!rpcResult?.success) {
          throw new Error(rpcResult?.error || 'Failed to create profile');
        }
      } else if (role === 'super_admin') {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('register_super_admin', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
        });

        if (rpcError) throw rpcError;
        if (!rpcResult?.success) {
          throw new Error(rpcResult?.error || 'Failed to create profile');
        }
      }

      const maxRetries = 10;
      let profileCreated = false;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data: checkProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (checkProfile) {
          profileCreated = true;
          break;
        }
      }

      if (!profileCreated) {
        throw new Error('Profile creation timed out. Please try logging in.');
      }

      await refreshProfile();
      if (role === 'lending_admin') {
        onSubscribe();
        return;
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      if (message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(message);
      }
      setLoading(false);
    }
  }

  function nextStep() {
    if (step === 'role') {
      setStep(role === 'lending_admin' ? 'company' : 'account');
    } else if (step === 'company') {
      setStep('account');
    } else if (step === 'account') {
      setStep('consent');
    }
  }

  function prevStep() {
    if (step === 'consent') {
      setStep('account');
    } else if (step === 'account') {
      setStep(role === 'lending_admin' ? 'company' : 'role');
    } else if (step === 'company') {
      setStep('role');
    }
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
          <h1 className="text-4xl font-bold text-white mb-4">
            Start your free trial
          </h1>
          <p className="text-primary-100 text-lg mb-8">
            Start your 14-day free trial. No credit card required. Cancel anytime.
          </p>
          <div className="space-y-4">
            {['14-day free trial', 'No credit card required', 'Cancel anytime'].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white">
                <CheckCircle className="w-5 h-5 text-primary-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-primary-200 text-sm">
          &copy; {new Date().getFullYear()} HiramEase. Data Privacy Act (RA 10173) Compliant.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={step === 'role' ? onBack : prevStep}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'role' ? 'Back to home' : 'Back'}
          </button>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HiramEase</span>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'role' && (
            <RoleSelection role={role} setRole={setRole} onNext={nextStep} onLogin={onLogin} />
          )}

          {step === 'company' && (
            <CompanyDetails
              companyName={companyName}
              setCompanyName={setCompanyName}
              registrationType={registrationType}
              setRegistrationType={setRegistrationType}
              registrationNumber={registrationNumber}
              setRegistrationNumber={setRegistrationNumber}
              companyEmail={companyEmail}
              setCompanyEmail={setCompanyEmail}
              companyPhone={companyPhone}
              setCompanyPhone={setCompanyPhone}
              onNext={nextStep}
            />
          )}

          {step === 'account' && (
            <AccountDetails
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onNext={nextStep}
            />
          )}

          {step === 'consent' && (
            <ConsentStep
              consentGiven={consentGiven}
              setConsentGiven={setConsentGiven}
              loading={loading}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleSelection({
  role,
  setRole,
  onNext,
  onLogin,
}: {
  role: UserRole;
  setRole: (role: UserRole) => void;
  onNext: () => void;
  onLogin: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-600 mb-8">
        Already have an account?{' '}
        <button onClick={onLogin} className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </button>
      </p>

      <div className="mb-8">
        <label className="label mb-3">I am a...</label>
        <div className="space-y-3">
          <button
            onClick={() => setRole('lending_admin')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              role === 'lending_admin'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-200'
            }`}
          >
            <div className="font-semibold text-gray-900 mb-1">Lending Company</div>
            <div className="text-sm text-gray-500">I want to evaluate credit applications</div>
          </button>
          <button
            onClick={() => setRole('borrower')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              role === 'borrower'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-200'
            }`}
          >
            <div className="font-semibold text-gray-900 mb-1">Borrower</div>
            <div className="text-sm text-gray-500">I want to apply for credit</div>
          </button>
          <button
            onClick={() => setRole('super_admin')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              role === 'super_admin'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-amber-200'
            }`}
          >
            <div className="font-semibold text-gray-900 mb-1">Super Admin</div>
            <div className="text-sm text-gray-500">Platform administrator access</div>
          </button>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Continue
      </button>
    </div>
  );
}

function CompanyDetails({
  companyName,
  setCompanyName,
  registrationType,
  setRegistrationType,
  registrationNumber,
  setRegistrationNumber,
  companyEmail,
  setCompanyEmail,
  companyPhone,
  setCompanyPhone,
  onNext,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  registrationType: 'DTI' | 'SEC';
  setRegistrationType: (v: 'DTI' | 'SEC') => void;
  registrationNumber: string;
  setRegistrationNumber: (v: string) => void;
  companyEmail: string;
  setCompanyEmail: (v: string) => void;
  companyPhone: string;
  setCompanyPhone: (v: string) => void;
  onNext: () => void;
}) {
  const canContinue = companyName && registrationNumber && companyEmail;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Details</h2>
      <p className="text-gray-600 mb-8">Tell us about your lending company</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onNext();
        }}
        className="space-y-5"
      >
        <div>
          <label className="label">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input-field"
            placeholder="Your Lending Company Inc."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Registration Type</label>
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value as 'DTI' | 'SEC')}
              className="input-field"
            >
              <option value="DTI">DTI</option>
              <option value="SEC">SEC</option>
            </select>
          </div>
          <div>
            <label className="label">Registration Number</label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="input-field"
              placeholder="Enter number"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Company Email</label>
          <input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            className="input-field"
            placeholder="company@example.com"
            required
          />
        </div>

        <div>
          <label className="label">Phone Number (Optional)</label>
          <input
            type="tel"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            className="input-field"
            placeholder="+63 912 345 6789"
          />
        </div>

        <button type="submit" disabled={!canContinue} className="btn-primary w-full disabled:opacity-50">
          Continue
        </button>
      </form>
    </div>
  );
}

function AccountDetails({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  onNext,
}: {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onNext: () => void;
}) {
  const canContinue = firstName && lastName && email && password && confirmPassword && password === confirmPassword;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Account</h2>
      <p className="text-gray-600 mb-8">Create your login credentials</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onNext();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
              placeholder="Juan"
              required
            />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
              placeholder="Dela Cruz"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="Create a password"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="Confirm your password"
            required
          />
        </div>

        <button type="submit" disabled={!canContinue} className="btn-primary w-full disabled:opacity-50">
          Continue
        </button>
      </form>
    </div>
  );
}

function ConsentStep({
  consentGiven,
  setConsentGiven,
  loading,
  onSubmit,
}: {
  consentGiven: boolean;
  setConsentGiven: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Privacy Consent</h2>
      <p className="text-gray-600 mb-8">In compliance with the Data Privacy Act of 2012 (RA 10173)</p>

      <div className="bg-gray-50 rounded-xl p-6 mb-6 max-h-64 overflow-y-auto text-sm text-gray-600 leading-relaxed">
        <p className="mb-4">
          By creating an account with HiramEase, you consent to the collection, processing, and storage of your personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Information We Collect:</strong> Personal identification information (name, email, phone), company information, financial documents, and other information necessary for credit evaluation.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Purpose:</strong> Your information will be used for credit evaluation, account management, compliance with regulatory requirements, and improving our services.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Data Retention:</strong> We retain your data for as long as your account is active and as required by law for audit and compliance purposes.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Your Rights:</strong> You have the right to access, correct, and request deletion of your personal data, subject to legal requirements.
        </p>
        <p>
          <strong className="text-gray-900">Security:</strong> We implement industry-standard security measures to protect your data from unauthorized access.
        </p>
      </div>

      <label className="flex items-start gap-3 mb-6">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="w-5 h-5 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the data privacy policy. I consent to the collection and processing of my personal information as described above.
        </span>
      </label>

      <button
        onClick={onSubmit}
        disabled={!consentGiven || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>
    </div>
  );
}
