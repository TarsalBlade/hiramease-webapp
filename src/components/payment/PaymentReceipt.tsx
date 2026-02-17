import { CheckCircle, Download, Receipt, AlertCircle, Clock } from 'lucide-react';
import { Payment, formatAmount, getPaymentMethodLabel, getPaymentStatusColor, getPaymentStatusLabel } from '../../services/paymongoService';

interface PaymentReceiptProps {
  payment: Payment;
  onClose?: () => void;
  showDownload?: boolean;
}

export default function PaymentReceipt({ payment, onClose, showDownload = true }: PaymentReceiptProps) {
  const getStatusIcon = (status: string) => {
    if (status === 'succeeded') {
      return <CheckCircle className="w-12 h-12 text-green-600" />;
    } else if (status === 'failed') {
      return <AlertCircle className="w-12 h-12 text-red-600" />;
    } else {
      return <Clock className="w-12 h-12 text-yellow-600" />;
    }
  };

  const handleDownloadReceipt = () => {
    const receiptContent = `
PAYMENT RECEIPT
=====================================

Reference: ${payment.paymongo_payment_id || 'N/A'}
Amount: ${formatAmount(payment.amount)}
Status: ${getPaymentStatusLabel(payment.status)}
Payment Method: ${getPaymentMethodLabel(payment.payment_method_type)}
Description: ${payment.description || 'N/A'}
Date: ${new Date(payment.created_at).toLocaleString('en-PH')}

=====================================
Thank you for your payment!
`;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${(payment.paymongo_payment_id || 'unknown').substring(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-center justify-center mb-4">
          {getStatusIcon(payment.status)}
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">
          {payment.status === 'succeeded' ? 'Payment Successful!' :
           payment.status === 'failed' ? 'Payment Failed' :
           'Payment Processing'}
        </h2>
        <p className="text-center text-blue-100">
          {payment.status === 'succeeded' ? 'Your payment has been processed successfully' :
           payment.status === 'failed' ? 'We could not process your payment' :
           'Your payment is being processed'}
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center pb-6 border-b border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Amount Paid</p>
          <p className="text-4xl font-bold text-gray-900">{formatAmount(payment.amount)}</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`font-semibold ${getPaymentStatusColor(payment.status)}`}>
                {getPaymentStatusLabel(payment.status)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-semibold text-gray-900">{getPaymentMethodLabel(payment.payment_method_type)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Description</p>
            <p className="font-medium text-gray-900">{payment.description || 'No description'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
            <p className="font-mono text-xs text-gray-700 bg-gray-50 p-2 rounded break-all">
              {payment.paymongo_payment_id || 'Pending'}
            </p>
          </div>

          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium text-gray-900">
                {new Date(payment.created_at).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium text-gray-900">
                {new Date(payment.created_at).toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {payment.status === 'succeeded' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Payment Confirmed</p>
                <p>This payment has been successfully processed. Keep this receipt for your records.</p>
              </div>
            </div>
          </div>
        )}

        {payment.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Payment Processing</p>
                <p>Your payment is being processed. This may take a few moments. Check back soon for updates.</p>
              </div>
            </div>
          </div>
        )}

        {payment.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Payment Failed</p>
                <p>This payment could not be completed. Please try again or contact support if the problem persists.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {showDownload && payment.status === 'succeeded' && (
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
