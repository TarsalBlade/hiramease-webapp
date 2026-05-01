import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Clock, Download, Search, Building2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatAmount, getPaymentMethodLabel, getPaymentStatusColor, getPaymentStatusLabel } from '../../services/paymongoService';
import PaymentReceipt from './PaymentReceipt';
import type { Payment } from '../../services/paymongoService';

interface PaymentWithCompany extends Payment {
  company_name?: string;
  plan_name?: string;
}

interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentWithCompany[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => { loadPayments(); }, []);

  useEffect(() => {
    let result = payments;

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter(p =>
          p.status === 'pending' ||
          p.status === 'awaiting_payment_method' ||
          p.status === 'processing'
        );
      } else {
        result = result.filter(p => p.status === statusFilter);
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.description?.toLowerCase().includes(q) ||
        p.paymongo_payment_id?.toLowerCase().includes(q) ||
        p.company_name?.toLowerCase().includes(q) ||
        p.plan_name?.toLowerCase().includes(q)
      );
    }

    setFilteredPayments(result);
  }, [searchTerm, statusFilter, payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all payments with tenant company_name joined
      const { data, error: fetchError } = await supabase
        .from('paymongo_payments')
        .select(`*, tenant:tenants(company_name)`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Resolve plan names: build a map from plan_id -> plan_name
      const planIds = [...new Set(
        (data || [])
          .map((r: any) => r.metadata?.plan_id)
          .filter(Boolean)
      )];

      let planMap: Record<string, string> = {};
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('id, name')
          .in('id', planIds);
        planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p.name]));
      }

      const enriched: PaymentWithCompany[] = (data || []).map((row: any) => ({
        ...row,
        company_name: row.tenant?.company_name ?? null,
        plan_name: planMap[row.metadata?.plan_id] ?? null,
      }));

      setPayments(enriched);

      const successful = enriched.filter(p => p.status === 'succeeded');
      const totalRevenue = successful.reduce((sum, p) => sum + (p.amount ?? 0), 0);

      setStats({
        totalRevenue,
        successfulPayments: successful.length,
        pendingPayments: enriched.filter(p =>
          ['pending', 'awaiting_payment_method', 'processing'].includes(p.status)
        ).length,
        failedPayments: enriched.filter(p => p.status === 'failed').length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Transaction ID', 'Company', 'Plan', 'Description', 'Amount (PHP)', 'Method', 'Status'].join(','),
      ...filteredPayments.map(p => [
        new Date(p.created_at).toISOString(),
        p.paymongo_payment_id || 'N/A',
        `"${p.company_name || 'N/A'}"`,
        `"${p.plan_name || 'N/A'}"`,
        `"${p.description || 'N/A'}"`,
        ((p.amount ?? 0) / 100).toFixed(2),
        getPaymentMethodLabel(p.payment_method_type),
        p.status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiramease-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={loadPayments} className="text-sm text-red-600 hover:text-red-700 font-medium underline">
          Try Again
        </button>
      </div>
    );
  }

  if (selectedPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentReceipt payment={selectedPayment} onClose={() => setSelectedPayment(null)} showDownload={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Management</h2>
          <p className="text-gray-500 text-sm">All subscription payments from every lending company</p>
        </div>
        <button
          onClick={loadPayments}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-green-900">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatAmount(stats.totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">From successful payments</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-blue-900">Successful</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.successfulPayments}</p>
          <p className="text-xs text-blue-600 mt-1">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-yellow-900">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{stats.pendingPayments}</p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting confirmation</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-red-900">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.failedPayments}</p>
          <p className="text-xs text-red-600 mt-1">Unsuccessful payments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, plan, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="succeeded">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={exportPayments}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No payments found</p>
          <p className="text-gray-400 text-sm mt-1">Payments will appear here once companies subscribe</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {payment.company_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[140px]">{payment.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unknown</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                      {payment.plan_name ?? <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {payment.paymongo_payment_id
                        ? payment.paymongo_payment_id.substring(0, 18) + '…'
                        : 'N/A'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getPaymentMethodLabel(payment.payment_method_type)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatAmount(payment.amount ?? 0)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                        payment.status === 'failed'    ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {getPaymentStatusLabel(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Showing {filteredPayments.length} of {payments.length} total payments
      </p>
    </div>
  );
}
