export type TenantStatus = 'pending' | 'active' | 'suspended';
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired';
export type UserRole = 'super_admin' | 'lending_admin' | 'borrower';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'verified' | 'scored' | 'approved' | 'rejected' | 'disbursed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high';
export type DecisionType = 'approved' | 'rejected';

export interface Tenant {
  id: string;
  company_name: string;
  registration_type: 'DTI' | 'SEC';
  registration_number: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  status: TenantStatus;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_php: number;
  max_applications_per_month: number;
  max_users: number;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  paymongo_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BorrowerProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  civil_status: 'single' | 'married' | 'widowed' | 'separated' | 'divorced' | null;
  nationality: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  employer_name: string | null;
  employer_address: string | null;
  job_title: string | null;
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student' | null;
  monthly_income_php: number | null;
  other_monthly_income_php: number | null;
  existing_debts_php: number | null;
  years_employed: number | null;
  tin: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  reference_name: string | null;
  reference_phone: string | null;
  reference_relationship: string | null;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface CreditApplication {
  id: string;
  application_number: string;
  borrower_id: string;
  tenant_id: string;
  loan_amount_php: number;
  loan_purpose: string;
  loan_term_months: number;
  collateral_type: string | null;
  collateral_description: string | null;
  collateral_estimated_value_php: number | null;
  status: ApplicationStatus;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  verification_status: VerificationStatus;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVerification {
  id: string;
  document_id: string;
  verified_by: string;
  status: VerificationStatus;
  notes: string | null;
  verified_at: string;
}

export interface ScoringConfiguration {
  id: string;
  tenant_id: string;
  income_stability_weight: number;
  dti_weight: number;
  credit_history_weight: number;
  loan_risk_weight: number;
  low_risk_threshold: number;
  medium_risk_threshold: number;
  min_score: number;
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface BorrowerCreditHistory {
  id: string;
  borrower_id: string;
  tenant_id: string;
  total_loans: number;
  on_time_payments: number;
  late_payments: number;
  defaults: number;
  total_borrowed_php: number;
  total_repaid_php: number;
  last_loan_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactorExplanation {
  factor: string;
  score: number;
  weight: number;
  weighted_score: number;
  description: string;
  details: string[];
}

export interface AIScoringResult {
  id: string;
  application_id: string;
  overall_score: number;
  risk_level: RiskLevel;
  score_breakdown: Record<string, number>;
  recommendation: 'approve' | 'reject' | 'review' | null;
  explanation: string | null;
  model_version: string;
  scored_at: string;
  income_stability_score: number | null;
  dti_score: number | null;
  credit_history_score: number | null;
  loan_risk_score: number | null;
  factors_explanation: FactorExplanation[] | null;
  borrower_explanation: string | null;
  documents_verified: boolean;
  scoring_config_snapshot: ScoringConfiguration | null;
}

export interface ApplicationDecision {
  id: string;
  application_id: string;
  decided_by: string;
  decision: DecisionType;
  approved_amount_php: number | null;
  approved_term_months: number | null;
  interest_rate_percent: number | null;
  conditions: string | null;
  rejection_reason: string | null;
  decided_at: string;
  override_ai_recommendation: boolean;
  override_reason: string | null;
  original_ai_recommendation: string | null;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  consent_text: string;
  ip_address: string | null;
  user_agent: string | null;
  consented_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type InterestType = 'diminishing_balance' | 'flat' | 'add_on' | 'straight_line' | 'compound';
export type NotificationType = 'application_update' | 'payment' | 'document' | 'system';

export interface TenantLendingSettings {
  id: string;
  tenant_id: string;
  interest_rate_annual_percent: number;
  interest_type: InterestType;
  min_loan_amount_php: number;
  max_loan_amount_php: number;
  min_loan_term_months: number;
  max_loan_term_months: number;
  processing_fee_percent: number;
  service_fee_percent: number;
  insurance_fee_percent: number;
  late_payment_penalty_percent: number;
  required_documents: string[];
  max_dti_ratio_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  tenant_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaymongoPayment {
  id: string;
  user_id: string;
  tenant_id: string | null;
  paymongo_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method_type: 'card' | 'gcash' | 'grabpay' | 'grab_pay' | 'paymaya' | 'qrph' | 'instapay' | 'pesonet';
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymongoPaymentMethod {
  id: string;
  user_id: string;
  paymongo_payment_method_id: string;
  type: 'card' | 'gcash' | 'grabpay' | 'paymaya';
  details: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

export interface Loan {
  id: string;
  application_id: string | null;
  borrower_id: string;
  tenant_id: string;
  principal_amount_php: number;
  interest_rate_percent: number;
  term_months: number;
  monthly_payment_php: number;
  total_payable_php: number;
  disbursed_at: string;
  maturity_date: string;
  status: 'active' | 'paid_off' | 'defaulted' | 'written_off';
  created_at: string;
  updated_at: string;
  borrower?: BorrowerProfile;
  application?: CreditApplication;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  borrower_id: string;
  tenant_id: string;
  payment_number: number;
  due_date: string;
  paid_date: string | null;
  amount_due_php: number;
  amount_paid_php: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  days_late: number;
  late_fee_php: number;
  created_at: string;
  updated_at: string;
  loan?: Loan;
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      borrower_profiles: {
        Row: BorrowerProfile;
        Insert: Omit<BorrowerProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BorrowerProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      credit_applications: {
        Row: CreditApplication;
        Insert: Omit<CreditApplication, 'id' | 'application_number' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CreditApplication, 'id' | 'application_number' | 'created_at' | 'updated_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>;
      };
      document_verifications: {
        Row: DocumentVerification;
        Insert: Omit<DocumentVerification, 'id'>;
        Update: Partial<Omit<DocumentVerification, 'id'>>;
      };
      ai_scoring_results: {
        Row: AIScoringResult;
        Insert: Omit<AIScoringResult, 'id'>;
        Update: Partial<Omit<AIScoringResult, 'id'>>;
      };
      application_decisions: {
        Row: ApplicationDecision;
        Insert: Omit<ApplicationDecision, 'id'>;
        Update: Partial<Omit<ApplicationDecision, 'id'>>;
      };
      consent_records: {
        Row: ConsentRecord;
        Insert: Omit<ConsentRecord, 'id'>;
        Update: Partial<Omit<ConsentRecord, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id'>;
        Update: Partial<Omit<AuditLog, 'id'>>;
      };
      paymongo_payments: {
        Row: PaymongoPayment;
        Insert: Omit<PaymongoPayment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PaymongoPayment, 'id' | 'created_at' | 'updated_at'>>;
      };
      paymongo_payment_methods: {
        Row: PaymongoPaymentMethod;
        Insert: Omit<PaymongoPaymentMethod, 'id' | 'created_at'>;
        Update: Partial<Omit<PaymongoPaymentMethod, 'id' | 'created_at'>>;
      };
    };
  };
}
