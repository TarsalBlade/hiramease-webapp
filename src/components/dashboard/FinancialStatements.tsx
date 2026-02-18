import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Download,
  ArrowDownRight, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPHP } from '../../utils/loanCalculator';
import type { Loan, LoanPayment } from '../../types/database';

interface FinancialStatementsProps {
  tenantId: string;
}

interface FinancialData {
  revenue: {
    interestIncome: number;
    processingFees: number;
    lateFees: number;
    serviceFees: number;
    totalRevenue: number;
  };
  expenses: {
    platformSubscription: number;
    operatingExpenses: number;
    provisionForBadDebts: number;
    totalExpenses: number;
  };
  netIncome: number;
  assets: {
    cashOnHand: number;
    loansReceivable: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  cashFlow: {
    loanDisbursements: number;
    loanRepayments: number;
    subscriptionPayments: number;
    netCashFlow: number;
  };
  projections: MonthlyProjection[];
}

interface MonthlyProjection {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  loansReceivable: number;
  cashFlow: number;
}

export function FinancialStatements({ tenantId }: FinancialStatementsProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'income' | 'balance' | 'cashflow' | 'projections'>('income');
  const [projectionMonths, setProjectionMonths] = useState(12);

  useEffect(() => {
    fetchFinancialData();
  }, [tenantId]);

  async function fetchFinancialData() {
    setLoading(true);

    const [loansRes, paymentsRes, subsRes, settingsRes] = await Promise.all([
      supabase.from('loans').select('*').eq('tenant_id', tenantId),
      supabase.from('loan_payments').select('*').eq('tenant_id', tenantId),
      supabase.from('subscriptions').select('*, plan:subscription_plans(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1),
      (supabase.rpc as any)('get_or_create_lending_settings', { p_tenant_id: tenantId }),
    ]);

    const loans = (loansRes.data || []) as Loan[];
    const payments = (paymentsRes.data || []) as LoanPayment[];
    const subscription = (subsRes.data || [])[0] as { plan?: { price_php?: number } } | undefined;
    const settings = settingsRes.data as { processing_fee_percent?: number; service_fee_percent?: number } | null;

    const activeLoans = loans.filter(l => l.status === 'active');
    const paidPayments = payments.filter(p => p.status === 'paid');
    const latePayments = payments.filter(p => p.status === 'late' || p.status === 'missed');

    const totalInterestEarned = loans.reduce((sum, l) => sum + (l.total_payable_php - l.principal_amount_php), 0);
    const totalDisbursed = loans.reduce((sum, l) => sum + l.principal_amount_php, 0);
    const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount_paid_php, 0);
    const lateFees = latePayments.reduce((sum, p) => sum + p.late_fee_php, 0);

    const processingFeeRate = settings?.processing_fee_percent || 0;
    const serviceFeeRate = settings?.service_fee_percent || 0;
    const processingFees = totalDisbursed * (processingFeeRate / 100);
    const serviceFees = totalDisbursed * (serviceFeeRate / 100);

    const subscriptionCost = subscription?.plan?.price_php || 0;
    const monthsActive = loans.length > 0 ? Math.max(1, Math.ceil((Date.now() - new Date(loans[loans.length - 1].created_at).getTime()) / (30 * 24 * 60 * 60 * 1000))) : 1;
    const totalSubCost = subscriptionCost * monthsActive;

    const defaultedLoans = loans.filter(l => l.status === 'defaulted' || l.status === 'written_off');
    const badDebtProvision = defaultedLoans.reduce((sum, l) => sum + l.principal_amount_php, 0);
    const operatingExpenses = totalSubCost * 0.1;

    const totalRevenue = totalInterestEarned + processingFees + serviceFees + lateFees;
    const totalExpenses = totalSubCost + operatingExpenses + badDebtProvision;
    const netIncome = totalRevenue - totalExpenses;

    const loansReceivable = activeLoans.reduce((sum, l) => {
      const loanPayments = payments.filter(p => p.loan_id === l.id && p.status === 'paid');
      const paid = loanPayments.reduce((s, p) => s + p.amount_paid_php, 0);
      return sum + (l.total_payable_php - paid);
    }, 0);

    const cashOnHand = totalCollected - totalDisbursed + processingFees + serviceFees + lateFees - totalSubCost - operatingExpenses;

    const projections: MonthlyProjection[] = [];
    const avgMonthlyDisbursement = monthsActive > 0 ? totalDisbursed / monthsActive : 0;
    const avgMonthlyCollection = monthsActive > 0 ? totalCollected / monthsActive : 0;
    const avgMonthlyRevenue = monthsActive > 0 ? totalRevenue / monthsActive : 0;
    const avgMonthlyExpenses = monthsActive > 0 ? totalExpenses / monthsActive : 0;
    const growthRate = 0.05;

    let cumulativeReceivable = loansReceivable;
    let cumulativeCash = Math.max(0, cashOnHand);

    for (let i = 1; i <= projectionMonths; i++) {
      const growth = Math.pow(1 + growthRate, i);
      const projRevenue = avgMonthlyRevenue * growth;
      const projExpenses = avgMonthlyExpenses * Math.pow(1 + growthRate * 0.5, i);
      const projNet = projRevenue - projExpenses;
      const projDisb = avgMonthlyDisbursement * growth;
      const projColl = avgMonthlyCollection * growth;

      cumulativeReceivable = cumulativeReceivable + projDisb - projColl;
      cumulativeCash = cumulativeCash + projColl - projDisb - projExpenses + projRevenue;

      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() + i);

      projections.push({
        month: monthDate.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
        revenue: projRevenue,
        expenses: projExpenses,
        netIncome: projNet,
        loansReceivable: Math.max(0, cumulativeReceivable),
        cashFlow: projColl - projDisb,
      });
    }

    setData({
      revenue: {
        interestIncome: totalInterestEarned,
        processingFees,
        lateFees,
        serviceFees,
        totalRevenue,
      },
      expenses: {
        platformSubscription: totalSubCost,
        operatingExpenses,
        provisionForBadDebts: badDebtProvision,
        totalExpenses,
      },
      netIncome,
      assets: {
        cashOnHand: Math.max(0, cashOnHand),
        loansReceivable,
        totalAssets: Math.max(0, cashOnHand) + loansReceivable,
      },
      liabilities: {
        accountsPayable: 0,
        totalLiabilities: 0,
      },
      equity: {
        retainedEarnings: netIncome,
        totalEquity: Math.max(0, cashOnHand) + loansReceivable,
      },
      cashFlow: {
        loanDisbursements: totalDisbursed,
        loanRepayments: totalCollected,
        subscriptionPayments: totalSubCost,
        netCashFlow: totalCollected - totalDisbursed - totalSubCost - operatingExpenses,
      },
      projections,
    });

    setLoading(false);
  }

