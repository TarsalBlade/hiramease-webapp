import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Zap, AlertTriangle, Loader2, ArrowRight, LogOut, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_php: number;
  max_applications_per_month: number;
  max_users: number;
  features: Record<string, boolean>;
}

interface SubscribePageProps {
  onComplete: () => void;
}

export function SubscribePage({ onComplete }: SubscribePageProps) {
  const { profile, subscription, signOut, refreshSubscription } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string>('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const isExpiredTrial = subscription?.status === 'expired' && subscription?.trial_used;

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus) {
      window.history.replaceState({}, '', window.location.pathname);
      if (paymentStatus === 'success') {
        setPaymentProcessing(true);
      } else if (paymentStatus === 'cancelled') {
        setError('Payment was cancelled. You can try again when ready.');
      }
    }
  }, []);

  useEffect(() => {
    if (!paymentProcessing || !profile?.tenant_id) return;

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts++;

      try {
        const { data } = await supabase.rpc('get_subscription_status', {
          p_tenant_id: profile.tenant_id,
        });

        if (data?.is_valid) {
          setPaymentProcessing(false);
          await refreshSubscription();
          onComplete();
          return;
        }
      } catch (e) {
        console.error('Poll error:', e);
      }

      if (attempts < maxAttempts && !cancelled) {
        setTimeout(poll, 2000);
      } else if (!cancelled) {
        setPaymentProcessing(false);
        await refreshSubscription();
        setError(
          'Payment is being confirmed. If your subscription is not activated within a few minutes, please refresh the page or contact support.'
        );
      }
    };

    const timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentProcessing, profile?.tenant_id]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_php');

      if (plansError) throw plansError;
      if (data) {
        setPlans(data);
        if (data.length > 0) {
          const professional = data.find(p => p.name.toLowerCase().includes('professional'));
          setSelectedPlan(professional || data[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!profile?.tenant_id || !selectedPlan) return;
    setActivating(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('activate_free_trial', {
        p_tenant_id: profile.tenant_id,
        p_plan_id: selectedPlan.id,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'Failed to activate trial');

      await refreshSubscription();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start your free trial');
    } finally {
      setActivating(false);
    }
  };

  const handleSubscribe = async () => {
    if (!profile?.tenant_id || !selectedPlan) return;
    setActivating(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Please log in again.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(selectedPlan.price_php * 100),
            description: `${selectedPlan.name} Plan - Monthly Subscription`,
            planId: selectedPlan.id,
            tenantId: profile.tenant_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to connect to payment service. Please try again.');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Payment service returned an unexpected response. Please try again.');
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to initiate payment');
      }
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  if (activating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {isExpiredTrial ? 'Connecting to payment service...' : 'Activating your free trial...'}
          </p>
        </div>
      </div>
    );
  }

  if (paymentProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Received</h2>
          <p className="text-gray-600 mb-6">
            We're confirming your payment and activating your subscription. This usually takes a few seconds...
          </p>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-6 py-12">
        <div className="flex justify-end mb-4">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">HiramEase</h1>
          </div>

          {isExpiredTrial ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Your Trial Has Expired
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Subscribe to a plan to continue using the platform.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Choose Your Plan
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Start your free trial with any plan. No payment required to get started.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 bg-gradient-to-r from-blue-100 to-green-100 px-6 py-3 rounded-full border-2 border-blue-200">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Free Trial -- No Credit Card Required</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-700 text-sm mt-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const isPopular = plan.name.toLowerCase().includes('professional');

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-4 ring-blue-600 scale-105'
                    : 'hover:shadow-xl hover:scale-[1.02]'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        P{plan.price_php.toLocaleString()}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    {!isExpiredTrial && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        Start with free trial
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        <strong>{plan.max_applications_per_month}</strong> applications/month
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Up to <strong>{plan.max_users}</strong> users
                      </span>
                    </div>
                    {plan.features && Object.entries(plan.features).map(([key, value]) => (
                      value ? (
                        <div key={key} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>

                  <div className={`w-full py-3 rounded-lg font-semibold text-center transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSelected ? 'Selected' : 'Select Plan'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedPlan && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={isExpiredTrial ? handleSubscribe : handleStartTrial}
              disabled={activating}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-5 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {isExpiredTrial
                  ? `Subscribe to ${selectedPlan.name} Plan`
                  : `Start Free Trial with ${selectedPlan.name} Plan`
                }
              </span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-6 text-center space-y-2">
              {isExpiredTrial ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CreditCard className="w-4 h-4" />
                  <span>You'll be redirected to complete your payment securely via PayMongo</span>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No payment required. Start using the platform immediately.
                </p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Secured by PayMongo -- PCI-DSS Compliant</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
