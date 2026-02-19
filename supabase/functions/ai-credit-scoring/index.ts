import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BorrowerData {
  id: string;
  user_id: string;
  tenant_id: string;
  date_of_birth: string | null;
  gender: string | null;
  civil_status: string | null;
  employment_status: string | null;
  employer_name: string | null;
  job_title: string | null;
  monthly_income_php: number | null;
  other_monthly_income_php: number | null;
  existing_debts_php: number | null;
  years_employed: number | null;
  address: string | null;
  city: string | null;
  province: string | null;
  tin: string | null;
}

interface ApplicationData {
  id: string;
  borrower_id: string;
  tenant_id: string;
  loan_amount_php: number;
  loan_purpose: string;
  loan_term_months: number;
  collateral_type: string | null;
  collateral_estimated_value_php: number | null;
  status: string;
}

interface CreditHistory {
  total_loans: number;
  on_time_payments: number;
  late_payments: number;
  defaults: number;
  total_borrowed_php: number;
  total_repaid_php: number;
  last_loan_date: string | null;
}

interface ScoringConfig {
  income_stability_weight: number;
  dti_weight: number;
  credit_history_weight: number;
  loan_risk_weight: number;
  low_risk_threshold: number;
  medium_risk_threshold: number;
  min_score: number;
  max_score: number;
}

interface DocumentInfo {
  document_type: string;
  verification_status: string;
}