  function exportFinancials() {
    if (!data) return;

    let csv = 'INCOME STATEMENT\n';
    csv += 'Revenue\n';
    csv += `Interest Income,${data.revenue.interestIncome.toFixed(2)}\n`;
    csv += `Processing Fees,${data.revenue.processingFees.toFixed(2)}\n`;
    csv += `Service Fees,${data.revenue.serviceFees.toFixed(2)}\n`;
    csv += `Late Fees,${data.revenue.lateFees.toFixed(2)}\n`;
    csv += `Total Revenue,${data.revenue.totalRevenue.toFixed(2)}\n\n`;
    csv += 'Expenses\n';
    csv += `Platform Subscription,${data.expenses.platformSubscription.toFixed(2)}\n`;
    csv += `Operating Expenses,${data.expenses.operatingExpenses.toFixed(2)}\n`;
    csv += `Provision for Bad Debts,${data.expenses.provisionForBadDebts.toFixed(2)}\n`;
    csv += `Total Expenses,${data.expenses.totalExpenses.toFixed(2)}\n\n`;
    csv += `Net Income,${data.netIncome.toFixed(2)}\n\n`;

    csv += 'BALANCE SHEET\n';
    csv += 'Assets\n';
    csv += `Cash on Hand,${data.assets.cashOnHand.toFixed(2)}\n`;
    csv += `Loans Receivable,${data.assets.loansReceivable.toFixed(2)}\n`;
    csv += `Total Assets,${data.assets.totalAssets.toFixed(2)}\n\n`;

    csv += 'CASH FLOW STATEMENT\n';
    csv += `Loan Disbursements,${data.cashFlow.loanDisbursements.toFixed(2)}\n`;
    csv += `Loan Repayments,${data.cashFlow.loanRepayments.toFixed(2)}\n`;
    csv += `Subscription Payments,${data.cashFlow.subscriptionPayments.toFixed(2)}\n`;
    csv += `Net Cash Flow,${data.cashFlow.netCashFlow.toFixed(2)}\n\n`;

    csv += 'PROJECTED FINANCIALS\n';
    csv += 'Month,Revenue,Expenses,Net Income,Loans Receivable,Cash Flow\n';
    for (const p of data.projections) {
      csv += `${p.month},${p.revenue.toFixed(2)},${p.expenses.toFixed(2)},${p.netIncome.toFixed(2)},${p.loansReceivable.toFixed(2)},${p.cashFlow.toFixed(2)}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiramease-financials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxProjectionValue = Math.max(
    ...data.projections.map(p => Math.max(p.revenue, p.expenses)),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Financial Statements</h2>
          <p className="text-sm text-gray-500">Income statement, balance sheet, and cash flow analysis</p>
        </div>
        <button onClick={exportFinancials} className="btn-outline text-sm py-2 px-3 flex items-center gap-1.5">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'income', label: 'Income Statement' },
          { key: 'balance', label: 'Balance Sheet' },
          { key: 'cashflow', label: 'Cash Flow' },
          { key: 'projections', label: 'Projections' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeView === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'income' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={formatPHP(data.revenue.totalRevenue)}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-green-600 bg-green-100"
            />
            <SummaryCard
              label="Total Expenses"
              value={formatPHP(data.expenses.totalExpenses)}
              icon={<ArrowDownRight className="w-5 h-5" />}
              color="text-red-600 bg-red-100"
            />
            <SummaryCard
              label="Net Income"
              value={formatPHP(data.netIncome)}
              icon={<DollarSign className="w-5 h-5" />}
              color={data.netIncome >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
            />
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Revenue</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Interest Income" amount={data.revenue.interestIncome} />
              <LineItem label="Processing Fees" amount={data.revenue.processingFees} />
              <LineItem label="Service Fees" amount={data.revenue.serviceFees} />
              <LineItem label="Late Payment Fees" amount={data.revenue.lateFees} />
              <LineItem label="Total Revenue" amount={data.revenue.totalRevenue} bold />
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Expenses</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Platform Subscription" amount={data.expenses.platformSubscription} negative />
              <LineItem label="Operating Expenses" amount={data.expenses.operatingExpenses} negative />
              <LineItem label="Provision for Bad Debts" amount={data.expenses.provisionForBadDebts} negative />
              <LineItem label="Total Expenses" amount={data.expenses.totalExpenses} bold negative />
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Net Income</span>
                <span className={`text-lg font-bold ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPHP(Math.abs(data.netIncome))}
                  {data.netIncome < 0 && ' (Loss)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'balance' && (
        <div className="space-y-4">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Assets</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Cash and Cash Equivalents" amount={data.assets.cashOnHand} />
              <LineItem label="Loans Receivable" amount={data.assets.loansReceivable} />
              <LineItem label="Total Assets" amount={data.assets.totalAssets} bold />
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Liabilities</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Accounts Payable" amount={data.liabilities.accountsPayable} />
              <LineItem label="Total Liabilities" amount={data.liabilities.totalLiabilities} bold />
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Equity</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Retained Earnings" amount={data.equity.retainedEarnings} />
              <LineItem label="Total Equity" amount={data.equity.totalEquity} bold />
            </div>
          </div>
        </div>
      )}

