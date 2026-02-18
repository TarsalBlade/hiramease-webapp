import { supabase } from '../lib/supabase';
import type {
  CreditApplication,
  BorrowerProfile,
  BorrowerCreditHistory,
  ScoringConfiguration,
  FactorExplanation,
  RiskLevel,
  Document,
} from '../types/database';

export interface ScoringInput {
  application: CreditApplication;
  borrower: BorrowerProfile;
  documents: Document[];
  creditHistory: BorrowerCreditHistory | null;
  config: ScoringConfiguration;
}

export interface ScoringResult {
  overallScore: number;
  riskLevel: RiskLevel;
  recommendation: 'approve' | 'reject' | 'review';
  incomeStabilityScore: number;
  dtiScore: number;
  creditHistoryScore: number;
  loanRiskScore: number;
  factorsExplanation: FactorExplanation[];
  borrowerExplanation: string;
  documentsVerified: boolean;
}

const DEFAULT_CONFIG: Omit<ScoringConfiguration, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  income_stability_weight: 0.30,
  dti_weight: 0.30,
  credit_history_weight: 0.25,
  loan_risk_weight: 0.15,
  low_risk_threshold: 720,
  medium_risk_threshold: 620,
  min_score: 300,
  max_score: 850,
};

export async function getOrCreateScoringConfig(tenantId: string): Promise<ScoringConfiguration> {
  const { data: existing } = await supabase
    .from('scoring_configurations')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing) {
    return existing as ScoringConfiguration;
  }

  const { data: created, error } = await supabase
    .from('scoring_configurations')
    .insert({
      tenant_id: tenantId,
      ...DEFAULT_CONFIG,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create scoring config: ${error.message}`);
  }

  return created as ScoringConfiguration;
}

export async function updateScoringConfig(
  tenantId: string,
  updates: Partial<Omit<ScoringConfiguration, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<ScoringConfiguration> {
  const { data, error } = await supabase
    .from('scoring_configurations')
    .update(updates)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update scoring config: ${error.message}`);
  }

  return data as ScoringConfiguration;
}

export function checkDocumentsVerified(documents: Document[]): boolean {
  if (documents.length === 0) return false;

  const requiredTypes = ['valid_id', 'proof_of_income'];
  const verifiedTypes = documents
    .filter((doc) => doc.verification_status === 'verified')
    .map((doc) => doc.document_type);

  return requiredTypes.every((type) => verifiedTypes.includes(type));
}

