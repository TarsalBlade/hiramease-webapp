import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Building2,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { TenantLendingSettings } from '../../../types/database';

interface TenantWithSettings {
  id: string;
  company_name: string;
  registration_type: string;
  registration_number: string;
  logo_url?: string | null;
  description?: string | null;
  lending_settings?: TenantLendingSettings;
}

interface SelectTenantModalProps {
  userId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function SelectTenantModal({ userId, onClose, onComplete }: SelectTenantModalProps) {
  const [tenants, setTenants] = useState<TenantWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    const [tenantsRes, settingsRes] = await Promise.all([
      supabase.from('tenants').select('id, company_name, registration_type, registration_number, logo_url, description').eq('status', 'active'),
      supabase.from('tenant_lending_settings').select('*'),
    ]);

    const settingsMap = new Map<string, TenantLendingSettings>();
    if (settingsRes.data) {
      for (const s of settingsRes.data) {
        settingsMap.set(s.tenant_id, s as TenantLendingSettings);
      }
    }

    const combined = (tenantsRes.data || []).map((t) => ({
      ...t,
      lending_settings: settingsMap.get(t.id),
    }));

    setTenants(combined);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!selectedTenant) return;
    setSubmitting(true);

    await supabase.from('borrower_profiles').insert({
      user_id: userId,
      tenant_id: selectedTenant,
    });

    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Select Lending Company</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">Choose a lending company to apply with:</p>

          {loading ? (
            <LoadingState />
          ) : tenants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No lending companies available</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {tenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  selected={selectedTenant === tenant.id}
                  onSelect={() => setSelectedTenant(tenant.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSubmit} disabled={!selectedTenant || submitting} className="btn-primary disabled:opacity-50">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TenantCard({ tenant, selected, onSelect }: { tenant: TenantWithSettings; selected: boolean; onSelect: () => void }) {
  const s = tenant.lending_settings;

  const formatInterestType = (type: string) => {
    const map: Record<string, string> = {
      diminishing_balance: 'Diminishing',
      flat: 'Flat',
      add_on: 'Add-On',
      straight_line: 'Straight Line',
      compound: 'Compound',
    };
    return map[type] || type;
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.company_name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tenant.company_name}</p>
            <p className="text-xs text-gray-500">{tenant.registration_type} - {tenant.registration_number}</p>
            {tenant.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tenant.description}</p>
            )}
          </div>
        </div>
        {selected && (
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
        )}
      </div>
      {s && (
        <div className="mt-3 ml-13 grid grid-cols-3 gap-2">
          <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-gray-500">Interest</p>
            <p className="text-sm font-semibold text-gray-900">{s.interest_rate_annual_percent}%/yr</p>
          </div>
          <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-gray-500">Type</p>
            <p className="text-sm font-semibold text-gray-900">{formatInterestType(s.interest_type)}</p>
          </div>
          <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-gray-500">Loan Range</p>
            <p className="text-sm font-semibold text-gray-900">{(s.min_loan_amount_php / 1000).toFixed(0)}K - {(s.max_loan_amount_php / 1000).toFixed(0)}K</p>
          </div>
        </div>
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
