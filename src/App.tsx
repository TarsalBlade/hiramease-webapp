import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, SignUpPage } from './pages/auth';
import { SuperAdminDashboard, LendingAdminDashboard, BorrowerDashboard } from './pages/dashboard';
import { SubscribePage } from './pages/SubscribePage';
import { Loader2 } from 'lucide-react';

type AppView = 'landing' | 'login' | 'signup' | 'subscribe' | 'dashboard';

function AppContent() {
  const { user, profile, subscription, loading, refreshSubscription } = useAuth();
  const [view, setView] = useState<AppView>('landing');

  useEffect(() => {
    if (loading) return;

    if (user && profile) {
      if (
        profile.role === 'lending_admin' &&
        (!subscription || subscription.requires_subscription)
      ) {
        setView('subscribe');
      } else {
        setView('dashboard');
      }
    } else if (!user) {
      setView('landing');
    }
  }, [user, profile, subscription, loading]);

  const handleSubscriptionComplete = async () => {
    await refreshSubscription();
    setView('dashboard');
  };

  // Global loading screen
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

  // Waiting for profile to load
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

  // Login page
  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => setView('landing')}
        onSignUp={() => setView('signup')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }

  // Signup page
  if (view === 'signup') {
    return (
      <SignUpPage
        onBack={() => setView('landing')}
        onLogin={() => setView('login')}
        onSuccess={() => setView('dashboard')}
        onSubscribe={() => setView('subscribe')}
      />
    );
  }

  // Default landing page
  return (
    <LandingPage
      onLoginClick={() => setView('login')}
      onSignUpClick={() => setView('signup')}
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
