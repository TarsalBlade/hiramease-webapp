import { useState } from 'react';
import { CreditCard, Smartphone, QrCode, AlertCircle, Lock } from 'lucide-react';
import {
  createCheckoutSession,
  pesosTocentavos,
} from '../../services/paymongoService';
import { validateAmount } from '../../utils/validation';
import ConfirmationModal from '../common/ConfirmationModal';

interface PaymentFormProps {
  amount: number;
  description: string;
  planId: string;
  tenantId: string;
  onError?: (error: string) => void;
  allowCustomAmount?: boolean;
}

const paymentMethods = [
  { type: 'card', icon: CreditCard, label: 'Card', description: 'Visa, Mastercard' },
  { type: 'gcash', icon: Smartphone, label: 'GCash', description: 'Digital wallet' },
  { type: 'grabpay', icon: Smartphone, label: 'GrabPay', description: 'Digital wallet' },
  { type: 'paymaya', icon: Smartphone, label: 'PayMaya', description: 'Digital wallet' },
  { type: 'qrph', icon: QrCode, label: 'QR Ph', description: 'Scan to pay' },
];

export default function PaymentForm({
  amount: initialAmount,
  description,
  planId,
  tenantId,
  onError,
  allowCustomAmount = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');

    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    const parsed = parseFloat(cleaned) || 0;
    setAmount(parsed);

    if (allowCustomAmount) {
      const validation = validateAmount(parsed);
      setValidationError(validation.error || '');
    }
  };

  const initiatePayment = () => {
    if (allowCustomAmount) {
      const validation = validateAmount(amount);
      if (!validation.isValid) {
        setValidationError(validation.error || '');
        return;
      }
    } else {
      // Fixed subscription amount — only require it to be positive
      if (!amount || amount <= 0) {
        setValidationError('Invalid payment amount.');
        return;
      }
    }
    setValidationError('');
    setShowConfirmation(true);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await createCheckoutSession({
        amount: pesosTocentavos(amount),
        description,
        planId,
        tenantId,
      });

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        setError('Could not redirect to payment page. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';

      let userFriendlyError = errorMessage;
      if (errorMessage.includes('not authenticated')) {
        userFriendlyError = 'Your session has expired. Please log in again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyError = 'Network error. Please check your internet connection and try again.';
      }

      setError(userFriendlyError);
      onError?.(userFriendlyError);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const isFormValid = !validationError && amount > 0 && !loading && (allowCustomAmount ? amount >= 100 : true);

  const selectedMethodLabel = paymentMethods.find(m => m.type === selectedMethod)?.label || selectedMethod;

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Amount to Pay</h3>
          {allowCustomAmount ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">P</span>
                <input
                  type="text"
                  value={amount === 0 ? '' : amount.toString()}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={`text-3xl font-bold bg-transparent border-b-2 outline-none w-full ${
                    validationError ? 'border-red-500 text-red-600' : 'border-blue-300 text-blue-600'
                  }`}
                  disabled={loading}
                />
              </div>
              {validationError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationError}</span>
                </div>
              )}
              <p className="text-sm text-blue-700">Min: P100.00 | Max: P100,000.00</p>
            </div>
          ) : (
            <p className="text-4xl font-bold text-blue-600">
              P{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-gray-700 mt-3 font-medium">{description}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-1 text-gray-700">Available Payment Methods</h3>
          <p className="text-xs text-gray-500 mb-3">
            You will choose your final payment method on the secure PayMongo checkout page.
          </p>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setSelectedMethod(type)}
                disabled={loading}
                className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-all text-sm disabled:opacity-50 ${
                  selectedMethod === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">Payment Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={initiatePayment}
          disabled={!isFormValid}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Redirecting to PayMongo...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>Pay P{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          You will be redirected to PayMongo's secure checkout page to complete your payment.
        </p>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        title="Confirm Payment"
        message={`You are about to pay P${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for ${description}. You will be redirected to PayMongo's secure checkout page. Proceed?`}
        confirmText="Yes, Proceed to Payment"
        cancelText="Cancel"
        type="warning"
        loading={loading}
        onConfirm={handlePayment}
        onCancel={() => setShowConfirmation(false)}
      />
    </>
  );
}
