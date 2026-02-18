import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, FileText,
  AlertTriangle, CheckCircle, Clock, BarChart3,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPHP } from '../../utils/loanCalculator';
import type { Loan, LoanPayment, CreditApplication } from '../../types/database';

interface AnalyticsDashboardProps {
  tenantId: string;
}

interface PortfolioMetrics {
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  totalInterestEarned: number;
  activeLoans: number;
  paidOffLoans: number;
  defaultedLoans: number;
  averageLoanSize: number;
  approvalRate: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
}

interface MonthlyData {
  month: string;
  disbursed: number;
  collected: number;
  applications: number;
  approved: number;
}

interface LoanAging {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
}

export function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [aging, setAging] = useState<LoanAging>({ current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '12m' | 'all'>('12m');

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, dateRange]);

  async function fetchAnalytics() {
    setLoading(true);

    const [appsRes, loansRes, paymentsRes] = await Promise.all([
      supabase.from('credit_applications').select('*').eq('tenant_id', tenantId),
      supabase.from('loans').select('*').eq('tenant_id', tenantId),
      supabase.from('loan_payments').select('*').eq('tenant_id', tenantId),
    ]);

    const apps = (appsRes.data || []) as CreditApplication[];
    const loans = (loansRes.data || []) as Loan[];
    const payments = (paymentsRes.data || []) as LoanPayment[];

    const activeLoans = loans.filter(l => l.status === 'active');
    const paidOff = loans.filter(l => l.status === 'paid_off');
    const defaulted = loans.filter(l => l.status === 'defaulted' || l.status === 'written_off');
    const totalDisbursed = loans.reduce((sum, l) => sum + l.principal_amount_php, 0);
    const totalCollected = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_paid_php, 0);
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.total_payable_php, 0) - totalCollected;
    const totalInterestEarned = loans.reduce((sum, l) => sum + (l.total_payable_php - l.principal_amount_php), 0);

    const approvedApps = apps.filter(a => ['approved', 'disbursed'].includes(a.status));
    const decidedApps = apps.filter(a => ['approved', 'rejected', 'disbursed'].includes(a.status));
    const approvalRate = decidedApps.length > 0 ? (approvedApps.length / decidedApps.length) * 100 : 0;

    setMetrics({
      totalDisbursed,
      totalOutstanding: Math.max(0, totalOutstanding),
      totalCollected,
      totalInterestEarned,
      activeLoans: activeLoans.length,
      paidOffLoans: paidOff.length,
      defaultedLoans: defaulted.length,
      averageLoanSize: loans.length > 0 ? totalDisbursed / loans.length : 0,
      approvalRate,
      totalApplications: apps.length,
      pendingApplications: apps.filter(a => !['approved', 'rejected', 'disbursed'].includes(a.status)).length,
      approvedApplications: approvedApps.length,
      rejectedApplications: apps.filter(a => a.status === 'rejected').length,
    });

    const now = new Date();
    const monthsToShow = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : dateRange === '12m' ? 12 : 24;
    const monthlyMap = new Map<string, MonthlyData>();

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, {
        month: d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
        disbursed: 0,
        collected: 0,
        applications: 0,
        approved: 0,
      });
    }

    for (const loan of loans) {
      const d = new Date(loan.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) entry.disbursed += loan.principal_amount_php;
    }

    for (const payment of payments.filter(p => p.status === 'paid' && p.paid_date)) {
      const d = new Date(payment.paid_date!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) entry.collected += payment.amount_paid_php;
    }

    for (const app of apps) {
      const d = new Date(app.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.applications++;
        if (['approved', 'disbursed'].includes(app.status)) entry.approved++;
      }
    }

    setMonthlyData(Array.from(monthlyMap.values()));

    const today = new Date();
    const agingData: LoanAging = { current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0 };
    for (const payment of payments.filter(p => p.status !== 'paid')) {
      const dueDate = new Date(payment.due_date);
      const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLate <= 0) agingData.current += payment.amount_due_php;
      else if (daysLate <= 30) agingData.days30 += payment.amount_due_php;
      else if (daysLate <= 60) agingData.days60 += payment.amount_due_php;
      else if (daysLate <= 90) agingData.days90 += payment.amount_due_php;
      else agingData.days90Plus += payment.amount_due_php;
    }
    setAging(agingData);
    setLoading(false);
  }

  function exportCSV() {
    if (!metrics || monthlyData.length === 0) return;

    let csv = 'Month,Disbursed (PHP),Collected (PHP),Applications,Approved\n';
    for (const row of monthlyData) {
      csv += `${row.month},${row.disbursed.toFixed(2)},${row.collected.toFixed(2)},${row.applications},${row.approved}\n`;
    }

    csv += '\nPortfolio Summary\n';
    csv += `Total Disbursed,${metrics.totalDisbursed.toFixed(2)}\n`;
    csv += `Total Collected,${metrics.totalCollected.toFixed(2)}\n`;
    csv += `Total Outstanding,${metrics.totalOutstanding.toFixed(2)}\n`;
    csv += `Active Loans,${metrics.activeLoans}\n`;
    csv += `Approval Rate,${metrics.approvalRate.toFixed(1)}%\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiramease-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const maxMonthlyValue = Math.max(...monthlyData.map(d => Math.max(d.disbursed, d.collected)), 1);
  const agingTotal = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.days90Plus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Portfolio Analytics</h2>
          <p className="text-sm text-gray-500">Real-time insights into your lending operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {(['3m', '6m', '12m', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-outline text-sm py-2 px-3 flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Disbursed"
          value={formatPHP(metrics.totalDisbursed)}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Collected"
          value={formatPHP(metrics.totalCollected)}
          color="bg-green-100 text-green-600"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Outstanding"
          value={formatPHP(metrics.totalOutstanding)}
          color="bg-amber-100 text-amber-600"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Interest Earned"
          value={formatPHP(metrics.totalInterestEarned)}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Loan Portfolio</h3>
          </div>
          <div className="space-y-3">
            <PortfolioRow label="Active Loans" value={metrics.activeLoans} color="bg-blue-500" />
            <PortfolioRow label="Paid Off" value={metrics.paidOffLoans} color="bg-green-500" />
            <PortfolioRow label="Defaulted" value={metrics.defaultedLoans} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg. Loan Size</span>
              <span className="font-semibold text-gray-900">{formatPHP(metrics.averageLoanSize)}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Applications</h3>
          </div>
          <div className="space-y-3">
            <PortfolioRow label="Total" value={metrics.totalApplications} color="bg-gray-500" />
            <PortfolioRow label="Pending" value={metrics.pendingApplications} color="bg-yellow-500" />
            <PortfolioRow label="Approved" value={metrics.approvedApplications} color="bg-green-500" />
            <PortfolioRow label="Rejected" value={metrics.rejectedApplications} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Approval Rate</span>
              <span className="font-semibold text-gray-900">{metrics.approvalRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Aging Report</h3>
          </div>
          {agingTotal === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No outstanding receivables</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AgingRow label="Current" amount={aging.current} total={agingTotal} color="bg-green-500" />
              <AgingRow label="1-30 Days" amount={aging.days30} total={agingTotal} color="bg-yellow-500" />
              <AgingRow label="31-60 Days" amount={aging.days60} total={agingTotal} color="bg-orange-500" />
              <AgingRow label="61-90 Days" amount={aging.days90} total={agingTotal} color="bg-red-400" />
              <AgingRow label="90+ Days" amount={aging.days90Plus} total={agingTotal} color="bg-red-600" />
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Monthly Disbursements & Collections</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-gray-600">Disbursed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-gray-600">Collected</span>
            </div>
          </div>
        </div>

        <div className="h-64 flex items-end gap-1">
          {monthlyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end h-52">
                <div
                  className="flex-1 bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600 min-h-[2px]"
                  style={{ height: `${Math.max(1, (d.disbursed / maxMonthlyValue) * 100)}%` }}
                  title={`Disbursed: ${formatPHP(d.disbursed)}`}
                />
                <div
                  className="flex-1 bg-green-500 rounded-t-sm transition-all duration-500 hover:bg-green-600 min-h-[2px]"
                  style={{ height: `${Math.max(1, (d.collected / maxMonthlyValue) * 100)}%` }}
                  title={`Collected: ${formatPHP(d.collected)}`}
                />
              </div>
              <span className="text-[10px] text-gray-500 whitespace-nowrap">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Application Trends</h3>
          </div>
        </div>

        <div className="h-48 flex items-end gap-1">
          {monthlyData.map((d, i) => {
            const maxApps = Math.max(...monthlyData.map(m => m.applications), 1);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end h-40">
                  <div
                    className="flex-1 bg-primary-500 rounded-t-sm transition-all duration-500 hover:bg-primary-600 min-h-[2px]"
                    style={{ height: `${Math.max(1, (d.applications / maxApps) * 100)}%` }}
                    title={`Applications: ${d.applications}`}
                  />
                  <div
                    className="flex-1 bg-green-400 rounded-t-sm transition-all duration-500 hover:bg-green-500 min-h-[2px]"
                    style={{ height: `${Math.max(1, (d.approved / maxApps) * 100)}%` }}
                    title={`Approved: ${d.approved}`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{d.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary-500" />
            <span className="text-gray-600">Total Applications</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <span className="text-gray-600">Approved</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function PortfolioRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function AgingRow({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{formatPHP(amount)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
