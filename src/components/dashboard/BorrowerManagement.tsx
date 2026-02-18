import { useState, useEffect } from 'react';
import {
  Search,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  Clock,
  DollarSign,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BorrowerProfile, UserProfile, Loan } from '../../types/database';

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
  application_count: number;
  latest_status: string;
}

interface BorrowerManagementProps {
  tenantId: string;
}

export function BorrowerManagement({ tenantId }: BorrowerManagementProps) {
  const [borrowers, setBorrowers] = useState<BorrowerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

    if (!borrowersData) {
      setLoading(false);
      return;
    }

    const borrowerIds = borrowersData.map((b) => b.id);

    const [loansResult, paymentsResult, appsResult] = await Promise.all([
      borrowerIds.length > 0
        ? supabase.from('loans').select('*').in('borrower_id', borrowerIds)
        : Promise.resolve({ data: [] }),
      borrowerIds.length > 0
        ? supabase.from('loan_payments').select('*').in('borrower_id', borrowerIds)
        : Promise.resolve({ data: [] }),
      borrowerIds.length > 0
        ? supabase.from('credit_applications').select('id, borrower_id, status').in('borrower_id', borrowerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const loansMap = new Map<string, any[]>();
    const paymentsMap = new Map<string, any[]>();
    const appsMap = new Map<string, any[]>();

    for (const loan of (loansResult.data || [])) {
      const list = loansMap.get(loan.borrower_id) || [];
      list.push(loan);
      loansMap.set(loan.borrower_id, list);
    }

    for (const payment of (paymentsResult.data || [])) {
      const list = paymentsMap.get(payment.borrower_id) || [];
      list.push(payment);
      paymentsMap.set(payment.borrower_id, list);
    }

    for (const app of (appsResult.data || [])) {
      const list = appsMap.get(app.borrower_id) || [];
      list.push(app);
      appsMap.set(app.borrower_id, list);
    }

    const enriched: BorrowerWithStats[] = borrowersData.map((borrower) => {
      const loans = loansMap.get(borrower.id) || [];
      const payments = paymentsMap.get(borrower.id) || [];
      const apps = appsMap.get(borrower.id) || [];

      const totalLoans = loans.length;
      const activeLoans = loans.filter((l: any) => l.status === 'active').length;
      const totalBorrowed = loans.reduce((sum: number, l: any) => sum + Number(l.principal_amount_php), 0);
      const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount_paid_php), 0);

      const onTimePayments = payments.filter((p: any) => p.status === 'paid' && p.days_late === 0).length;
      const latePayments = payments.filter((p: any) => p.status === 'late' || (p.status === 'paid' && p.days_late > 0)).length;
      const missedPayments = payments.filter((p: any) => p.status === 'missed').length;

      const totalPaymentCount = payments.length || 1;
      const onTimeRate = (onTimePayments / totalPaymentCount) * 100;
      const creditRating = totalLoans === 0 ? 'New'
        : onTimeRate >= 90 ? 'Excellent'
        : onTimeRate >= 75 ? 'Good'
        : onTimeRate >= 50 ? 'Fair'
        : 'Poor';

      const latestApp = apps.sort((a: any, b: any) => b.id.localeCompare(a.id))[0];

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
        application_count: apps.length,
        latest_status: latestApp?.status || 'registered',
      } as BorrowerWithStats;
    });

    setBorrowers(enriched);
    setLoading(false);
  }

  const filteredBorrowers = borrowers.filter((b) => {
    const fullName = `${b.user?.first_name || ''} ${b.user?.last_name || ''}`.toLowerCase();
    const email = (b.user?.email || '').toLowerCase();
    const phone = (b.user?.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query) || phone.includes(query);

    let matchesFilter = true;
    if (statusFilter === 'active_loan') matchesFilter = b.active_loans > 0;
    else if (statusFilter === 'no_loan') matchesFilter = b.total_loans === 0;
    else if (statusFilter === 'excellent') matchesFilter = b.credit_rating === 'Excellent';
    else if (statusFilter === 'at_risk') matchesFilter = b.credit_rating === 'Poor' || b.credit_rating === 'Fair';

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: borrowers.length,
    active: borrowers.filter((b) => b.active_loans > 0).length,
    excellent: borrowers.filter((b) => b.credit_rating === 'Excellent' || b.credit_rating === 'Good').length,
    atRisk: borrowers.filter((b) => b.credit_rating === 'Poor' || b.credit_rating === 'Fair').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Borrowers" value={stats.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active Loans" value={stats.active} color="bg-green-100 text-green-600" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Good Standing" value={stats.excellent} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="At Risk" value={stats.atRisk} color="bg-red-100 text-red-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Borrowers</option>
            <option value="active_loan">With Active Loans</option>
            <option value="no_loan">No Loans Yet</option>
            <option value="excellent">Good Standing</option>
            <option value="at_risk">At Risk</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading borrowers...</p>
        </div>
      ) : filteredBorrowers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{searchQuery || statusFilter !== 'all' ? 'No matching borrowers found' : 'No borrowers registered yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Applications</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Loans</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Borrowed</th>
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
                        {borrower.user?.phone && <p className="text-xs text-gray-400">{borrower.user.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ApplicationStatusBadge status={borrower.latest_status} />
                    </td>
                    <td className="px-6 py-4">
                      <CreditRatingBadge rating={borrower.credit_rating} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{borrower.application_count}</td>
                    <td className="px-6 py-4 text-right">
                      {borrower.active_loans > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          {borrower.active_loans}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">{borrower.total_loans}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {borrower.total_borrowed > 0 ? `PHP ${borrower.total_borrowed.toLocaleString()}` : '-'}
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
  const colors: Record<string, string> = {
    Excellent: 'bg-green-100 text-green-700 border-green-200',
    Good: 'bg-blue-100 text-blue-700 border-blue-200',
    Fair: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Poor: 'bg-red-100 text-red-700 border-red-200',
    New: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[rating] || colors.New}`}>
      {rating}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    registered: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    scored: 'bg-sky-100 text-sky-700',
    verified: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || colors.registered}`}>
      {status.replace('_', ' ')}
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
            <p className="text-sm text-gray-500">{borrower.user?.email} {borrower.user?.phone ? `| ${borrower.user.phone}` : ''}</p>
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
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-xl p-4 border border-sky-200">
              <p className="text-sm text-sky-600 font-medium mb-1">Applications</p>
              <p className="text-2xl font-bold text-sky-900">{borrower.application_count}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Borrower Information</h3>
            <div className="bg-gray-50 rounded-xl p-4 grid md:grid-cols-2 gap-4">
              <InfoRow label="Phone" value={borrower.user?.phone || 'Not provided'} />
              <InfoRow label="Employment" value={borrower.employment_status || 'Not specified'} />
              <InfoRow label="Company" value={borrower.employer_name || 'Not specified'} />
              <InfoRow label="Job Title" value={borrower.job_title || 'Not specified'} />
              <InfoRow label="Years Employed" value={borrower.years_employed?.toString() || 'Not specified'} />
              <InfoRow label="Monthly Income" value={borrower.monthly_income_php ? `PHP ${borrower.monthly_income_php.toLocaleString()}` : 'Not specified'} />
              <InfoRow label="Address" value={`${borrower.address || ''} ${borrower.city || ''}, ${borrower.province || ''}`.trim() || 'Not specified'} />
              <InfoRow label="Civil Status" value={borrower.civil_status || 'Not specified'} />
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
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    paid_off: 'bg-blue-100 text-blue-700 border-blue-200',
    defaulted: 'bg-red-100 text-red-700 border-red-200',
    written_off: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
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
