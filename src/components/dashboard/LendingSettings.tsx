import { useState, useEffect } from 'react';
import {
  Percent,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  Save,
  Info,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateLoan, formatPHP } from '../../utils/loanCalculator';
import type { TenantLendingSettings, InterestType } from '../../types/database';

export function LendingSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<TenantLendingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    interest_rate_annual_percent: '24',
    interest_type: 'diminishing_balance' as InterestType,
    min_loan_amount_php: '5000',
    max_loan_amount_php: '1000000',
    min_loan_term_months: '3',
    max_loan_term_months: '60',
    processing_fee_percent: '2',
    service_fee_percent: '0',
    insurance_fee_percent: '0',
    late_payment_penalty_percent: '3',
    max_dti_ratio_percent: '50',
  });

  useEffect(() => {
    if (profile?.tenant_id) loadSettings();
  }, [profile?.tenant_id]);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase.rpc('get_or_create_lending_settings', {
      p_tenant_id: profile?.tenant_id,
    });

    if (data) {
      const s = data as TenantLendingSettings;
      setSettings(s);
      setForm({
        interest_rate_annual_percent: s.interest_rate_annual_percent.toString(),
        interest_type: s.interest_type,
        min_loan_amount_php: s.min_loan_amount_php.toString(),
        max_loan_amount_php: s.max_loan_amount_php.toString(),
        min_loan_term_months: s.min_loan_term_months.toString(),
        max_loan_term_months: s.max_loan_term_months.toString(),
        processing_fee_percent: s.processing_fee_percent.toString(),
        service_fee_percent: s.service_fee_percent.toString(),
        insurance_fee_percent: s.insurance_fee_percent.toString(),
        late_payment_penalty_percent: s.late_payment_penalty_percent.toString(),
        max_dti_ratio_percent: s.max_dti_ratio_percent.toString(),
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!profile?.tenant_id) return;
    setSaving(true);

    const updates = {
      interest_rate_annual_percent: parseFloat(form.interest_rate_annual_percent),
      interest_type: form.interest_type,
      min_loan_amount_php: parseFloat(form.min_loan_amount_php),
      max_loan_amount_php: parseFloat(form.max_loan_amount_php),
      min_loan_term_months: parseInt(form.min_loan_term_months),
      max_loan_term_months: parseInt(form.max_loan_term_months),
      processing_fee_percent: parseFloat(form.processing_fee_percent),
      service_fee_percent: parseFloat(form.service_fee_percent),
      insurance_fee_percent: parseFloat(form.insurance_fee_percent),
      late_payment_penalty_percent: parseFloat(form.late_payment_penalty_percent),
      max_dti_ratio_percent: parseFloat(form.max_dti_ratio_percent),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('tenant_lending_settings')
      .update(updates)
      .eq('tenant_id', profile.tenant_id);

    if (!error) {
      await loadSettings();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const sampleLoan = settings
    ? calculateLoan(
        100000,
        parseFloat(form.interest_rate_annual_percent),
        12,
        form.interest_type,
        parseFloat(form.processing_fee_percent),
        parseFloat(form.service_fee_percent),
        parseFloat(form.insurance_fee_percent)
      )
    : null;

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Save className="w-5 h-5 text-green-600" />
          <p className="text-green-700 font-medium">Settings saved successfully.</p>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Interest Rate & Type</h3>
              <p className="text-sm text-gray-500">Configure your lending interest structure</p>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Edit All Settings
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  value={form.interest_rate_annual_percent}
                  onChange={(e) => setForm({ ...form, interest_rate_annual_percent: e.target.value })}
                  className="input-field"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monthly rate: {(parseFloat(form.interest_rate_annual_percent || '0') / 12).toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="label">Interest Computation Type</label>
                <select
                  value={form.interest_type}
                  onChange={(e) => setForm({ ...form, interest_type: e.target.value as InterestType })}
                  className="input-field"
                >
                  <option value="diminishing_balance">Diminishing Balance</option>
                  <option value="flat">Flat Rate</option>
                  <option value="add_on">Add-On</option>
                  <option value="straight_line">Straight Line</option>
                  <option value="compound">Compound Interest</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  {form.interest_type === 'diminishing_balance' && (
                    <p><strong>Diminishing Balance:</strong> Interest is calculated on the remaining principal. Lower total cost for the borrower. Most common for long-term loans.</p>
                  )}
                  {form.interest_type === 'flat' && (
                    <p><strong>Flat Rate:</strong> Interest is calculated on the original principal for the entire term. Simpler computation, higher effective cost to borrower.</p>
                  )}
                  {form.interest_type === 'add_on' && (
                    <p><strong>Add-On:</strong> Total interest is computed upfront and added to the principal. The sum is divided equally across the term.</p>
                  )}
                  {form.interest_type === 'straight_line' && (
                    <p><strong>Straight Line:</strong> Equal principal payments each period with interest calculated on the remaining balance. Monthly payments decrease over time.</p>
                  )}
                  {form.interest_type === 'compound' && (
                    <p><strong>Compound Interest:</strong> Interest is calculated on both the principal and previously accumulated interest. Results in higher total interest over longer terms.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <SettingDisplay label="Annual Interest Rate" value={`${settings?.interest_rate_annual_percent}%`} sub={`Monthly: ${((settings?.interest_rate_annual_percent || 0) / 12).toFixed(2)}%`} />
            <SettingDisplay label="Interest Type" value={formatInterestType(settings?.interest_type || 'diminishing_balance')} />
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loan Limits</h3>
            <p className="text-sm text-gray-500">Minimum and maximum loan parameters</p>
          </div>
        </div>

        {editing ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Min Loan Amount (PHP)</label>
              <input type="number" value={form.min_loan_amount_php} onChange={(e) => setForm({ ...form, min_loan_amount_php: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="label">Max Loan Amount (PHP)</label>
              <input type="number" value={form.max_loan_amount_php} onChange={(e) => setForm({ ...form, max_loan_amount_php: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="label">Min Loan Term (Months)</label>
              <input type="number" value={form.min_loan_term_months} onChange={(e) => setForm({ ...form, min_loan_term_months: e.target.value })} className="input-field" min="1" />
            </div>
            <div>
              <label className="label">Max Loan Term (Months)</label>
              <input type="number" value={form.max_loan_term_months} onChange={(e) => setForm({ ...form, max_loan_term_months: e.target.value })} className="input-field" min="1" />
            </div>
            <div>
              <label className="label">Max DTI Ratio (%)</label>
              <input type="number" value={form.max_dti_ratio_percent} onChange={(e) => setForm({ ...form, max_dti_ratio_percent: e.target.value })} className="input-field" min="0" max="100" />
              <p className="text-xs text-gray-500 mt-1">Maximum debt-to-income ratio allowed</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <SettingDisplay label="Loan Amount Range" value={`${formatPHP(settings?.min_loan_amount_php || 0)} - ${formatPHP(settings?.max_loan_amount_php || 0)}`} />
            <SettingDisplay label="Loan Term Range" value={`${settings?.min_loan_term_months} - ${settings?.max_loan_term_months} months`} />
            <SettingDisplay label="Max DTI Ratio" value={`${settings?.max_dti_ratio_percent}%`} />
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fees & Charges</h3>
            <p className="text-sm text-gray-500">Upfront and recurring charges</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Processing Fee (%)</label>
                <input type="number" value={form.processing_fee_percent} onChange={(e) => setForm({ ...form, processing_fee_percent: e.target.value })} className="input-field" min="0" step="0.1" />
                <p className="text-xs text-gray-500 mt-1">Deducted from loan proceeds</p>
              </div>
              <div>
                <label className="label">Service Fee (%)</label>
                <input type="number" value={form.service_fee_percent} onChange={(e) => setForm({ ...form, service_fee_percent: e.target.value })} className="input-field" min="0" step="0.1" />
              </div>
              <div>
                <label className="label">Insurance Fee (%)</label>
                <input type="number" value={form.insurance_fee_percent} onChange={(e) => setForm({ ...form, insurance_fee_percent: e.target.value })} className="input-field" min="0" step="0.1" />
              </div>
              <div>
                <label className="label">Late Payment Penalty (% monthly)</label>
                <input type="number" value={form.late_payment_penalty_percent} onChange={(e) => setForm({ ...form, late_payment_penalty_percent: e.target.value })} className="input-field" min="0" step="0.1" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setEditing(false); if (settings) loadSettings(); }} className="btn-outline">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <SettingDisplay label="Processing Fee" value={`${settings?.processing_fee_percent}%`} />
            <SettingDisplay label="Service Fee" value={`${settings?.service_fee_percent}%`} />
            <SettingDisplay label="Insurance Fee" value={`${settings?.insurance_fee_percent}%`} />
            <SettingDisplay label="Late Payment Penalty" value={`${settings?.late_payment_penalty_percent}% / month`} />
          </div>
        )}
      </div>

      {sampleLoan && (
        <div className="card p-6 border-2 border-dashed border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sample Computation</h3>
              <p className="text-sm text-gray-500">PHP 100,000 loan for 12 months with current settings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SampleStat label="Monthly Payment" value={formatPHP(sampleLoan.monthlyPayment)} />
            <SampleStat label="Total Interest" value={formatPHP(sampleLoan.totalInterest)} />
            <SampleStat label="Total Fees" value={formatPHP(sampleLoan.totalFees)} />
            <SampleStat label="Net Proceeds" value={formatPHP(sampleLoan.netProceeds)} />
          </div>

          {parseFloat(form.processing_fee_percent) + parseFloat(form.service_fee_percent) + parseFloat(form.insurance_fee_percent) > 10 && (
            <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">Total upfront fees exceed 10% of the loan amount. This may affect borrower satisfaction.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingDisplay({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function SampleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function formatInterestType(type: string) {
  const map: Record<string, string> = {
    diminishing_balance: 'Diminishing Balance',
    flat: 'Flat Rate',
    add_on: 'Add-On',
    straight_line: 'Straight Line',
    compound: 'Compound Interest',
  };
  return map[type] || type;
}
