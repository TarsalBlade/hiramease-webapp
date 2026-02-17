import type { InterestType } from '../types/database';

export interface LoanComputation {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  processingFee: number;
  serviceFee: number;
  insuranceFee: number;
  totalFees: number;
  netProceeds: number;
  schedule: AmortizationEntry[];
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function calculateLoan(
  principal: number,
  annualRate: number,
  termMonths: number,
  interestType: InterestType,
  processingFeePercent: number,
  serviceFeePercent: number,
  insuranceFeePercent: number
): LoanComputation {
  const monthlyRate = annualRate / 100 / 12;
  let monthlyPayment: number;
  let totalInterest: number;
  const schedule: AmortizationEntry[] = [];

  if (interestType === 'diminishing_balance') {
    if (monthlyRate === 0) {
      monthlyPayment = principal / termMonths;
      totalInterest = 0;
    } else {
      monthlyPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      totalInterest = monthlyPayment * termMonths - principal;
    }

    let balance = principal;
    for (let m = 1; m <= termMonths; m++) {
      const interestPart = balance * monthlyRate;
      const principalPart = monthlyPayment - interestPart;
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: principalPart,
        interest: interestPart,
        balance,
      });
    }
  } else if (interestType === 'flat') {
    totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    monthlyPayment = (principal + totalInterest) / termMonths;

    let balance = principal;
    const principalPart = principal / termMonths;
    const interestPart = totalInterest / termMonths;
    for (let m = 1; m <= termMonths; m++) {
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: principalPart,
        interest: interestPart,
        balance,
      });
    }
  } else {
    totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    monthlyPayment = (principal + totalInterest) / termMonths;

    let balance = principal + totalInterest;
    for (let m = 1; m <= termMonths; m++) {
      balance = Math.max(0, balance - monthlyPayment);
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: principal / termMonths,
        interest: totalInterest / termMonths,
        balance,
      });
    }
  }

  const processingFee = principal * (processingFeePercent / 100);
  const serviceFee = principal * (serviceFeePercent / 100);
  const insuranceFee = principal * (insuranceFeePercent / 100);
  const totalFees = processingFee + serviceFee + insuranceFee;

  return {
    monthlyPayment,
    totalInterest,
    totalAmount: principal + totalInterest,
    processingFee,
    serviceFee,
    insuranceFee,
    totalFees,
    netProceeds: principal - totalFees,
    schedule,
  };
}

export function formatPHP(amount: number): string {
  return `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