interface FactorResult {
  factor: string;
  score: number;
  weight: number;
  weighted_score: number;
  description: string;
  details: string[];
  risk_signals: string[];
  positive_signals: string[];
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function scoreIncomeStability(
  borrower: BorrowerData,
  _docs: DocumentInfo[]
): FactorResult {
  let score = 0;
  const details: string[] = [];
  const risk_signals: string[] = [];
  const positive_signals: string[] = [];

  const employmentScores: Record<string, number> = {
    employed: 30,
    self_employed: 22,
    retired: 18,
    student: 5,
    unemployed: 0,
  };
  const empScore = employmentScores[borrower.employment_status || ""] ?? 10;
  score += empScore;
  if (borrower.employment_status === "employed") {
    positive_signals.push("Stable employment status");
    details.push(`Employment: Employed (+${empScore})`);
  } else if (borrower.employment_status === "self_employed") {
    details.push(`Employment: Self-employed (+${empScore})`);
    risk_signals.push("Self-employment income may be variable");
  } else if (borrower.employment_status === "unemployed") {
    risk_signals.push("Currently unemployed - no stable income source");
    details.push("Employment: Unemployed (+0)");
  } else {
    details.push(
      `Employment: ${borrower.employment_status || "Unknown"} (+${empScore})`
    );
  }

  if (borrower.years_employed != null) {
    let tenureScore = 0;
    if (borrower.years_employed >= 10) {
      tenureScore = 25;
      positive_signals.push(
        `Long tenure: ${borrower.years_employed} years of employment`
      );
    } else if (borrower.years_employed >= 5) {
      tenureScore = 20;
      positive_signals.push("Solid employment tenure (5+ years)");
    } else if (borrower.years_employed >= 3) {
      tenureScore = 15;
    } else if (borrower.years_employed >= 1) {
      tenureScore = 10;
    } else {
      tenureScore = 3;
      risk_signals.push("Very short employment tenure (<1 year)");
    }
    score += tenureScore;
    details.push(`Tenure: ${borrower.years_employed} years (+${tenureScore})`);
  } else {
    score += 5;
    details.push("Tenure: Not provided (+5 baseline)");
    risk_signals.push("Employment tenure not disclosed");
  }

  const totalIncome =
    (borrower.monthly_income_php || 0) +
    (borrower.other_monthly_income_php || 0);
  if (totalIncome > 0) {
    let incomeScore = 0;
    if (totalIncome >= 150000) {
      incomeScore = 25;
      positive_signals.push("High income bracket");
    } else if (totalIncome >= 80000) {
      incomeScore = 20;
      positive_signals.push("Upper-middle income");
    } else if (totalIncome >= 40000) {
      incomeScore = 16;
    } else if (totalIncome >= 20000) {
      incomeScore = 12;
    } else if (totalIncome >= 10000) {
      incomeScore = 8;
      risk_signals.push("Lower income bracket - higher financial stress risk");
    } else {
      incomeScore = 4;
      risk_signals.push("Very low reported income");
    }
    score += incomeScore;
    details.push(
      `Total Monthly Income: PHP ${totalIncome.toLocaleString()} (+${incomeScore})`
    );
  } else {
    score += 3;
    details.push("Income: Not provided (+3 baseline)");
    risk_signals.push("No income information provided");
  }

  if (borrower.employer_name) {
    score += 5;
    details.push(`Employer disclosed: ${borrower.employer_name} (+5)`);
  }

  if (borrower.tin) {
    score += 5;
    details.push("TIN provided (+5)");
    positive_signals.push("Tax identification provided - income verifiable");
  }

  const age = calculateAge(borrower.date_of_birth);
  if (age != null) {
    let ageScore = 0;
    if (age >= 25 && age <= 55) {
      ageScore = 10;
      details.push(`Age: ${age} - prime working age (+${ageScore})`);
    } else if (age >= 21 && age < 25) {
      ageScore = 6;
      details.push(`Age: ${age} - early career (+${ageScore})`);
    } else if (age > 55 && age <= 65) {
      ageScore = 7;
      details.push(`Age: ${age} - approaching retirement (+${ageScore})`);
    } else {
      ageScore = 3;
      details.push(`Age: ${age} (+${ageScore})`);
      if (age > 65) risk_signals.push("Age above 65 - higher health risk");
    }
    score += ageScore;
  }

  return {
    factor: "Income & Employment Stability",
    score: Math.min(100, Math.max(0, score)),
    weight: 0,
    weighted_score: 0,
    description:
      "Evaluates employment status, tenure, income level, and earning stability",
    details,
    risk_signals,
    positive_signals,
  };
}

function scoreDTI(
  borrower: BorrowerData,
  application: ApplicationData
): FactorResult {
  const details: string[] = [];
  const risk_signals: string[] = [];
  const positive_signals: string[] = [];

  const monthlyIncome =
    (borrower.monthly_income_php || 0) +
    (borrower.other_monthly_income_php || 0);

  if (monthlyIncome <= 0) {
    return {
      factor: "Debt-to-Income Analysis",
      score: 20,
      weight: 0,
      weighted_score: 0,
      description:
        "Measures ability to service loan payments relative to income",
      details: [
        "Cannot calculate DTI - no income information available",
        "Assigned minimum baseline score",
      ],
      risk_signals: [
        "DTI analysis impossible without income data - major risk factor",
      ],
      positive_signals: [],
    };
  }

  const estimatedMonthlyPayment =
    application.loan_amount_php / application.loan_term_months;
  const existingDebts = borrower.existing_debts_php || 0;
  const loanDti = (estimatedMonthlyPayment / monthlyIncome) * 100;
  const totalDti =
    ((estimatedMonthlyPayment + existingDebts) / monthlyIncome) * 100;
  const disposableAfterLoan = monthlyIncome - estimatedMonthlyPayment - existingDebts;

  details.push(
    `Monthly income: PHP ${monthlyIncome.toLocaleString()}`
  );
  details.push(
    `Est. monthly payment: PHP ${estimatedMonthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  );
  details.push(`Existing monthly debts: PHP ${existingDebts.toLocaleString()}`);
  details.push(`Loan DTI: ${loanDti.toFixed(1)}%`);
  details.push(`Total DTI (with existing debts): ${totalDti.toFixed(1)}%`);
  details.push(
    `Disposable income after loan: PHP ${disposableAfterLoan.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  );

  let score: number;
  if (totalDti <= 15) {
    score = 100;
    positive_signals.push(
      "Excellent DTI ratio - very comfortable repayment capacity"
    );
  } else if (totalDti <= 25) {
    score = 88;
    positive_signals.push("Good DTI ratio - comfortable repayment capacity");
  } else if (totalDti <= 35) {
    score = 72;
    details.push("DTI is within acceptable range but approaching limits");
  } else if (totalDti <= 45) {
    score = 50;
    risk_signals.push("High DTI ratio - loan may strain borrower finances");
  } else if (totalDti <= 55) {
    score = 30;
    risk_signals.push(
      "Very high DTI ratio - significant risk of payment difficulty"
    );
  } else {
    score = 12;
    risk_signals.push(
      "Extremely high DTI ratio - borrower likely unable to sustain payments"
    );
  }

  if (disposableAfterLoan < 5000 && disposableAfterLoan >= 0) {
    risk_signals.push(
      "Very thin margin after loan payments - vulnerable to income shocks"
    );
    score = Math.max(10, score - 10);
  } else if (disposableAfterLoan < 0) {
    risk_signals.push(
      "NEGATIVE disposable income after loan - cannot afford this loan"
    );
    score = 5;
  }

  return {
    factor: "Debt-to-Income Analysis",
    score: Math.min(100, Math.max(0, score)),
    weight: 0,
    weighted_score: 0,
    description:
      "Measures ability to service loan payments relative to income",
    details,
    risk_signals,
    positive_signals,
  };
}

function scoreCreditHistory(history: CreditHistory | null): FactorResult {
  const details: string[] = [];
  const risk_signals: string[] = [];
  const positive_signals: string[] = [];

  if (!history || history.total_loans === 0) {
    return {
      factor: "Credit History & Payment Behavior",
      score: 55,
      weight: 0,
      weighted_score: 0,
      description:
        "Reviews past borrowing behavior, payment punctuality, and creditworthiness",
      details: [
        "No previous credit history with this lending platform",
        "Assigned neutral baseline score for new borrowers",
      ],
      risk_signals: [
        "No prior lending relationship - unproven payment behavior",
      ],
      positive_signals: ["Clean slate - no negative records"],
    };
  }

  let score = 40;

  if (history.defaults > 0) {
    const penalty = Math.min(45, history.defaults * 25);
    score -= penalty;
    risk_signals.push(
      `${history.defaults} loan default(s) on record - severe negative indicator`
    );
    details.push(`Defaults: ${history.defaults} (-${penalty})`);
  } else {
    positive_signals.push("Zero defaults on record");
    score += 10;
    details.push("No defaults (+10)");
  }

  if (history.late_payments > 0) {
    const penalty = Math.min(25, history.late_payments * 5);
    score -= penalty;
    if (history.late_payments >= 5) {
      risk_signals.push("Frequent late payments indicate poor financial discipline");
    }
    details.push(`Late payments: ${history.late_payments} (-${penalty})`);
  }

  const totalPayments = history.on_time_payments + history.late_payments;
  if (totalPayments > 0) {
    const onTimeRate = (history.on_time_payments / totalPayments) * 100;
    if (onTimeRate >= 98) {
      score += 30;
      positive_signals.push(
        `Excellent payment punctuality: ${onTimeRate.toFixed(0)}% on-time`
      );
    } else if (onTimeRate >= 90) {
      score += 22;
      positive_signals.push("Strong payment track record");
    } else if (onTimeRate >= 80) {
      score += 12;
    } else if (onTimeRate >= 65) {
      score += 5;
      risk_signals.push("Below-average payment punctuality");
    }
    details.push(
      `Payment record: ${history.on_time_payments}/${totalPayments} on-time (${onTimeRate.toFixed(0)}%)`
    );
  }

  if (history.total_loans >= 5 && history.defaults === 0) {
    score += 12;
    positive_signals.push(
      "Established borrower with clean multi-loan track record"
    );
    details.push("Established borrower bonus (+12)");
  } else if (history.total_loans >= 3 && history.defaults === 0) {
    score += 8;
    details.push("Returning borrower bonus (+8)");
  }

  if (
    history.total_borrowed_php > 0 &&
    history.total_repaid_php > 0
  ) {
    const repaymentRatio =
      history.total_repaid_php / history.total_borrowed_php;
    if (repaymentRatio >= 0.95) {
      score += 8;
      positive_signals.push("Near-complete repayment of all borrowed funds");
      details.push(`Repayment ratio: ${(repaymentRatio * 100).toFixed(0)}% (+8)`);
    } else if (repaymentRatio >= 0.8) {
      score += 5;
      details.push(`Repayment ratio: ${(repaymentRatio * 100).toFixed(0)}% (+5)`);
    }
    details.push(
      `Total borrowed: PHP ${history.total_borrowed_php.toLocaleString()}, Repaid: PHP ${history.total_repaid_php.toLocaleString()}`
    );
  }

  return {
    factor: "Credit History & Payment Behavior",
    score: Math.min(100, Math.max(0, score)),
    weight: 0,
    weighted_score: 0,
    description:
      "Reviews past borrowing behavior, payment punctuality, and creditworthiness",
    details,
    risk_signals,
    positive_signals,
  };
}

function scoreLoanRisk(
  application: ApplicationData,
  borrower: BorrowerData,
  docs: DocumentInfo[]
): FactorResult {
  let score = 45;
  const details: string[] = [];
  const risk_signals: string[] = [];
  const positive_signals: string[] = [];

  if (
    application.collateral_estimated_value_php &&
    application.collateral_estimated_value_php > 0
  ) {
    const ltv =
      (application.loan_amount_php /
        application.collateral_estimated_value_php) *
      100;
    details.push(`Loan-to-Value: ${ltv.toFixed(1)}%`);

    if (ltv <= 40) {
      score += 30;
      positive_signals.push(
        "Excellent collateral coverage - low LTV protects lender"
      );
    } else if (ltv <= 60) {
      score += 22;
      positive_signals.push("Good collateral coverage");
    } else if (ltv <= 75) {
      score += 12;
      details.push("Acceptable LTV ratio");
    } else if (ltv <= 90) {
      score += 5;
      risk_signals.push("High LTV - limited collateral protection");
    } else {
      risk_signals.push(
        "LTV exceeds 90% - collateral insufficient for loan amount"
      );
    }
    details.push(
      `Collateral: ${application.collateral_type} (PHP ${application.collateral_estimated_value_php.toLocaleString()})`
    );
  } else {
    risk_signals.push("Unsecured loan - no collateral provided");
    details.push("Unsecured loan (-5)");
    score -= 5;
  }

  const totalIncome =
    (borrower.monthly_income_php || 0) +
    (borrower.other_monthly_income_php || 0);
  if (totalIncome > 0) {
    const annualIncome = totalIncome * 12;
    const multiple = application.loan_amount_php / annualIncome;
    details.push(`Loan: ${multiple.toFixed(1)}x annual income`);

    if (multiple <= 0.5) {
      score += 15;
      positive_signals.push("Conservative loan amount relative to income");
    } else if (multiple <= 1.0) {
      score += 10;
    } else if (multiple <= 2.0) {
      score += 5;
    } else if (multiple <= 3.0) {
      risk_signals.push("Loan amount exceeds 2x annual income");
    } else {
      risk_signals.push(
        "Loan amount far exceeds income - high default probability"
      );
      score -= 10;
    }
  }

  if (application.loan_term_months <= 6) {
    score += 8;
    details.push("Short term loan - lower exposure (+8)");
  } else if (application.loan_term_months <= 12) {
    score += 5;
    details.push("Standard term (+5)");
  } else if (application.loan_term_months <= 24) {
    score += 2;
  } else if (application.loan_term_months > 36) {
    score -= 5;
    risk_signals.push("Long loan term increases default risk");
    details.push("Long term (-5)");
  }

  const verifiedDocs = docs.filter(
    (d) => d.verification_status === "verified"
  );
  const hasId = verifiedDocs.some((d) => d.document_type === "valid_id");
  const hasIncome = verifiedDocs.some(
    (d) => d.document_type === "proof_of_income"
  );
  const hasBilling = verifiedDocs.some(
    (d) => d.document_type === "proof_of_billing"
  );

  if (hasId && hasIncome) {
    score += 5;
    positive_signals.push("Core documents verified (ID + income proof)");
  }
  if (hasBilling) {
    score += 3;
    positive_signals.push("Address verified via billing document");
  }

  const loanPurposeLower = (application.loan_purpose || "").toLowerCase();
  const productivePurposes = [
    "business",
    "education",
    "medical",
    "home",
    "renovation",
  ];
  const riskyPurposes = ["gambling", "travel", "luxury"];

  if (productivePurposes.some((p) => loanPurposeLower.includes(p))) {
    score += 3;
    positive_signals.push("Productive loan purpose");
    details.push(`Purpose "${application.loan_purpose}" is productive (+3)`);
  } else if (riskyPurposes.some((p) => loanPurposeLower.includes(p))) {
    score -= 3;
    risk_signals.push("Loan purpose may indicate higher default risk");
    details.push(`Purpose "${application.loan_purpose}" is higher risk (-3)`);
  }

  return {
    factor: "Loan Structure & Collateral Risk",
    score: Math.min(100, Math.max(0, score)),
    weight: 0,
    weighted_score: 0,
    description:
      "Assesses loan amount, collateral coverage, term length, and overall structure",
    details,
    risk_signals,
    positive_signals,
  };
}

function computeFinalScore(
  factors: FactorResult[],
  config: ScoringConfig
): {
  overallScore: number;
  riskLevel: string;
  recommendation: string;
  factors: FactorResult[];
  riskSummary: string[];
  strengthSummary: string[];
  borrowerExplanation: string;
} {
  const weights = [
    config.income_stability_weight,
    config.dti_weight,
    config.credit_history_weight,
    config.loan_risk_weight,
  ];

  factors.forEach((f, i) => {
    f.weight = weights[i];
    f.weighted_score = Math.round(f.score * weights[i]);
  });

  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const range = config.max_score - config.min_score;
  const overallScore = Math.round(
    Math.min(
      config.max_score,
      Math.max(config.min_score, config.min_score + (weightedSum / 100) * range)
    )
  );

  let riskLevel: string;
  if (overallScore >= config.low_risk_threshold) riskLevel = "low";
  else if (overallScore >= config.medium_risk_threshold) riskLevel = "medium";
  else riskLevel = "high";

  let recommendation: string;
  if (riskLevel === "low") recommendation = "approve";
  else if (riskLevel === "medium") recommendation = "review";
  else recommendation = "reject";

  const allRisks = factors.flatMap((f) => f.risk_signals);
  const allStrengths = factors.flatMap((f) => f.positive_signals);

  const criticalRisks = allRisks.filter(
    (r) =>
      r.includes("NEGATIVE disposable") ||
      r.includes("default") ||
      r.includes("Extremely high DTI") ||
      r.includes("unemployed")
  );
  if (criticalRisks.length >= 2 && recommendation !== "reject") {
    recommendation = "reject";
    riskLevel = "high";
  }

  const riskDesc: Record<string, string> = {
    low: "Your application demonstrates strong creditworthiness. Based on our analysis, you present a low risk profile.",
    medium:
      "Your application shows moderate creditworthiness. Some factors require additional review before a final determination.",
    high: "Your application has identified areas of concern that significantly affect the credit assessment.",
  };

  let borrowerExplanation = `Your credit score is ${overallScore} out of ${config.max_score}. ${riskDesc[riskLevel]}`;

  if (allStrengths.length > 0) {
    const topStrengths = allStrengths.slice(0, 3);
    borrowerExplanation += ` Key strengths: ${topStrengths.join("; ")}.`;
  }

  if (riskLevel === "high" && allRisks.length > 0) {
    borrowerExplanation +=
      " Areas for improvement: consider increasing income documentation, reducing existing debts, or providing collateral to strengthen your application.";
  } else if (riskLevel === "medium") {
    borrowerExplanation +=
      " A lending officer will review the full details to make a final determination.";
  }

  borrowerExplanation +=
    " This is an AI-assisted assessment. Final approval is subject to human review by the lending institution.";

  return {
    overallScore,
    riskLevel,
    recommendation,
    factors,
    riskSummary: allRisks,
    strengthSummary: allStrengths,
    borrowerExplanation,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: callerProfile } = await userClient
      .from("user_profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !callerProfile ||
      callerProfile.role !== "lending_admin" ||
      !callerProfile.tenant_id
    ) {
      return new Response(
        JSON.stringify({ error: "Forbidden: lending_admin role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return new Response(
        JSON.stringify({ error: "application_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const tenantId = callerProfile.tenant_id;

    const { data: application, error: appError } = await adminClient
      .from("credit_applications")
      .select("*")
      .eq("id", application_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: borrower } = await adminClient
      .from("borrower_profiles")
      .select("*")
      .eq("id", application.borrower_id)
      .maybeSingle();

    if (!borrower) {
      return new Response(
        JSON.stringify({ error: "Borrower profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const [docsResult, historyResult, configResult] = await Promise.all([
      adminClient
        .from("documents")
        .select("document_type, verification_status")
        .eq("application_id", application_id),
      adminClient
        .from("borrower_credit_history")
        .select("*")
        .eq("borrower_id", application.borrower_id)
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      adminClient
        .from("scoring_configurations")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    const docs: DocumentInfo[] = docsResult.data || [];
    const creditHistory: CreditHistory | null = historyResult.data;

    const config: ScoringConfig = configResult.data || {
      income_stability_weight: 0.3,
      dti_weight: 0.3,
      credit_history_weight: 0.25,
      loan_risk_weight: 0.15,
      low_risk_threshold: 720,
      medium_risk_threshold: 620,
      min_score: 300,
      max_score: 850,
    };

    const incomeResult = scoreIncomeStability(borrower, docs);
    const dtiResult = scoreDTI(borrower, application);
    const creditResult = scoreCreditHistory(creditHistory);
    const loanResult = scoreLoanRisk(application, borrower, docs);

    const allFactors = [incomeResult, dtiResult, creditResult, loanResult];
    const final = computeFinalScore(allFactors, config);

    const allDocsVerified = docs.length > 0 &&
      docs.filter((d) => ["valid_id", "proof_of_income"].includes(d.document_type))
        .every((d) => d.verification_status === "verified");

    const { error: upsertError } = await adminClient
      .from("ai_scoring_results")
      .upsert({
        application_id,
        overall_score: final.overallScore,
        risk_level: final.riskLevel,
        recommendation: final.recommendation,
        income_stability_score: incomeResult.score,
        dti_score: dtiResult.score,
        credit_history_score: creditResult.score,
        loan_risk_score: loanResult.score,
        factors_explanation: final.factors,
        borrower_explanation: final.borrowerExplanation,
        documents_verified: allDocsVerified,
        scoring_config_snapshot: config,
        score_breakdown: {
          income_stability: incomeResult.score,
          dti: dtiResult.score,
          credit_history: creditResult.score,
          loan_risk: loanResult.score,
        },
        explanation: final.borrowerExplanation,
        model_version: "3.0-ai",
        scored_at: new Date().toISOString(),
      });

    if (upsertError) {
      return new Response(
        JSON.stringify({
          error: "Failed to save scoring results",
          details: upsertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await adminClient
      .from("credit_applications")
      .update({ status: "scored" })
      .eq("id", application_id);

    await adminClient.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: "AI_CREDIT_SCORING",
      entity_type: "credit_application",
      entity_id: application_id,
      new_values: {
        overall_score: final.overallScore,
        risk_level: final.riskLevel,
        recommendation: final.recommendation,
        model_version: "3.0-ai",
        scored_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        score: final.overallScore,
        risk_level: final.riskLevel,
        recommendation: final.recommendation,
        factors: final.factors,
        risk_summary: final.riskSummary,
        strength_summary: final.strengthSummary,
        borrower_explanation: final.borrowerExplanation,
        documents_verified: allDocsVerified,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI Credit Scoring error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Scoring failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
