import { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  getUserPayments,
  Payment,
  formatAmount,
  getPaymentMethodLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
} from '../../services/paymongoService';
import PaymentReceipt from './PaymentReceipt';

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredPayments(payments);
    } else if (filter === 'pending') {
      setFilteredPayments(payments.filter(p =>
        p.status === 'pending' || p.status === 'awaiting_payment_method' || p.status === 'processing'
      ));
    } else {
      setFilteredPayments(payments.filter(p => p.status === filter));
    }
  }, [filter, payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getUserPayments();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const getFilterIcon = (filterType: typeof filter) => {
    switch (filterType) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Filter className="w-4 h-4" />;
    }
  };

  const stats = {
    total: payments.length,
    succeeded: payments.filter(p => p.status === 'succeeded').length,
    pending: payments.filter(p => p.status === 'pending' || p.status === 'awaiting_payment_method' || p.status === 'processing').length,
    failed: payments.filter(p => p.status === 'failed').length,
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
      <PaymentReceipt
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No payment history yet</p>
        <p className="text-sm text-gray-500">Your payment transactions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment History</h3>
        <button
          onClick={loadPayments}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`p-3 rounded-lg border-2 transition-all ${
            filter === 'all'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {getFilterIcon('all')}
            <span className="font-semibold text-lg">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-600">All</p>
        </button>

        <button
          onClick={() => setFilter('succeeded')}
          className={`p-3 rounded-lg border-2 transition-all ${
            filter === 'succeeded'
              ? 'border-green-600 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {getFilterIcon('succeeded')}
            <span className="font-semibold text-lg text-green-600">{stats.succeeded}</span>
          </div>
          <p className="text-xs text-gray-600">Paid</p>
        </button>

        <button
          onClick={() => setFilter('pending')}
          className={`p-3 rounded-lg border-2 transition-all ${
            filter === 'pending'
              ? 'border-yellow-600 bg-yellow-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {getFilterIcon('pending')}
            <span className="font-semibold text-lg text-yellow-600">{stats.pending}</span>
          </div>
          <p className="text-xs text-gray-600">Pending</p>
        </button>

        <button
          onClick={() => setFilter('failed')}
          className={`p-3 rounded-lg border-2 transition-all ${
            filter === 'failed'
              ? 'border-red-600 bg-red-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {getFilterIcon('failed')}
            <span className="font-semibold text-lg text-red-600">{stats.failed}</span>
          </div>
          <p className="text-xs text-gray-600">Failed</p>
        </button>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {filter !== 'all' ? filter : ''} payments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <button
              key={payment.id}
              onClick={() => setSelectedPayment(payment)}
              className="w-full border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{payment.description || 'Payment'}</p>
                  <p className="text-sm text-gray-600">
                    {getPaymentMethodLabel(payment.payment_method_type)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatAmount(payment.amount)}</p>
                  <p className={`text-sm font-medium ${getPaymentStatusColor(payment.status)}`}>
                    {getPaymentStatusLabel(payment.status)}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                <span className="font-mono">ID: {(payment.paymongo_payment_id || 'N/A').substring(0, 20)}...</span>
                <span>
                  {new Date(payment.created_at).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}