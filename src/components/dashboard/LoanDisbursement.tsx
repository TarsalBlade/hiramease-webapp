import { useState, useEffect } from 'react';
import {
  DollarSign, CheckCircle, X, Loader2,
  FileText, Search, Eye, CalendarDays, TrendingDown,
  AlertCircle, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateLoan, formatPHP } from '../../utils/loanCalculator';
import type { CreditApplication, BorrowerProfile, UserProfile, Loan, LoanPayment, ApplicationDecision, TenantLendingSettings } from '../../types/database';

interface LoanDisbursementProps {
  tenantId: string;
}

interface ApprovedApplication extends CreditApplication {
  borrower?: BorrowerProfile & { user?: UserProfile };
  decision?: ApplicationDecision;
}

export function LoanDisbursement({ tenantId }: LoanDisbursementProps) {
  const { user } = useAuth();
  const [approvedApps, setApprovedApps] = useState<ApprovedApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<(Loan & { borrower?: BorrowerProfile & { user?: UserProfile }; payments?: LoanPayment[] })[]>([]);
  const [lendingSettings, setLendingSettings] = useState<TenantLendingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisbursementModal, setShowDisbursementModal] = useState<ApprovedApplication | null>(null);
  const [showLoanDetail, setShowLoanDetail] = useState<typeof activeLoans[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);

    // Refresh overdue installment statuses before loading
    await (supabase.rpc as any)('refresh_overdue_loan_payments');

    const [appsRes, loansRes, settingsRes] = await Promise.all([
      supabase
        .from('credit_applications')
        .select(`*, borrower:borrower_profiles(*, user:user_profiles(*)), decision:application_decisions(*)`)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .order('decided_at', { ascending: false }),
      supabase
        .from('loans')
        .select(`*, borrower:borrower_profiles(*, user:user_profiles(*)), payments:loan_payments(*)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      (supabase.rpc as any)('get_or_create_lending_settings', { p_tenant_id: tenantId }),
    ]);

    if (appsRes.data) {
      setApprovedApps(appsRes.data.map((app: any) => ({
        ...app,
        decision: Array.isArray(app.decision) ? app.decision[0] : app.decision,
      })));
    }

    if (loansRes.data) {
      setActiveLoans(loansRes.data as any);
    }

    if (settingsRes.data) {
      setLendingSettings(settingsRes.data as TenantLendingSettings);
    }

    setLoading(false);
  }

  async function handleDisburse(app: ApprovedApplication) {
    if (!user?.id || !app.decision) return;

    const principal = app.decision.approved_amount_php || app.loan_amount_php;
    const rate = app.decision.interest_rate_percent || lendingSettings?.interest_rate_annual_percent || 12;
    const term = app.decision.approved_term_months || app.loan_term_months;
    const interestType = lendingSettings?.interest_type || 'diminishing_balance';

    const computation = calculateLoan(
      principal, rate, term, interestType,
      lendingSettings?.processing_fee_percent || 0,
      lendingSettings?.service_fee_percent || 0,
      lendingSettings?.insurance_fee_percent || 0
    );

    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + term);

    const { data: loan, error: loanError } = await (supabase
      .from('loans') as any)
      .insert({
        application_id: app.id,
        borrower_id: app.borrower_id,
        tenant_id: tenantId,
        principal_amount_php: principal,
        interest_rate_percent: rate,
        term_months: term,
        monthly_payment_php: computation.monthlyPayment,
        total_payable_php: computation.totalAmount,
        disbursed_at: now.toISOString(),
        maturity_date: maturityDate.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (loanError || !loan) {
      alert('Failed to create loan record.');
      return;
    }

    const loanRecord = loan as any;
    const paymentSchedule = computation.schedule.map((entry, idx) => {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + idx + 1);
      return {
        loan_id: loanRecord.id,
        borrower_id: app.borrower_id,
        tenant_id: tenantId,
        payment_number: idx + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount_due_php: entry.payment,
        amount_paid_php: 0,
        status: 'pending',
        days_late: 0,
        late_fee_php: 0,
      };
    });

    await (supabase.from('loan_payments') as any).insert(paymentSchedule);

    await (supabase
      .from('credit_applications') as any)
      .update({ status: 'disbursed' })
      .eq('id', app.id);

    setShowDisbursementModal(null);
    fetchData();
  }

  const filteredApps = approvedApps.filter(app => {
    const name = `${app.borrower?.user?.first_name || ''} ${app.borrower?.user?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || app.application_number.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredLoans = activeLoans.filter(loan => {
    const name = `${loan.borrower?.user?.first_name || ''} ${loan.borrower?.user?.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Disbursement ({approvedApps.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'active' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Loans ({activeLoans.filter(l => l.status === 'active').length})
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or application number..."
          className="input-field pl-10"
        />
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-3">
          {filteredApps.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-500">No approved applications pending disbursement</p>
            </div>
          ) : (
            filteredApps.map(app => (
              <div key={app.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{app.borrower?.user?.first_name} {app.borrower?.user?.last_name}</p>
                      <p className="text-sm text-gray-500">{app.application_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPHP(app.decision?.approved_amount_php || app.loan_amount_php)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {app.decision?.approved_term_months || app.loan_term_months} months @ {app.decision?.interest_rate_percent || '-'}%
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDisbursementModal(app)}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
                    >
                      <DollarSign className="w-4 h-4" />
                      Disburse
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-3">
          {filteredLoans.length === 0 ? (
            <div className="card p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active loans</p>
            </div>
          ) : (
            filteredLoans.map(loan => (
              <ActiveLoanCard
                key={loan.id}
                loan={loan}
                onViewDetail={() => setShowLoanDetail(loan)}
              />
            ))
          )}
        </div>
      )}

      {showDisbursementModal && (
        <DisbursementConfirmModal
          application={showDisbursementModal}
          lendingSettings={lendingSettings}
          onClose={() => setShowDisbursementModal(null)}
          onConfirm={() => handleDisburse(showDisbursementModal)}
        />
      )}

      {showLoanDetail && (
        <LoanDetailModal
          loan={showLoanDetail}
          onClose={() => setShowLoanDetail(null)}
        />
      )}
    </div>
  );
}

function ActiveLoanCard({
  loan,
  onViewDetail,
}: {
  loan: Loan & { borrower?: BorrowerProfile & { user?: UserProfile }; payments?: LoanPayment[] };
  onViewDetail: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const payments = [...(loan.payments || [])].sort((a, b) => a.payment_number - b.payment_number);

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid_php || 0), 0);
  const remaining = Math.max(0, loan.total_payable_php - totalPaid);
  const progress = loan.total_payable_php > 0 ? Math.min(100, (totalPaid / loan.total_payable_php) * 100) : 0;

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const lateCount = payments.filter(p => p.status === 'late').length;
  const missedCount = payments.filter(p => p.status === 'missed').length;
  const nextDue = payments.find(p => p.status === 'pending' || p.status === 'late');

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    paid_off: 'bg-green-100 text-green-700',
    defaulted: 'bg-red-100 text-red-700',
    written_off: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              loan.status === 'active' ? 'bg-blue-100' :
              loan.status === 'paid_off' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`w-5 h-5 ${
                loan.status === 'active' ? 'text-blue-600' :
                loan.status === 'paid_off' ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {loan.borrower?.user?.first_name} {loan.borrower?.user?.last_name}
              </p>
              <p className="text-sm text-gray-500">
                {formatPHP(loan.principal_amount_php)} · {loan.term_months} months · {loan.interest_rate_percent}% p.a.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(lateCount > 0 || missedCount > 0) && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {lateCount + missedCount} overdue
              </span>
            )}
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColors[loan.status] || 'bg-gray-100 text-gray-600'}`}>
              {loan.status.replace('_', ' ')}
            </span>
            <button
              onClick={onViewDetail}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 ml-1"
            >
              <Eye className="w-4 h-4" /> Detail
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{paidCount} of {payments.length} installments paid</span>
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

        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span>Paid: <span className="font-medium text-gray-700">{formatPHP(totalPaid)}</span></span>
          <span>Monthly: <span className="font-medium text-gray-700">{formatPHP(loan.monthly_payment_php)}</span></span>
          <span>Balance: <span className="font-medium text-gray-700">{formatPHP(remaining)}</span></span>
        </div>

        {/* Next due callout */}
        {nextDue && loan.status === 'active' && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-3 ${
            nextDue.status === 'late' || nextDue.status === 'missed'
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <CalendarDays className={`w-4 h-4 ${nextDue.status === 'late' ? 'text-red-600' : 'text-blue-600'}`} />
              <span className={nextDue.status === 'late' ? 'text-red-700' : 'text-blue-700'}>
                {nextDue.status === 'late'
                  ? `Installment #${nextDue.payment_number} overdue by ${nextDue.days_late} day${nextDue.days_late !== 1 ? 's' : ''}`
                  : `Installment #${nextDue.payment_number} due ${new Date(nextDue.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            </div>
            <div className={`text-right ${nextDue.status === 'late' ? 'text-red-700' : 'text-blue-700'}`}>
              <span className="font-semibold">
                {formatPHP(Math.max(0, nextDue.amount_due_php - (nextDue.amount_paid_php || 0)))}
              </span>
              {(nextDue.amount_paid_php || 0) > 0 && (
                <p className="text-xs opacity-70">{formatPHP(nextDue.amount_paid_php)} advance credited</p>
              )}
            </div>
          </div>
        )}

        {/* Expand/collapse schedule toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors pt-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Hide' : 'Show'} payment schedule ({payments.length} installments)
        </button>
      </div>

      {/* Inline payment schedule */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Due</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Paid</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(p => {
                  const statusCfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                    paid:    { label: 'Paid',      cls: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
                    late:    { label: `Late${p.days_late > 0 ? ` (${p.days_late}d)` : ''}`, cls: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle className="w-3 h-3" /> },
                    missed:  { label: 'Missed',    cls: 'bg-red-100 text-red-700',      icon: <AlertCircle className="w-3 h-3" /> },
                    pending: { label: 'Upcoming',  cls: 'bg-gray-100 text-gray-600',    icon: <Clock className="w-3 h-3" /> },
                  };
                  const cfg = statusCfg[p.status] || statusCfg.pending;

                  return (
                    <tr key={p.id} className={`${
                      p.status === 'late' ? 'bg-yellow-50/40' :
                      p.status === 'missed' ? 'bg-red-50/40' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-2.5 text-gray-500 font-medium">{p.payment_number}</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {new Date(p.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {p.status === 'pending' && (p.amount_paid_php || 0) > 0 ? (
                          <div>
                            <span>{formatPHP(Math.max(0, p.amount_due_php - (p.amount_paid_php || 0)))}</span>
                            <p className="text-xs text-gray-400 font-normal">{formatPHP(p.amount_paid_php)} advance</p>
                          </div>
                        ) : (
                          formatPHP(p.amount_due_php)
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">
                        {p.amount_paid_php > 0 ? formatPHP(p.amount_paid_php) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                        {p.paid_date
                          ? new Date(p.paid_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <TrendingDown className="w-4 h-4" />
              Outstanding balance
            </div>
            <span className="font-bold text-gray-900">{formatPHP(remaining)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DisbursementConfirmModal({
  application,
  lendingSettings,
  onClose,
  onConfirm,
}: {
  application: ApprovedApplication;
  lendingSettings: TenantLendingSettings | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const principal = application.decision?.approved_amount_php || application.loan_amount_php;
  const rate = application.decision?.interest_rate_percent || lendingSettings?.interest_rate_annual_percent || 12;
  const term = application.decision?.approved_term_months || application.loan_term_months;
  const interestType = lendingSettings?.interest_type || 'diminishing_balance';

  const computation = calculateLoan(
    principal, rate, term, interestType,
    lendingSettings?.processing_fee_percent || 0,
    lendingSettings?.service_fee_percent || 0,
    lendingSettings?.insurance_fee_percent || 0
  );

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Loan Disbursement</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              Confirming will create a loan record and generate the full monthly payment schedule for the borrower. They will see all dues in their <strong>My Loans</strong> tab immediately.
            </p>
          </div>

          {/* Loan summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Borrower</p>
              <p className="text-sm font-semibold text-gray-900">
                {application.borrower?.user?.first_name} {application.borrower?.user?.last_name}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Principal</p>
              <p className="text-sm font-semibold text-gray-900">{formatPHP(principal)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Interest Rate</p>
              <p className="text-sm font-semibold text-gray-900">{rate}% p.a.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Term</p>
              <p className="text-sm font-semibold text-gray-900">{term} months</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly Payment</span>
              <span className="font-semibold text-gray-900">{formatPHP(computation.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Interest</span>
              <span className="font-medium text-gray-900">{formatPHP(computation.totalInterest)}</span>
            </div>
            {computation.totalFees > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Fees</span>
                <span className="font-medium text-gray-900">{formatPHP(computation.totalFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total Payable</span>
              <span className="text-gray-900">{formatPHP(computation.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700 font-medium">Net Proceeds to Borrower</span>
              <span className="text-green-700 font-bold">{formatPHP(computation.netProceeds)}</span>
            </div>
          </div>

          {/* Payment schedule preview */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Payment Schedule Preview ({term} installments)
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-y-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide">Due Date</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {computation.schedule.map((entry, idx) => {
                      const dueDate = new Date();
                      dueDate.setMonth(dueDate.getMonth() + idx + 1);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-900">
                            {dueDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatPHP(entry.payment)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleConfirm} disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            {submitting ? 'Disbursing...' : 'Confirm Disbursement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanDetailModal({
  loan,
  onClose,
}: {
  loan: Loan & { borrower?: BorrowerProfile & { user?: UserProfile }; payments?: LoanPayment[] };
  onClose: () => void;
}) {
  const payments = (loan.payments || []).sort((a, b) => a.payment_number - b.payment_number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Loan Details</h2>
            <p className="text-sm text-gray-500">
              {loan.borrower?.user?.first_name} {loan.borrower?.user?.last_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Principal</p>
              <p className="text-sm font-bold text-gray-900">{formatPHP(loan.principal_amount_php)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Rate</p>
              <p className="text-sm font-bold text-gray-900">{loan.interest_rate_percent}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Monthly</p>
              <p className="text-sm font-bold text-gray-900">{formatPHP(loan.monthly_payment_php)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Total Payable</p>
              <p className="text-sm font-bold text-gray-900">{formatPHP(loan.total_payable_php)}</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-3">Payment Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600">{p.payment_number}</td>
                    <td className="px-4 py-2.5 text-gray-900">{new Date(p.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900 font-medium">
                      {p.status === 'pending' && (p.amount_paid_php || 0) > 0 ? (
                        <div>
                          <span>{formatPHP(Math.max(0, p.amount_due_php - (p.amount_paid_php || 0)))}</span>
                          <p className="text-xs text-gray-400 font-normal">{formatPHP(p.amount_paid_php)} advance</p>
                        </div>
                      ) : (
                        formatPHP(p.amount_due_php)
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {(p.amount_paid_php || 0) > 0 ? formatPHP(p.amount_paid_php) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'late' ? 'bg-red-100 text-red-700' :
                        p.status === 'missed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