export function calculateIncomeStabilityScore(borrower: BorrowerProfile): { score: number; details: string[] } {
  let score = 40;
  const details: string[] = [];

  if (borrower.employment_status === 'employed') {
    score += 25;
    details.push('Employed status (+25)');
  } else if (borrower.employment_status === 'self_employed') {
    score += 20;
    details.push('Self-employed status (+20)');
  } else if (borrower.employment_status === 'retired') {
    score += 15;
    details.push('Retired status (+15)');
  } else if (borrower.employment_status === 'unemployed') {
    score += 0;
    details.push('Unemployed status (0)');
  } else {
    score += 10;
    details.push('Employment status not specified (+10 baseline)');
  }

  if (borrower.years_employed !== null && borrower.years_employed !== undefined) {
    if (borrower.years_employed >= 5) {
      score += 20;
      details.push('5+ years employment (+20)');
    } else if (borrower.years_employed >= 2) {
      score += 15;
      details.push('2-5 years employment (+15)');
    } else if (borrower.years_employed >= 1) {
      score += 10;
      details.push('1-2 years employment (+10)');
    } else {
      score += 5;
      details.push('Less than 1 year employment (+5)');
    }
  } else {
    score += 8;
    details.push('Employment duration not specified (+8 baseline)');
  }

  if (borrower.monthly_income_php !== null && borrower.monthly_income_php !== undefined) {
    if (borrower.monthly_income_php >= 100000) {
      score += 15;
      details.push('High income bracket (+15)');
    } else if (borrower.monthly_income_php >= 50000) {
      score += 12;
      details.push('Upper-middle income (+12)');
    } else if (borrower.monthly_income_php >= 25000) {
      score += 10;
      details.push('Middle income (+10)');
    } else if (borrower.monthly_income_php >= 10000) {
      score += 6;
      details.push('Lower-middle income (+6)');
    } else {
      score += 3;
      details.push('Lower income bracket (+3)');
    }
  } else {
    score += 5;
    details.push('Income not specified (+5 baseline)');
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

export function calculateDTIScore(
  borrower: BorrowerProfile,
  application: CreditApplication
): { score: number; details: string[] } {
  const details: string[] = [];

  if (!borrower.monthly_income_php || borrower.monthly_income_php <= 0) {
    details.push('No income information available');
    return { score: 30, details };
  }

  const estimatedMonthlyPayment = application.loan_amount_php / application.loan_term_months;
  const dtiRatio = (estimatedMonthlyPayment / borrower.monthly_income_php) * 100;

  details.push(`Monthly payment estimate: PHP ${estimatedMonthlyPayment.toLocaleString()}`);
  details.push(`Monthly income: PHP ${borrower.monthly_income_php.toLocaleString()}`);
  details.push(`DTI Ratio: ${dtiRatio.toFixed(1)}%`);

  let score: number;
  if (dtiRatio <= 20) {
    score = 100;
    details.push('Excellent DTI ratio (<=20%)');
  } else if (dtiRatio <= 30) {
    score = 85;
    details.push('Good DTI ratio (20-30%)');
  } else if (dtiRatio <= 40) {
    score = 70;
    details.push('Acceptable DTI ratio (30-40%)');
  } else if (dtiRatio <= 50) {
    score = 50;
    details.push('High DTI ratio (40-50%)');
  } else {
    score = 25;
    details.push('Very high DTI ratio (>50%)');
  }

  return { score, details };
}

export function calculateCreditHistoryScore(
  creditHistory: BorrowerCreditHistory | null
): { score: number; details: string[] } {
  const details: string[] = [];

  if (!creditHistory || creditHistory.total_loans === 0) {
    details.push('No previous credit history with this lender');
    details.push('New borrower - neutral baseline score applied');
    return { score: 70, details };
  }

  let score = 50;

  if (creditHistory.defaults > 0) {
    const defaultPenalty = Math.min(40, creditHistory.defaults * 20);
    score -= defaultPenalty;
    details.push(`${creditHistory.defaults} default(s) recorded (-${defaultPenalty})`);
  }

  if (creditHistory.late_payments > 0) {
    const latePenalty = Math.min(20, creditHistory.late_payments * 5);
    score -= latePenalty;
    details.push(`${creditHistory.late_payments} late payment(s) (-${latePenalty})`);
  }

  const totalPayments = creditHistory.on_time_payments + creditHistory.late_payments;
  if (totalPayments > 0) {
    const onTimeRate = (creditHistory.on_time_payments / totalPayments) * 100;
    if (onTimeRate >= 95) {
      score += 30;
      details.push(`Excellent payment history: ${onTimeRate.toFixed(0)}% on-time (+30)`);
    } else if (onTimeRate >= 85) {
      score += 20;
      details.push(`Good payment history: ${onTimeRate.toFixed(0)}% on-time (+20)`);
    } else if (onTimeRate >= 70) {
      score += 10;
      details.push(`Fair payment history: ${onTimeRate.toFixed(0)}% on-time (+10)`);
    }
  }

  if (creditHistory.total_loans >= 3 && creditHistory.defaults === 0) {
    score += 10;
    details.push('Established borrower with clean record (+10)');
  }

  if (creditHistory.total_repaid_php > 0) {
    const repaymentRatio = creditHistory.total_repaid_php / creditHistory.total_borrowed_php;
    if (repaymentRatio >= 0.9) {
      score += 10;
      details.push('Strong repayment history (+10)');
    }
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

export function calculateLoanRiskScore(
  application: CreditApplication,
  borrower: BorrowerProfile
): { score: number; details: string[] } {
  let score = 50;
  const details: string[] = [];

  if (application.collateral_estimated_value_php && application.collateral_estimated_value_php > 0) {
    const ltvRatio = (application.loan_amount_php / application.collateral_estimated_value_php) * 100;
    details.push(`Loan-to-Value ratio: ${ltvRatio.toFixed(1)}%`);

    if (ltvRatio <= 50) {
      score += 30;
      details.push('Excellent collateral coverage (LTV <=50%) (+30)');
    } else if (ltvRatio <= 70) {
      score += 20;
      details.push('Good collateral coverage (LTV 50-70%) (+20)');
    } else if (ltvRatio <= 80) {
      score += 10;
      details.push('Acceptable collateral coverage (LTV 70-80%) (+10)');
    } else {
      details.push('High LTV ratio - collateral may not fully cover loan');
    }
  } else {
    details.push('No collateral provided - unsecured loan');
    score -= 5;
  }

  if (borrower.monthly_income_php) {
    const incomeMultiple = application.loan_amount_php / (borrower.monthly_income_php * 12);
    details.push(`Loan amount: ${incomeMultiple.toFixed(1)}x annual income`);

    if (incomeMultiple <= 1) {
      score += 15;
      details.push('Conservative loan amount (+15)');
    } else if (incomeMultiple <= 2) {
      score += 10;
      details.push('Moderate loan amount (+10)');
    } else if (incomeMultiple <= 3) {
      score += 5;
      details.push('Higher loan amount relative to income (+5)');
    } else {
      details.push('Loan amount significantly exceeds annual income');
    }
  }

  if (application.loan_term_months <= 12) {
    score += 5;
    details.push('Short loan term - lower risk (+5)');
  } else if (application.loan_term_months <= 24) {
    score += 3;
    details.push('Medium loan term (+3)');
  } else if (application.loan_term_months > 48) {
    score -= 5;
    details.push('Long loan term - higher risk (-5)');
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

export function calculateFinalScore(
  incomeScore: number,
  dtiScore: number,
  creditHistoryScore: number,
  loanRiskScore: number,
  config: ScoringConfiguration
): number {
  const weightedSum =
    incomeScore * config.income_stability_weight +
    dtiScore * config.dti_weight +
    creditHistoryScore * config.credit_history_weight +
    loanRiskScore * config.loan_risk_weight;

  const scoreRange = config.max_score - config.min_score;
  const scaledScore = config.min_score + (weightedSum / 100) * scoreRange;

  return Math.round(Math.min(config.max_score, Math.max(config.min_score, scaledScore)));
}

export function determineRiskLevel(score: number, config: ScoringConfiguration): RiskLevel {
  if (score >= config.low_risk_threshold) return 'low';
  if (score >= config.medium_risk_threshold) return 'medium';
  return 'high';
}

export function determineRecommendation(riskLevel: RiskLevel): 'approve' | 'reject' | 'review' {
  switch (riskLevel) {
    case 'low':
      return 'approve';
    case 'medium':
      return 'review';
    case 'high':
      return 'reject';
  }
}

export function generateBorrowerExplanation(
  result: Omit<ScoringResult, 'borrowerExplanation'>,
  config: ScoringConfiguration
): string {
  const riskDescriptions = {
    low: 'Your application shows strong creditworthiness indicators.',
    medium: 'Your application shows moderate creditworthiness and requires additional review.',
    high: 'Your application shows areas of concern that may affect approval.',
  };

  const factors: string[] = [];

  if (result.incomeStabilityScore >= 70) {
    factors.push('stable employment and income');
  } else if (result.incomeStabilityScore < 50) {
    factors.push('income stability could be strengthened');
  }

  if (result.dtiScore >= 70) {
    factors.push('manageable debt-to-income ratio');
  } else if (result.dtiScore < 50) {
    factors.push('high debt relative to income');
  }

  if (result.creditHistoryScore >= 70) {
    factors.push('positive payment history');
  } else if (result.creditHistoryScore < 50) {
    factors.push('limited or concerning credit history');
  }

  if (result.loanRiskScore >= 70) {
    factors.push('appropriate loan structure');
  } else if (result.loanRiskScore < 50) {
    factors.push('loan amount or terms present higher risk');
  }

  const positiveFactors = factors.filter(
    (_, i) =>
      (i === 0 && result.incomeStabilityScore >= 70) ||
      (i === 1 && result.dtiScore >= 70) ||
      (i === 2 && result.creditHistoryScore >= 70) ||
      (i === 3 && result.loanRiskScore >= 70)
  );

  let explanation = `Your credit score is ${result.overallScore} out of ${config.max_score}. ${riskDescriptions[result.riskLevel]}`;

  if (positiveFactors.length > 0) {
    explanation += ` Key strengths include: ${positiveFactors.join(', ')}.`;
  }

  if (result.riskLevel === 'high') {
    explanation += ' Consider providing additional collateral or reducing the loan amount to improve your application.';
  } else if (result.riskLevel === 'medium') {
    explanation += ' A lending officer will review your application to make a final determination.';
  }

  explanation += ' This is an AI-assisted assessment. Final approval is subject to human review.';

  return explanation;
}

export async function runCreditScoring(input: ScoringInput): Promise<ScoringResult> {
  const documentsVerified = checkDocumentsVerified(input.documents);

  if (!documentsVerified) {
    throw new Error('Cannot run scoring: Required documents must be verified first');
  }

  const incomeResult = calculateIncomeStabilityScore(input.borrower);
  const dtiResult = calculateDTIScore(input.borrower, input.application);
  const creditHistoryResult = calculateCreditHistoryScore(input.creditHistory);
  const loanRiskResult = calculateLoanRiskScore(input.application, input.borrower);

  const overallScore = calculateFinalScore(
    incomeResult.score,
    dtiResult.score,
    creditHistoryResult.score,
    loanRiskResult.score,
    input.config
  );

  const riskLevel = determineRiskLevel(overallScore, input.config);
  const recommendation = determineRecommendation(riskLevel);

  const factorsExplanation: FactorExplanation[] = [
    {
      factor: 'Income Stability',
      score: incomeResult.score,
      weight: input.config.income_stability_weight,
      weighted_score: Math.round(incomeResult.score * input.config.income_stability_weight),
      description: 'Evaluates employment status, tenure, and income level',
      details: incomeResult.details,
    },
    {
      factor: 'Debt-to-Income Ratio',
      score: dtiResult.score,
      weight: input.config.dti_weight,
      weighted_score: Math.round(dtiResult.score * input.config.dti_weight),
      description: 'Measures ability to manage loan payments relative to income',
      details: dtiResult.details,
    },
    {
      factor: 'Credit History',
      score: creditHistoryResult.score,
      weight: input.config.credit_history_weight,
      weighted_score: Math.round(creditHistoryResult.score * input.config.credit_history_weight),
      description: 'Reviews past borrowing behavior with this lender',
      details: creditHistoryResult.details,
    },
    {
      factor: 'Loan Amount Risk',
      score: loanRiskResult.score,
      weight: input.config.loan_risk_weight,
      weighted_score: Math.round(loanRiskResult.score * input.config.loan_risk_weight),
      description: 'Assesses loan structure, collateral, and affordability',
      details: loanRiskResult.details,
    },
  ];

  const resultWithoutExplanation = {
    overallScore,
    riskLevel,
    recommendation,
    incomeStabilityScore: incomeResult.score,
    dtiScore: dtiResult.score,
    creditHistoryScore: creditHistoryResult.score,
    loanRiskScore: loanRiskResult.score,
    factorsExplanation,
    documentsVerified,
  };

  const borrowerExplanation = generateBorrowerExplanation(resultWithoutExplanation, input.config);

  return {
    ...resultWithoutExplanation,
    borrowerExplanation,
  };
}

export async function saveScoringResult(
  applicationId: string,
  result: ScoringResult,
  config: ScoringConfiguration
): Promise<void> {
  const { error } = await supabase.from('ai_scoring_results').upsert({
    application_id: applicationId,
    overall_score: result.overallScore,
    risk_level: result.riskLevel,
    recommendation: result.recommendation,
    income_stability_score: result.incomeStabilityScore,
    dti_score: result.dtiScore,
    credit_history_score: result.creditHistoryScore,
    loan_risk_score: result.loanRiskScore,
    factors_explanation: result.factorsExplanation,
    borrower_explanation: result.borrowerExplanation,
    documents_verified: result.documentsVerified,
    scoring_config_snapshot: config,
    score_breakdown: {
      income_stability: result.incomeStabilityScore,
      dti: result.dtiScore,
      credit_history: result.creditHistoryScore,
      loan_risk: result.loanRiskScore,
    },
    explanation: result.borrowerExplanation,
    model_version: '2.0',
    scored_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save scoring result: ${error.message}`);
  }

  await supabase
    .from('credit_applications')
    .update({ status: 'scored' })
    .eq('id', applicationId);
}

export async function logDecisionAudit(
  tenantId: string,
  userId: string,
  applicationId: string,
  decision: 'approved' | 'rejected',
  aiRecommendation: string,
  isOverride: boolean,
  overrideReason?: string
): Promise<void> {
  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    action: isOverride ? 'APPLICATION_DECISION_OVERRIDE' : 'APPLICATION_DECISION',
    entity_type: 'credit_application',
    entity_id: applicationId,
    new_values: {
      decision,
      ai_recommendation: aiRecommendation,
      is_override: isOverride,
      override_reason: overrideReason || null,
      decided_at: new Date().toISOString(),
    },
  });
}
