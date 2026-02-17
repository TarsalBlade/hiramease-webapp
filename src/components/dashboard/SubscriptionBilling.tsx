import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Calendar, AlertTriangle, Gift, Clock, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PaymentForm, PaymentHistory } from '../payment';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_php: number;
  max_applications_per_month: number;
  max_users: number;
  features: Record<string, boolean>;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  trial_ends_at?: string;
  trial_used?: boolean;
  current_period_start: string;
  current_period_end: string;
  plan?: SubscriptionPlan;
}

export function SubscriptionBilling() {
  const { profile, subscription: subStatus, refreshSubscription } = useAuth();
  const [dbSubscription, setDbSubscription] = useState<TenantSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [paymentReturnStatus, setPaymentReturnStatus] = useState<'checking' | 'success' | 'cancelled' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get('payment');

    if (paymentParam === 'success') {
      setPaymentReturnStatus('checking');
      pollForPaymentCompletion();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentParam === 'cancelled') {
      setPaymentReturnStatus('cancelled');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setPaymentReturnStatus(null), 5000);
    }
  }, []);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadData();
    }
  }, [profile?.tenant_id]);

  const pollForPaymentCompletion = async () => {
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      attempts++;

      await refreshSubscription();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('tenant_id', profile?.tenant_id || '')
        .maybeSingle();

      if (sub?.status === 'active') {
        setPaymentReturnStatus('success');
        await loadData();
        setTimeout(() => setPaymentReturnStatus(null), 6000);
        return;
      }

      const { data: latestPayment } = await supabase
        .from('paymongo_payments')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPayment?.status === 'succeeded') {
        setPaymentReturnStatus('success');
        await refreshSubscription();
        await loadData();
        setTimeout(() => setPaymentReturnStatus(null), 6000);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, 3000);
      } else {
        setPaymentReturnStatus('success');
        await loadData();
        setTimeout(() => setPaymentReturnStatus(null), 6000);
      }
    };

    poll();
  };

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    setError('');

    try {
      const [subsResult, plansResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*, plan:subscription_plans(*)')
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle(),
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_php'),
      ]);

      if (subsResult.data) {
        setDbSubscription(subsResult.data as TenantSubscription);
      }

      if (plansResult.data) {
        setPlans(plansResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const getDaysLeft = () => {
    if (!dbSubscription?.trial_ends_at) return 0;
    const now = new Date();
    const trialEnd = new Date(dbSubscription.trial_ends_at);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isOnTrial = subStatus?.status === 'trial';
  const isTrialExpired = subStatus?.status === 'expired';
  const daysLeft = getDaysLeft();

  return (
    <div className="space-y-6">
      {paymentReturnStatus === 'checking' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div>
              <p className="text-blue-700 font-medium">Verifying your payment...</p>
              <p className="text-blue-600 text-sm mt-0.5">
                This may take a moment. Please don't close this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentReturnStatus === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-700 font-medium">Payment received!</p>
              <p className="text-green-600 text-sm mt-0.5">
                Your subscription has been activated. Thank you for your payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentReturnStatus === 'cancelled' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-yellow-700 font-medium">Payment cancelled</p>
              <p className="text-yellow-600 text-sm mt-0.5">
                Your payment was cancelled. You can try again anytime.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isOnTrial && daysLeft <= 3 && daysLeft > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-600 font-medium">Trial Ending Soon</p>
              <p className="text-yellow-600 text-sm mt-1">
                Your free trial expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Subscribe now to continue using the platform without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {isTrialExpired && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 font-medium">Trial Expired</p>
              <p className="text-red-600 text-sm mt-1">
                Your free trial has expired. Please subscribe to a plan to continue using the platform.
              </p>
            </div>
          </div>
        </div>
      )}

      {dbSubscription && (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Subscription</h3>
              <p className="text-2xl font-bold text-blue-600">{dbSubscription.plan?.name}</p>
              <p className="text-gray-600 mt-1">{dbSubscription.plan?.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              dbSubscription.status === 'active' ? 'bg-green-100 text-green-700' :
              dbSubscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
              dbSubscription.status === 'expired' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {dbSubscription.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Applications/Month</span>
              </div>
              <p className="text-2xl font-bold">{dbSubscription.plan?.max_applications_per_month}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Max Users</span>
              </div>
              <p className="text-2xl font-bold">{dbSubscription.plan?.max_users}</p>
            </div>
          </div>

          {isOnTrial && dbSubscription.trial_ends_at && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">Free Trial</span>
                </div>
                <span className="text-sm text-blue-700">
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Trial ends on {new Date(dbSubscription.trial_ends_at).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {dbSubscription.status === 'active' && dbSubscription.current_period_end && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Current period ends on {new Date(dbSubscription.current_period_end).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = dbSubscription?.plan_id === plan.id;
            const showUpgradeButton = dbSubscription && dbSubscription.plan_id !== plan.id;
            const isDisabled = isTrialExpired && isCurrent;

            return (
              <div
                key={plan.id}
                className={`border-2 rounded-lg p-6 ${
                  isCurrent ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold">P{plan.price_php.toLocaleString()}</span>
                  <span className="text-gray-600">/month</span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{plan.max_applications_per_month} applications/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Up to {plan.max_users} users</span>
                  </div>
                  {plan.features && Object.entries(plan.features).map(([key, value]) => (
                    value ? (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ) : null
                  ))}
                </div>

                {isCurrent && !isDisabled ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    {showUpgradeButton ? 'Switch Plan' : 'Subscribe Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <PaymentHistory />
      </div>

      {showPaymentForm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Subscribe to {selectedPlan.name}</h2>
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setSelectedPlan(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                x
              </button>
            </div>
            <div className="p-6">
              <PaymentForm
                amount={selectedPlan.price_php}
                description={`${selectedPlan.name} Plan - Monthly Subscription`}
                planId={selectedPlan.id}
                tenantId={profile?.tenant_id || ''}
                onError={(err) => setError(err)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
