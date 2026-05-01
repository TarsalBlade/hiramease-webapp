import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';
import { SuperAdminDashboard, LendingAdminDashboard, BorrowerDashboard } from './pages/dashboard';
import { SubscribePage } from './pages/SubscribePage';
import { BusinessModel } from './components/landing/BusinessModel';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

type AppView = 'landing' | 'login' | 'signup' | 'subscribe' | 'dashboard' | 'business_model' | 'forgot_password' | 'reset_password';

function AppContent() {
  const { user, profile, subscription, loading, refreshSubscription, refreshProfile } = useAuth();
  const [viewStack, setViewStack] = useState<AppView[]>(['landing']);
  // Tracks when the user arrived via a password-reset email link.
  // While true, auth-driven navigation must not redirect to dashboard.
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  const view = viewStack[viewStack.length - 1];

  const navigateTo = useCallback((newView: AppView) => {
    setViewStack(prev => [...prev, newView]);
  }, []);

  const goBack = useCallback(() => {
    setViewStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // PASSWORD_RECOVERY fires after Supabase parses the reset hash and establishes
  // a session. At that point the user is authenticated but should only see the
  // reset form — not be redirected to their dashboard.
  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
        setViewStack(['reset_password']);
      }
      // Once they successfully update their password, clear the recovery flag
      if (event === 'USER_UPDATED') {
        setIsRecoverySession(false);
      }
    });
    return () => authSub.unsubscribe();
  }, []);

  // Auth-driven navigation: only push, never replace existing navigation history
  useEffect(() => {
    if (loading) return;
    // Never redirect away while the user is completing a password reset
    if (isRecoverySession || view === 'reset_password') return;

    if (user && profile) {
      if (
        profile.role === 'lending_admin' &&
        (!subscription || subscription.requires_subscription)
      ) {
        setViewStack(['subscribe']);
      } else {
        setViewStack(['dashboard']);
      }
    } else if (!user) {
      // Only reset to landing if we're on a protected view
      setViewStack(prev => {
        const current = prev[prev.length - 1];
        if (['dashboard', 'subscribe'].includes(current)) return ['landing'];
        return prev;
      });
    }
  }, [user, profile, subscription, loading]);

  useEffect(() => {
    if (!loading && user && !profile) {
      const timer = setTimeout(() => {
        refreshProfile();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile]);

  const handleSubscriptionComplete = async () => {
    await refreshSubscription();
    setViewStack(['dashboard']);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if ((view === 'dashboard' || view === 'subscribe') && user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Password reset page (accessed via email link)
  if (view === 'reset_password') {
    return (
      <ResetPasswordPage
        onSuccess={() => setViewStack(['login'])}
      />
    );
  }

  // Subscription page
  if (view === 'subscribe' && user && profile) {
    return <SubscribePage onComplete={handleSubscriptionComplete} />;
  }

  // Role-based dashboard rendering
  if (view === 'dashboard' && user && profile) {
    if (profile.role === 'super_admin') {
      return <SuperAdminDashboard />;
    }
    if (profile.role === 'lending_admin') {
      return <LendingAdminDashboard />;
    }
    if (profile.role === 'borrower') {
      return <BorrowerDashboard />;
    }
    return null;
  }

  if (view === 'business_model') {
    return <BusinessModel onGetStarted={() => navigateTo('signup')} />;
  }

  // Forgot password page
  if (view === 'forgot_password') {
    return (
      <ForgotPasswordPage
        onBack={goBack}
        onLogin={() => setViewStack(['login'])}
      />
    );
  }

  // Login page
  if (view === 'login') {
    return (
      <LoginPage
        onBack={goBack}
        onSignUp={() => navigateTo('signup')}
        onSuccess={() => setViewStack(['dashboard'])}
        onForgotPassword={() => navigateTo('forgot_password')}
      />
    );
  }

  // Signup page
  if (view === 'signup') {
    return (
      <SignUpPage
        onBack={goBack}
        onLogin={() => navigateTo('login')}
        onSuccess={() => setViewStack(['dashboard'])}
        onSubscribe={() => setViewStack(['subscribe'])}
      />
    );
  }

  return (
    <LandingPage
      onLoginClick={() => navigateTo('login')}
      onSignUpClick={() => navigateTo('signup')}
      onBusinessModel={() => navigateTo('business_model')}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
