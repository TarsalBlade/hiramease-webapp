import { useState, useEffect } from 'react';
import { DollarSign, Save, Loader2, Search, X, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Borrower {
  id: string;
  user_id: string;
  user?: { first_name: string; last_name: string; email: string };
}

interface Loan {
  id: string;
  principal_amount_php: number;
  term_months: number;
  status: string;
  monthly_payment_php: number;
}

interface ManualPayment {
  id: string;
  amount_php: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  borrower: { user: { first_name: string; last_name: string } } | null;
}

interface ManualPaymentFormProps {
  tenantId: string;
}

export function ManualPaymentForm({ tenantId }: ManualPaymentFormProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [recentPayments, setRecentPayments] = useState<ManualPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    borrower_id: '',
    loan_id: '',
    amount_php: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    receipt_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchBorrowers();
    fetchRecentPayments();
  }, [tenantId]);

  useEffect(() => {
    if (form.borrower_id) {
      fetchLoans(form.borrower_id);
    } else {
      setLoans([]);
    }
  }, [form.borrower_id]);

  async function fetchBorrowers() {
    const { data } = await supabase
      .from('borrower_profiles')
      .select('id, user_id, user:user_profiles(first_name, last_name, email)')
      .eq('tenant_id', tenantId);
    if (data) setBorrowers(data as unknown as Borrower[]);
  }

  async function fetchLoans(borrowerId: string) {
    const { data } = await supabase
      .from('loans')
      .select('id, principal_amount_php, term_months, status, monthly_payment_php')
      .eq('borrower_id', borrowerId)
      .eq('status', 'active');
    if (data) setLoans(data as Loan[]);
  }

  async function fetchRecentPayments() {
    const { data } = await supabase
      .from('manual_payments')
      .select('*, borrower:borrower_profiles(user:user_profiles(first_name, last_name))')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRecentPayments(data as unknown as ManualPayment[]);
  }

  async function handleSubmit() {
    if (!form.borrower_id || !form.amount_php || !user?.id) return;

    setSaving(true);
    const { error } = await supabase.from('manual_payments').insert({
      borrower_id: form.borrower_id,
      loan_id: form.loan_id || null,
      tenant_id: tenantId,
      amount_php: parseFloat(form.amount_php),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || null,
      receipt_number: form.receipt_number || null,
      notes: form.notes || null,
      recorded_by: user.id,
    });

    if (error) {
      alert('Failed to record payment. Please try again.');
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setForm({
        borrower_id: '',
        loan_id: '',
        amount_php: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
        receipt_number: '',
        notes: '',
      });
      setShowForm(false);
      fetchRecentPayments();
    }
    setSaving(false);
  }

  const filteredBorrowers = borrowers.filter((b) => {
    const name = `${b.user?.first_name || ''} ${b.user?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedBorrower = borrowers.find((b) => b.id === form.borrower_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Manual Payment Recording</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Receipt className="w-5 h-5 text-green-600" />
          <p className="text-green-700 font-medium">Payment recorded successfully!</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-900">New Manual Payment</h4>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Borrower <span className="text-red-500">*</span></label>
              {!form.borrower_id ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search borrower by name..."
                      className="input-field pl-10"
                    />
                  </div>
                  {searchQuery && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {filteredBorrowers.length === 0 ? (
                        <p className="p-3 text-sm text-gray-500">No borrowers found</p>
                      ) : (
                        filteredBorrowers.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setForm({ ...form, borrower_id: b.id });
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{b.user?.first_name} {b.user?.last_name}</p>
                            <p className="text-xs text-gray-500">{b.user?.email}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900">{selectedBorrower?.user?.first_name} {selectedBorrower?.user?.last_name}</p>
                    <p className="text-xs text-blue-600">{selectedBorrower?.user?.email}</p>
                  </div>
                  <button onClick={() => setForm({ ...form, borrower_id: '', loan_id: '' })} className="text-blue-600 hover:text-blue-800 text-sm">
                    Change
                  </button>
                </div>
              )}
            </div>

            {form.borrower_id && loans.length > 0 && (
              <div>
                <label className="label">Associated Loan (Optional)</label>
                <select
                  value={form.loan_id}
                  onChange={(e) => setForm({ ...form, loan_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">No specific loan</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      PHP {Number(loan.principal_amount_php).toLocaleString()} - {loan.term_months}mo - PHP {Number(loan.monthly_payment_php).toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Amount (PHP) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.amount_php}
                  onChange={(e) => setForm({ ...form, amount_php: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Payment Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Payment Method <span className="text-red-500">*</span></label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="input-field"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                  <option value="bank_deposit">Bank Deposit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Reference Number</label>
                <input
                  type="text"
                  value={form.reference_number}
                  onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  className="input-field"
                  placeholder="Transaction/reference #"
                />
              </div>
            </div>

            <div>
              <label className="label">Receipt Number</label>
              <input
                type="text"
                value={form.receipt_number}
                onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                className="input-field"
                placeholder="Official receipt number"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field min-h-[80px]"
                placeholder="Additional notes about this payment..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.borrower_id || !form.amount_php}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Recent Manual Payments</h4>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No manual payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {payment.borrower?.user?.first_name} {payment.borrower?.user?.last_name}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      PHP {Number(payment.amount_php).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {payment.reference_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
