import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Users, Download, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Payment, formatAmount, getPaymentMethodLabel, getPaymentStatusColor, getPaymentStatusLabel } from '../../services/paymongoService';
import PaymentReceipt from './PaymentReceipt';

interface PaymentStats {
  totalRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = payments.filter(p =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.paymongo_payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPayments(filtered);
    } else {
      setFilteredPayments(payments);
    }
  }, [searchTerm, payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('paymongo_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPayments(data || []);

      const successfulPayments = data?.filter(p => p.status === 'succeeded') || [];
      const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalRevenue,
        successfulPayments: successfulPayments.length,
        pendingPayments: data?.filter(p =>
          p.status === 'pending' ||
          p.status === 'awaiting_payment_method' ||
          p.status === 'processing'
        ).length || 0,
        failedPayments: data?.filter(p => p.status === 'failed').length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Transaction ID', 'Description', 'Amount', 'Status', 'Payment Method'].join(','),
      ...filteredPayments.map(p => [
        new Date(p.created_at).toISOString(),
        p.paymongo_payment_id || 'N/A',
        `"${p.description || 'N/A'}"`,
        (p.amount / 100).toFixed(2),
        p.status,
        p.payment_method_type,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 mb-3">{error}</p>
        <button
          onClick={loadPayments}
          className="text-sm text-red-600 hover:text-red-700 font-medium underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (selectedPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentReceipt
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          showDownload={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment Management</h2>
        <p className="text-gray-600">Monitor and manage all payment transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-green-900">Total Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-green-700">{formatAmount(stats.totalRevenue)}</p>
          <p className="text-sm text-green-600 mt-1">From successful payments</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-blue-900">Successful</h3>
          </div>
          <p className="text-3xl font-bold text-blue-700">{stats.successfulPayments}</p>
          <p className="text-sm text-blue-600 mt-1">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-yellow-900">Pending</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-700">{stats.pendingPayments}</p>
          <p className="text-sm text-yellow-600 mt-1">Awaiting confirmation</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-600 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-red-900">Failed</h3>
          </div>
          <p className="text-3xl font-bold text-red-700">{stats.failedPayments}</p>
          <p className="text-sm text-red-600 mt-1">Unsuccessful payments</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by description or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={exportPayments}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No payments found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {(payment.paymongo_payment_id || 'N/A').substring(0, 15)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {payment.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getPaymentMethodLabel(payment.payment_method_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPaymentStatusColor(payment.status)}`}>
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

      <p className="text-sm text-gray-500 text-center">
        Showing {filteredPayments.length} of {payments.length} payments
      </p>
    </div>
  );
}
