import { useState, useEffect } from 'react';
import {
  DollarSign, ChevronDown, ChevronUp, CheckCircle, Clock,
  AlertCircle, XCircle, TrendingDown, Calendar, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPHP } from '../../utils/loanCalculator';
import type { Loan, LoanPayment } from '../../types/database';

interface LoanWithPayments extends Loan {
  payments: LoanPayment[];
}

interface BorrowerLoanTrackerProps {
  borrowerId: string;
}

export function BorrowerLoanTracker({ borrowerId }: BorrowerLoanTrackerProps) {
  const [loans, setLoans] = useState<LoanWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  useEffect(() => {
    if (borrowerId) fetchLoans();
  }, [borrowerId]);

  async function fetchLoans() {
    setLoading(true);
    await (supabase.rpc as any)('refresh_overdue_loan_payments');

    const { data } = await supabase
      .from('loans')
      .select('*, payments:loan_payments(*)')
      .eq('borrower_id', borrowerId)
      .order('disbursed_at', { ascending: false });

    if (data) setLoans(data as LoanWithPayments[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
        <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No active loans</p>
        <p className="text-gray-400 text-sm mt-1">Your disbursed loans and payment schedules will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          expanded={expandedLoanId === loan.id}
          onToggle={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
        />
      ))}
    </div>
  );
}

function LoanCard({ loan, expanded, onToggle }: { loan: LoanWithPayments; expanded: boolean; onToggle: () => void }) {
  const payments = [...(loan.payments || [])].sort((a, b) => a.payment_number - b.payment_number);
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid_php || 0), 0);
  const remaining = Math.max(0, loan.total_payable_php - totalPaid);
  const progress = loan.total_payable_php > 0 ? Math.min(100, (totalPaid / loan.total_payable_php) * 100) : 0;

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const lateCount = payments.filter(p => p.status === 'late').length;
  const missedCount = payments.filter(p => p.status === 'missed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  const nextDue = payments.find(p => p.status === 'pending' || p.status === 'late');

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    paid_off: 'bg-green-100 text-green-700',
    defaulted: 'bg-red-100 text-red-700',
    written_off: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              loan.status === 'active' ? 'bg-blue-100' :
              loan.status === 'paid_off' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`w-5 h-5 ${
                loan.status === 'active' ? 'text-blue-600' :
                loan.status === 'paid_off' ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-gray-900">{formatPHP(loan.principal_amount_php)} Loan</p>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[loan.status] || 'bg-gray-100 text-gray-600'}`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {loan.term_months} months · {loan.interest_rate_percent}% p.a. · {formatPHP(loan.monthly_payment_php)}/mo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="font-bold text-gray-900">{formatPHP(remaining)}</p>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{paidCount} of {payments.length} payments made</span>
            <span>{progress.toFixed(0)}% repaid</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                loan.status === 'paid_off' ? 'bg-green-500' :
                missedCount > 0 ? 'bg-red-500' :
                lateCount > 0 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {paidCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> {paidCount} Paid
            </span>
          )}
          {lateCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> {lateCount} Late
            </span>
          )}
          {missedCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
              <XCircle className="w-3 h-3" /> {missedCount} Missed
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {pendingCount} Upcoming
            </span>
          )}
        </div>
      </button>

      {/* Next due callout */}
      {nextDue && loan.status === 'active' && (
        <div className={`mx-6 mb-4 px-4 py-3 rounded-xl flex items-center justify-between text-sm ${
          nextDue.status === 'late' || nextDue.status === 'missed'
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${nextDue.status === 'late' ? 'text-red-600' : 'text-blue-600'}`} />
            <span className={nextDue.status === 'late' ? 'text-red-700' : 'text-blue-700'}>
              {nextDue.status === 'late'
                ? `Payment ${nextDue.payment_number} overdue by ${nextDue.days_late} day${nextDue.days_late !== 1 ? 's' : ''}`
                : `Next payment due ${new Date(nextDue.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </span>
          </div>
          <span className={`font-semibold ${nextDue.status === 'late' ? 'text-red-700' : 'text-blue-700'}`}>
            {formatPHP(nextDue.amount_due_php)}
          </span>
        </div>
      )}

      {/* Expanded payment schedule */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Loan summary */}
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50">
            <SummaryCell label="Principal" value={formatPHP(loan.principal_amount_php)} />
            <SummaryCell label="Total Payable" value={formatPHP(loan.total_payable_php)} />
            <SummaryCell label="Total Paid" value={formatPHP(totalPaid)} highlight="green" />
            <SummaryCell label="Balance" value={formatPHP(remaining)} highlight={remaining > 0 ? 'blue' : 'green'} />
          </div>

          {/* Schedule table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Due</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Paid</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(p => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Balance footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingDown className="w-4 h-4" />
              <span>Outstanding balance</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{formatPHP(remaining)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment: p }: { payment: LoanPayment }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    late: {
      label: p.days_late > 0 ? `Late (${p.days_late}d)` : 'Late',
      className: 'bg-yellow-100 text-yellow-700',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    missed: {
      label: 'Missed',
      className: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />,
    },
    pending: {
      label: 'Upcoming',
      className: 'bg-gray-100 text-gray-600',
      icon: <Clock className="w-3 h-3" />,
    },
  };

  const cfg = statusConfig[p.status] || statusConfig.pending;

  return (
    <tr className={`transition-colors ${
      p.status === 'late' ? 'bg-yellow-50/30' :
      p.status === 'missed' ? 'bg-red-50/30' :
      p.status === 'paid' ? 'hover:bg-gray-50' :
      'hover:bg-gray-50'
    }`}>
      <td className="px-6 py-3 text-gray-500 font-medium">{p.payment_number}</td>
      <td className="px-6 py-3 text-gray-900">
        {new Date(p.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td className="px-6 py-3 text-right font-medium text-gray-900">{formatPHP(p.amount_due_php)}</td>
      <td className="px-6 py-3 text-right text-gray-700">
        {p.amount_paid_php > 0 ? formatPHP(p.amount_paid_php) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-6 py-3 text-right text-gray-500 text-xs">
        {p.paid_date
          ? new Date(p.paid_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-6 py-3 text-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
          {cfg.icon}
          {cfg.label}
        </span>
      </td>
    </tr>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'blue' }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${
        highlight === 'green' ? 'text-green-700' :
        highlight === 'blue' ? 'text-blue-700' :
        'text-gray-900'
      }`}>{value}</p>
    </div>
  );
}
