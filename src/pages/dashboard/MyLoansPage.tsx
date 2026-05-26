import { useState, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  Calendar,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BorrowerLoanTracker } from '../../components/dashboard/BorrowerLoanTracker';
import type { BorrowerProfile } from '../../types/database';

interface LoanWithPayments {
  id: string;
  borrower_id: string;
  application_id: string;
  disbursement_date: string;
  principal_amount_php: number;
  monthly_payment_php: number;
  interest_rate_percent: number;
  term_months: number;
  remaining_balance_php: number;
  status: string;
  created_at: string;
  updated_at: string;
  payments?: LoanPayment[];
}

interface LoanPayment {
  id: string;
  loan_id: string;
  payment_amount_php: number;
  payment_date: string;
  principal_paid_php: number;
  interest_paid_php: number;
  status: string;
}

export function MyLoansPage() {
  const { user } = useAuth();
  const [borrowerProfile, setBorrowerProfile] = useState<BorrowerProfile | null>(null);
  const [loans, setLoans] = useState<LoanWithPayments[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { icon: <Wallet className="w-5 h-5" />, label: 'My Loans', href: 'loans' },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  async function fetchData() {
    setLoading(true);

    try {
      // Get borrower profile
      const { data: borrowerRows } = await supabase
        .from('borrower_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const borrower = borrowerRows?.[0] || null;
      setBorrowerProfile(borrower);

      if (borrower) {
        // Get loans with payments
        const { data: loansData } = await supabase
          .from('loans')
          .select(`
            *,
            payments:loan_payments(*)
          `)
          .eq('borrower_id', borrower.id)
          .order('created_at', { ascending: false });

        if (loansData) {
          setLoans(loansData.map((loan) => ({
            ...loan,
            payments: Array.isArray(loan.payments) ? loan.payments : [],
          })));
        }
      }
    } catch (err) {
      console.error('Error loading loan data:', err);
    }

    setLoading(false);
  }

  const stats = {
    activeLoans: loans.filter((l) => l.status === 'active').length,
    totalBalance: loans.filter((l) => l.status === 'active').reduce((sum, l) => sum + l.remaining_balance_php, 0),
    completedLoans: loans.filter((l) => l.status === 'completed').length,
  };

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav="loans"
      onNavChange={() => {}}
      title="My Loans"
      onRefresh={fetchData}
      refreshing={loading}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Active Loans"
            value={stats.activeLoans}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Balance"
            value={`PHP ${(stats.totalBalance / 1000).toFixed(0)}K`}
            color="bg-orange-100 text-orange-600"
            isAmount={true}
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Completed Loans"
            value={stats.completedLoans}
            color="bg-green-100 text-green-600"
          />
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="card p-6"><LoadingState /></div>
        ) : borrowerProfile ? (
          <BorrowerLoanTracker borrowerId={borrowerProfile.id} />
        ) : (
          <div className="card p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Complete a loan application to see your loans here.</p>
          </div>
        )}

        {/* Loans List */}
        {!loading && loans.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
            {loans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && loans.length === 0 && borrowerProfile && (
          <div className="card p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active loans at the moment.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  isAmount?: boolean;
}

function StatCard({ icon, label, value, color, isAmount }: StatCardProps) {
  return (
    <div className="card p-6 space-y-2">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold text-gray-900 ${isAmount ? 'text-xl' : ''}`}>
        {isAmount ? value : value}
      </p>
    </div>
  );
}

function LoanCard({ loan }: { loan: LoanWithPayments }) {
  const [expanded, setExpanded] = useState(false);
  const paidPayments = (loan.payments || []).filter((p) => p.status === 'paid').length;
  const totalPayments = Math.ceil(loan.term_months);
  const progressPercent = (paidPayments / totalPayments) * 100;
  const nextPaymentDue = new Date();
  nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);

  const isActive = loan.status === 'active';
  const isCompleted = loan.status === 'completed';

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isActive ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            <Wallet className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Loan #{loan.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-sm text-gray-500">
              {isActive ? 'Active' : 'Completed'} • {loan.term_months} months term
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-sm text-gray-600">Outstanding Balance</p>
            <p className="text-xl font-bold text-gray-900">PHP {loan.remaining_balance_php.toLocaleString()}</p>
          </div>
          <div className="text-right min-w-[100px]">
            <p className="text-sm text-gray-600">Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-700">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-6 space-y-6">
          {/* Loan Information */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Loan Information</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <InfoItem label="Principal Amount" value={`PHP ${loan.principal_amount_php.toLocaleString()}`} />
                <InfoItem label="Monthly Payment" value={`PHP ${loan.monthly_payment_php.toLocaleString()}`} />
                <InfoItem label="Interest Rate" value={`${loan.interest_rate_percent}% per annum`} />
              </div>
              <div className="space-y-3">
                <InfoItem label="Loan Term" value={`${loan.term_months} months`} />
                <InfoItem label="Disbursed" value={new Date(loan.disbursement_date).toLocaleDateString()} />
                <InfoItem label="Status" value={
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isActive ? 'Active' : 'Completed'}
                  </span>
                } />
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Payment Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Payments Made</span>
                <span className="font-semibold text-gray-900">{paidPayments} of {totalPayments}</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Started</span>
                <span>In Progress</span>
              </div>
            </div>
          </div>

          {/* Next Payment */}
          {isActive && (
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Next Payment Due</p>
                  <p className="text-sm text-gray-600">{nextPaymentDue.toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">PHP {loan.monthly_payment_php.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {(loan.payments || []).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Recent Payments</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(loan.payments || [])
                  .slice(0, 5)
                  .map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} />
                  ))}
              </div>
              {(loan.payments || []).length > 5 && (
                <p className="text-sm text-gray-500 mt-3">
                  +{(loan.payments || []).length - 5} more payments
                </p>
              )}
            </div>
          )}

          {/* Amortization Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-gray-600">Total Interest Paid</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                PHP {calculateTotalInterestPaid(loan).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <p className="text-sm text-gray-600">Remaining Balance</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                PHP {loan.remaining_balance_php.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PaymentRow({ payment }: { payment: LoanPayment }) {
  const isCompleted = payment.status === 'paid';

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-100' : 'bg-yellow-100'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {new Date(payment.payment_date).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">
            Principal: PHP {payment.principal_paid_php.toLocaleString()} • Interest: PHP {payment.interest_paid_php.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="font-semibold text-gray-900">PHP {payment.payment_amount_php.toLocaleString()}</p>
    </div>
  );
}

function calculateTotalInterestPaid(loan: LoanWithPayments): number {
  if (!loan.payments) return 0;
  return (loan.payments || [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.interest_paid_php, 0);
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