      {activeView === 'cashflow' && (
        <div className="space-y-4">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Cash Flow from Operating Activities</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <LineItem label="Loan Repayments Received" amount={data.cashFlow.loanRepayments} />
              <LineItem label="Loan Disbursements" amount={data.cashFlow.loanDisbursements} negative />
              <LineItem label="Platform Subscription" amount={data.cashFlow.subscriptionPayments} negative />
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Net Cash Flow</span>
                <span className={`text-lg font-bold ${data.cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPHP(Math.abs(data.cashFlow.netCashFlow))}
                  {data.cashFlow.netCashFlow < 0 && ' (Outflow)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'projections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Based on current trends with 5% monthly growth assumption</p>
            <select
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(Number(e.target.value))}
              className="input-field w-auto text-sm py-1.5"
            >
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>24 Months</option>
            </select>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Projected Revenue vs Expenses</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-400" />
                  <span className="text-gray-600">Expenses</span>
                </div>
              </div>
            </div>

            <div className="h-52 flex items-end gap-1">
              {data.projections.map((p, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end h-44">
                    <div
                      className="flex-1 bg-green-500 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(1, (p.revenue / maxProjectionValue) * 100)}%` }}
                      title={`Revenue: ${formatPHP(p.revenue)}`}
                    />
                    <div
                      className="flex-1 bg-red-400 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(1, (p.expenses / maxProjectionValue) * 100)}%` }}
                      title={`Expenses: ${formatPHP(p.expenses)}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">{p.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Detailed Projections</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Net Income</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Receivable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.projections.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900 font-medium">{p.month}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatPHP(p.revenue)}</td>
                      <td className="px-4 py-2 text-right text-red-600">{formatPHP(p.expenses)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${p.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPHP(p.netIncome)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">{formatPHP(p.loansReceivable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function LineItem({ label, amount, bold, negative }: { label: string; amount: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 py-3 ${bold ? 'bg-gray-50' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${
        negative ? 'text-red-600' : 'text-gray-900'
      }`}>
        {negative && amount > 0 ? '(' : ''}{formatPHP(amount)}{negative && amount > 0 ? ')' : ''}
      </span>
    </div>
  );
}
