import { useState, useEffect } from 'react';
import { Package, Pencil, X, Check, Loader2, Users, FileText, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SubscriptionPlan } from '../../types/database';

interface EditingPlan {
  id: string;
  price_php: string;
  description: string;
  max_applications_per_month: string;
  max_users: string;
}

export function SubscriptionPlanManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function loadPlans() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_php');

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }

  function startEditing(plan: SubscriptionPlan) {
    setEditingPlan({
      id: plan.id,
      price_php: plan.price_php.toString(),
      description: plan.description || '',
      max_applications_per_month: plan.max_applications_per_month.toString(),
      max_users: plan.max_users.toString(),
    });
    setError('');
  }

  function cancelEditing() {
    setEditingPlan(null);
    setError('');
  }

  async function saveChanges() {
    if (!editingPlan) return;

    const price = parseFloat(editingPlan.price_php);
    const maxApps = parseInt(editingPlan.max_applications_per_month);
    const maxUsers = parseInt(editingPlan.max_users);

    if (isNaN(price) || price < 0) {
      setError('Price must be a valid positive number.');
      return;
    }
    if (isNaN(maxApps) || maxApps < 1) {
      setError('Max applications must be at least 1.');
      return;
    }
    if (isNaN(maxUsers) || maxUsers < 1) {
      setError('Max users must be at least 1.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('subscription_plans')
      .update({
        price_php: price,
        description: editingPlan.description,
        max_applications_per_month: maxApps,
        max_users: maxUsers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingPlan.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      const plan = plans.find(p => p.id === editingPlan.id);
      setSuccessMessage(`${plan?.name || 'Plan'} updated successfully. New subscribers will be charged the updated price.`);
      setEditingPlan(null);
      await loadPlans();
    }
    setSaving(false);
  }

  async function togglePlanActive(plan: SubscriptionPlan) {
    const { error: updateError } = await supabase
      .from('subscription_plans')
      .update({
        is_active: !plan.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccessMessage(`${plan.name} has been ${plan.is_active ? 'deactivated' : 'activated'}.`);
      await loadPlans();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Changes to pricing will apply to new subscriptions. Existing subscribers are not affected until their next billing cycle.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {plans.map((plan) => {
          const isEditing = editingPlan?.id === plan.id;
          const featureList = plan.features ? Object.entries(plan.features).filter(([, v]) => v).map(([k]) => k) : [];

          return (
            <div
              key={plan.id}
              className={`card transition-all duration-200 ${
                !plan.is_active ? 'opacity-60' : ''
              } ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      plan.name.toLowerCase().includes('starter')
                        ? 'bg-blue-100 text-blue-600'
                        : plan.name.toLowerCase().includes('professional')
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        {!plan.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {!isEditing && (
                        <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePlanActive(plan)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title={plan.is_active ? 'Deactivate plan' : 'Activate plan'}
                    >
                      {plan.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEditing}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveChanges}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(plan)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Description</label>
                      <input
                        type="text"
                        value={editingPlan.description}
                        onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="label">Monthly Price (PHP)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">P</span>
                        <input
                          type="number"
                          value={editingPlan.price_php}
                          onChange={(e) => setEditingPlan({ ...editingPlan, price_php: e.target.value })}
                          className="input-field pl-8"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Max Applications / Month</label>
                      <input
                        type="number"
                        value={editingPlan.max_applications_per_month}
                        onChange={(e) => setEditingPlan({ ...editingPlan, max_applications_per_month: e.target.value })}
                        className="input-field"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="label">Max Users</label>
                      <input
                        type="number"
                        value={editingPlan.max_users}
                        onChange={(e) => setEditingPlan({ ...editingPlan, max_users: e.target.value })}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Monthly Price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        P{Number(plan.price_php).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{plan.max_applications_per_month}</p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Users</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{plan.max_users}</p>
                      <p className="text-xs text-gray-500">max allowed</p>
                    </div>
                  </div>
                )}

                {featureList.length > 0 && !isEditing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {featureList.map((feature) => (
                        <span
                          key={feature}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full capitalize"
                        >
                          {feature.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No subscription plans found.</p>
        </div>
      )}
    </div>
  );
}
