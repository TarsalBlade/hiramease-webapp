import { useState, useEffect } from 'react';
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  Clock,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BorrowerProfile, UserProfile, Loan, LoanPayment } from '../../types/database';

interface BorrowerWithStats extends BorrowerProfile {
  user?: UserProfile;
  total_loans: number;
  active_loans: number;
  total_borrowed: number;
  total_paid: number;
  on_time_payments: number;
  late_payments: number;
  missed_payments: number;
  credit_rating: string;
}

interface BorrowerManagementProps {
  tenantId: string;
}

export function BorrowerManagement({ tenantId }: BorrowerManagementProps) {
  const [borrowers, setBorrowers] = useState<BorrowerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerWithStats | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchBorrowers();
    }
  }, [tenantId]);

  async function fetchBorrowers() {
    setLoading(true);

    const { data: borrowersData } = await supabase
      .from('borrower_profiles')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('tenant_id', tenantId);

    if (borrowersData) {
      const enrichedBorrowers = await Promise.all(
        borrowersData.map(async (borrower) => {
          const { data: loans } = await supabase
            .from('loans')
            .select('*')
            .eq('borrower_id', borrower.id);

          const { data: payments } = await supabase
            .from('loan_payments')
            .select('*')
            .eq('borrower_id', borrower.id);

          const totalLoans = loans?.length || 0;
          const activeLoans = loans?.filter((l) => l.status === 'active').length || 0;
          const totalBorrowed = loans?.reduce((sum, l) => sum + Number(l.principal_amount_php), 0) || 0;
          const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount_paid_php), 0) || 0;

          const onTimePayments = payments?.filter((p) => p.status === 'paid' && p.days_late === 0).length || 0;
          const latePayments = payments?.filter((p) => p.status === 'late' || (p.status === 'paid' && p.days_late > 0)).length || 0;
          const missedPayments = payments?.filter((p) => p.status === 'missed').length || 0;

          const totalPayments = payments?.length || 1;
          const onTimeRate = (onTimePayments / totalPayments) * 100;
          const creditRating = onTimeRate >= 90 ? 'Excellent' : onTimeRate >= 75 ? 'Good' : onTimeRate >= 50 ? 'Fair' : 'Poor';

          return {
            ...borrower,
            total_loans: totalLoans,
            active_loans: activeLoans,
            total_borrowed: totalBorrowed,
            total_paid: totalPaid,
            on_time_payments: onTimePayments,
            late_payments: latePayments,
            missed_payments: missedPayments,
            credit_rating: creditRating,
          };
        })
      );

      setBorrowers(enrichedBorrowers as BorrowerWithStats[]);
    }

    setLoading(false);
  }

  const filteredBorrowers = borrowers.filter((b) => {
    const fullName = `${b.user?.first_name || ''} ${b.user?.last_name || ''}`.toLowerCase();
    const email = (b.user?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const stats = {
    total: borrowers.length,
    active: borrowers.filter((b) => b.active_loans > 0).length,
    excellent: borrowers.filter((b) => b.credit_rating === 'Excellent').length,
    poor: borrowers.filter((b) => b.credit_rating === 'Poor' || b.credit_rating === 'Fair').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Borrowers" value={stats.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active Loans" value={stats.active} color="bg-green-100 text-green-600" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Excellent Credit" value={stats.excellent} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="At Risk" value={stats.poor} color="bg-red-100 text-red-600" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading borrowers...</p>
        </div>
      ) : filteredBorrowers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No borrowers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Rating</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Loans</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Active Loans</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Borrowed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment History</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{borrower.user?.first_name} {borrower.user?.last_name}</p>
                        <p className="text-sm text-gray-500">{borrower.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <CreditRatingBadge rating={borrower.credit_rating} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{borrower.total_loans}</td>
                    <td className="px-6 py-4 text-right">
                      {borrower.active_loans > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          {borrower.active_loans}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      PHP {borrower.total_borrowed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {borrower.on_time_payments}
                        </div>
                        {borrower.late_payments > 0 && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-3.5 h-3.5" />
                            {borrower.late_payments}
                          </div>
                        )}
                        {borrower.missed_payments > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-3.5 h-3.5" />
                            {borrower.missed_payments}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedBorrower(borrower)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBorrower && (
        <BorrowerDetailModal borrower={selectedBorrower} onClose={() => setSelectedBorrower(null)} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CreditRatingBadge({ rating }: { rating: string }) {
  const colors = {
    Excellent: 'bg-green-100 text-green-700 border-green-200',
    Good: 'bg-blue-100 text-blue-700 border-blue-200',
    Fair: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Poor: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[rating as keyof typeof colors] || colors.Fair}`}>
      {rating}
    </span>
  );
}

function BorrowerDetailModal({ borrower, onClose }: { borrower: BorrowerWithStats; onClose: () => void }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, [borrower.id]);

  async function fetchLoans() {
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('borrower_id', borrower.id)
      .order('disbursed_at', { ascending: false });

    if (data) setLoans(data as Loan[]);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{borrower.user?.first_name} {borrower.user?.last_name}</h2>
            <p className="text-sm text-gray-500">{borrower.user?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Credit Rating</p>
              <p className="text-2xl font-bold text-blue-900">{borrower.credit_rating}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">Total Borrowed</p>
              <p className="text-2xl font-bold text-green-900">PHP {borrower.total_borrowed.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-1">Active Loans</p>
              <p className="text-2xl font-bold text-purple-900">{borrower.active_loans}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Borrower Information</h3>
            <div className="bg-gray-50 rounded-xl p-4 grid md:grid-cols-2 gap-4">
              <InfoRow label="Phone" value={borrower.user?.phone || 'Not provided'} />
              <InfoRow label="Employment" value={borrower.employment_status || 'Not specified'} />
              <InfoRow label="Company" value={borrower.employer_name || 'Not specified'} />
              <InfoRow label="Job Title" value={borrower.job_title || 'Not specified'} />
              <InfoRow label="Monthly Income" value={borrower.monthly_income_php ? `PHP ${borrower.monthly_income_php.toLocaleString()}` : 'Not specified'} />
              <InfoRow label="Address" value={`${borrower.city || ''}, ${borrower.province || ''}`.trim() || 'Not specified'} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Payment History</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">On Time</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{borrower.on_time_payments}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-600 font-medium">Late</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{borrower.late_payments}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">Missed</p>
                </div>
                <p className="text-2xl font-bold text-red-900">{borrower.missed_payments}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Loan History ({borrower.total_loans})</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading loans...</p>
            ) : loans.length === 0 ? (
              <p className="text-sm text-gray-500">No loan history</p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div key={loan.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">PHP {Number(loan.principal_amount_php).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{loan.term_months} months @ {loan.interest_rate_percent}% interest</p>
                        </div>
                      </div>
                      <LoanStatusBadge status={loan.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Disbursed</p>
                        <p className="font-medium text-gray-900">{new Date(loan.disbursed_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Maturity</p>
                        <p className="font-medium text-gray-900">{new Date(loan.maturity_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Monthly Payment</p>
                        <p className="font-medium text-gray-900">PHP {Number(loan.monthly_payment_php).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoanStatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    paid_off: 'bg-blue-100 text-blue-700 border-blue-200',
    defaulted: 'bg-red-100 text-red-700 border-red-200',
    written_off: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.active}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
