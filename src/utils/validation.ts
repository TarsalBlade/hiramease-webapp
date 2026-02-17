export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateAmount = (amount: number): ValidationResult => {
  if (isNaN(amount)) {
    return {
      isValid: false,
      error: 'Please enter a valid number',
    };
  }

  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
    };
  }

  if (amount < 100) {
    return {
      isValid: false,
      error: 'Minimum payment amount is ₱100.00',
    };
  }

  if (amount > 100000) {
    return {
      isValid: false,
      error: 'Maximum payment amount is ₱100,000.00. For larger amounts, please contact support.',
    };
  }

  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'Amount can only have up to 2 decimal places',
    };
  }

  return { isValid: true };
};

export const validateDescription = (description: string): ValidationResult => {
  if (!description || description.trim().length === 0) {
    return {
      isValid: false,
      error: 'Description is required',
    };
  }

  if (description.length < 3) {
    return {
      isValid: false,
      error: 'Description must be at least 3 characters long',
    };
  }

  if (description.length > 200) {
    return {
      isValid: false,
      error: 'Description must not exceed 200 characters',
    };
  }

  return { isValid: true };
};

export const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/[^0-9.]/g, '');

  const parts = numericValue.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].substring(0, 2);
  }

  return numericValue;
};

export const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
