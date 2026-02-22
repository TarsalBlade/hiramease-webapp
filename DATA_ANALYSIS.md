# HiramEase Platform - Complete Data Analysis

## Executive Summary

HiramEase is a **B2B Lending Platform** that enables lending companies (tenants) to manage loan applications from individual borrowers. The system features AI-powered credit scoring, document verification, payment processing, and comprehensive audit trails for regulatory compliance in the Philippines.

---

## 1. CORE ENTITIES & RELATIONSHIPS

### 1.1 Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANTS (Lending Companies)              │
│  - company_name, registration_type (DTI/SEC)               │
│  - email, phone, address, status (pending/active/suspended) │
└─────────────────────────────────────────────────────────────┘
         │
         ├─→ SubscriptionPlans (Pricing Tiers)
         │   - price_php, max_applications/month, features
         │
         ├─→ Subscriptions (Tenant Billing)
         │   - plan_id, status (trial/active/cancelled)
         │   - trial_ends_at, current_period_start/end
         │   - paymongo_payment_id (Payment Integration)
         │
         ├─→ UserProfiles (Lending Admin Users)
         │   - role: lending_admin or super_admin
         │   - first_name, last_name, email, phone
         │
         ├─→ BorrowerProfiles (Loan Applicants)
         │   - Personal: DOB, gender, civil_status, nationality
         │   - Employment: employer_name, job_title, employment_status
         │   - Financial: monthly_income_php, other_income, existing_debts
         │   - Contact: emergency_contact, reference_contact
         │
         ├─→ CreditApplications (Loan Requests)
         │   - application_number (unique per tenant)
         │   - loan_amount_php, loan_purpose, loan_term_months
         │   - collateral_type, collateral_description, collateral_value
         │   - status (workflow: draft→submitted→under_review→verified→scored→approved/rejected→disbursed)
         │
         ├─→ TenantLendingSettings (Configuration)
         │   - interest_rate_annual_percent, interest_type
         │   - min/max_loan_amount_php, min/max_loan_term_months
         │   - processing_fee_percent, service_fee_percent
         │   - late_payment_penalty_percent
         │   - required_documents, max_dti_ratio_percent
         │
         ├─→ ScoringConfiguration (AI Scoring Weights)
         │   - income_stability_weight (30%)
         │   - dti_weight (30%)
         │   - credit_history_weight (25%)
         │   - loan_risk_weight (15%)
         │   - risk_thresholds (low_risk_threshold, medium_risk_threshold)
         │
         └─→ Loans (Approved Loan Records)
             - principal_amount_php, interest_rate_percent
             - monthly_payment_php, total_payable_php
             - disbursed_at, maturity_date
             - status (active/paid_off/defaulted/written_off)
```

### 1.2 Document & Verification Flow

```
CreditApplications
        │
        └─→ Documents
            - document_type (valid_id, proof_of_income, collateral_proof, etc.)
            - file_path (Supabase Storage)
            - file_size_bytes, mime_type
            - verification_status (pending → verified/rejected)
            - uploaded_by (user_id)
            │
            └─→ DocumentVerifications (Audit Trail)
                - verified_by (lending_admin user_id)
                - status, notes, verified_at
```

### 1.3 AI Scoring & Decision Flow

```
CreditApplications
        │
        ├─→ AIScoringResults
        │   - overall_score (0-100)
        │   - risk_level (low/medium/high)
        │   - score_breakdown (JSON):
        │     • income_stability_score
        │     • dti_score
        │     • credit_history_score
        │     • loan_risk_score
        │   - recommendation (approve/reject/review)
        │   - factors_explanation (detailed breakdown)
        │   - borrower_explanation (user-friendly text)
        │   - documents_verified (boolean)
        │   - scoring_config_snapshot (configuration used)
        │
        └─→ ApplicationDecisions
            - decided_by (user_id)
            - decision (approved/rejected)
            - approved_amount_php, approved_term_months
            - interest_rate_percent
            - conditions (text)
            - rejection_reason (text)
            - override_ai_recommendation (boolean)
            - original_ai_recommendation (text)
```

### 1.4 Payment & Loan Management

```
Loans
 │
 ├─→ LoanPayments (Amortization Schedule)
 │   - payment_number (1, 2, 3, ... term_months)
 │   - due_date, paid_date
 │   - amount_due_php, amount_paid_php
 │   - status (pending/paid/late/missed)
 │   - days_late, late_fee_php
 │
 └─→ PaymongoPayments (Payment Processing)
     - paymongo_payment_id (external reference)
     - amount, currency (PHP)
     - status (pending/completed/failed)
     - payment_method_type (card, gcash, grabpay, paymaya, etc.)
     - metadata (JSON for tracking)

BorrowerCreditHistory
 - total_loans, on_time_payments, late_payments, defaults
 - total_borrowed_php, total_repaid_php
 - last_loan_date
```

### 1.5 User Roles & Access Control

```
UserProfile.role:
 │
 ├─ super_admin
 │  - Manage all tenants, subscriptions, plans
 │  - Access all system data and audit logs
 │  - Configure system parameters
 │
 ├─ lending_admin
 │  - Manage borrowers within their tenant
 │  - Review and verify loan applications
 │  - Configure lending settings for their tenant
 │  - Process loans and payments
 │  - View tenant-specific analytics
 │
 └─ borrower
    - Submit loan applications
    - Upload documents
    - View application status
    - Make loan payments
    - Access payment history
```

---

## 2. DATA TYPES & ENUMERATIONS

### 2.1 Status Enumerations

```
Tenant Status:
├─ pending (New company registered, awaiting activation)
├─ active (Company can operate)
└─ suspended (Company operations frozen)

Subscription Status:
├─ trial (Free trial period)
├─ active (Paid subscription active)
├─ cancelled (Manually cancelled)
└─ expired (Billing period ended)

ApplicationStatus:
├─ draft (Borrower started but not submitted)
├─ submitted (Borrower completed and submitted)
├─ under_review (Lending admin reviewing)
├─ verified (All documents verified)
├─ scored (AI scoring completed)
├─ approved (Decision made - approved)
├─ rejected (Decision made - rejected)
└─ disbursed (Loan funds transferred to borrower)

Verification Status:
├─ pending (Awaiting manual verification)
├─ verified (Lending admin approved)
└─ rejected (Lending admin rejected, resubmission needed)

Risk Level:
├─ low (score >= 720, safe to lend)
├─ medium (score 620-719, acceptable risk)
└─ high (score < 620, risky, may need conditions)

Interest Type:
├─ diminishing_balance (Interest decreases as principal decreases)
├─ flat (Same interest throughout term)
├─ add_on (Interest added upfront)
├─ straight_line (Equal interest payment each period)
└─ compound (Interest compounds each period)

Payment Status:
├─ pending (Due date not reached or awaiting payment)
├─ paid (Payment received on time)
├─ late (Payment received after due date)
└─ missed (Payment not received by due date)

Loan Status:
├─ active (Loan ongoing, payments being made)
├─ paid_off (All payments completed)
├─ defaulted (Borrower has stopped paying)
└─ written_off (Lender gave up on collection)
```

### 2.2 Document Types

```
valid_id (Required)
├─ Passport
├─ Driver's License
├─ PRC ID
├─ NBI Clearance
├─ Postal ID
└─ National ID (PhilID)

proof_of_income (Required)
├─ Pay slip
├─ Tax return (ITR)
├─ Business permit
├─ Bank statement
└─ Certificate of employment

collateral_proof (Conditional)
├─ Property deed
├─ Vehicle registration
├─ Insurance certificate
└─ Appraisal report

Supporting Documents (Optional)
├─ Employment contract
├─ Bank statements (3-6 months)
├─ Financial statements
├─ Investment certificates
└─ Other supporting documents
```

---

## 3. AI CREDIT SCORING ALGORITHM

### 3.1 Scoring Factors & Calculation

```
Overall Score = (Factor1_Score × Factor1_Weight) +
                (Factor2_Score × Factor2_Weight) +
                (Factor3_Score × Factor3_Weight) +
                (Factor4_Score × Factor4_Weight)

Default Weights:
├─ Income Stability: 30%
├─ Debt-to-Income Ratio (DTI): 30%
├─ Credit History: 25%
└─ Loan Risk: 15%

Score Range: 300-850 (similar to FICO)

Risk Thresholds:
├─ LOW (Safe): >= 720
├─ MEDIUM (Acceptable): 620-719
└─ HIGH (Risky): < 620
```

### 3.2 Income Stability Score (0-100)

```
Factors:
├─ Years Employed
│  ├─ < 1 year: 20 points
│  ├─ 1-2 years: 40 points
│  ├─ 2-5 years: 60 points
│  └─ > 5 years: 80 points
│
├─ Employment Status
│  ├─ Employed: +10 points
│  ├─ Self-employed: +5 points
│  ├─ Unemployed: -20 points
│  ├─ Student: -15 points
│  └─ Retired: +15 points
│
└─ Income Trends
   ├─ Increasing: +15 points
   ├─ Stable: +10 points
   └─ Decreasing: -10 points
```

### 3.3 Debt-to-Income Ratio (DTI) Score

```
DTI = (Total Monthly Debts) / (Total Monthly Income) × 100

Scoring:
├─ DTI < 20%: 100 points (Excellent)
├─ 20-30%: 80 points (Good)
├─ 30-40%: 60 points (Fair)
├─ 40-50%: 40 points (Poor)
└─ > 50%: 20 points (Very Poor)

Max DTI Policy: 50% (configurable per tenant)
```

### 3.4 Credit History Score

```
Factors:
├─ Payment History (Weighted: 35%)
│  ├─ Total loans: history_count / 10
│  ├─ On-time payments: (on_time / total_loans) × 100
│  └─ Late payments penalty: -(late_count × 5)
│
├─ Default History (Weighted: 20%)
│  └─ Penalty: -(defaults × 15)
│
└─ Credit Age (Weighted: 15%)
   └─ Last loan date recency
```

### 3.5 Loan Risk Score

```
Factors:
├─ Loan Amount vs Income
│  └─ (Loan Amount / Annual Income) ratio
│
├─ Loan Term
│  ├─ Short term (< 12 months): Lower risk
│  └─ Long term (> 36 months): Higher risk
│
├─ Collateral
│  ├─ With collateral: +20 points
│  ├─ Collateral to Loan ratio > 1: +10 points
│  └─ No collateral: -15 points
│
└─ Loan Purpose
   ├─ Business/Education: +15 points
   ├─ Personal/Emergency: +5 points
   └─ Risky purpose: -10 points
```

### 3.6 Recommendation Logic

```
IF overall_score >= 720 AND risk_level = LOW
   → APPROVE

ELSE IF overall_score >= 620 AND
        risk_level = MEDIUM AND
        DTI < max_dti_ratio AND
        documents_verified = TRUE
   → REVIEW (Requires human decision)

ELSE
   → REJECT
```

---

## 4. DATA FLOW DIAGRAMS

### 4.1 Loan Application Workflow

```
1. Borrower Registration
   └─ UserProfile (role=borrower) + BorrowerProfile created

2. Loan Application Start
   └─ CreditApplication (status=draft) created

3. Document Upload
   └─ Document records created in Storage & DB
      └─ verification_status = pending

4. Application Submission
   └─ CreditApplication.status = submitted
   └─ CreditApplication.submitted_at = NOW()
   └─ Notification sent to lending_admin

5. Document Verification
   └─ Lending admin reviews each document
   └─ Document.verification_status = verified/rejected
   └─ DocumentVerification audit record created
   └─ IF all required docs verified:
      └─ CreditApplication.status = verified

6. AI Scoring Run
   └─ Edge Function: ai-credit-scoring
   └─ Input: Application + Borrower + Documents + Config
   └─ Output: AIScoringResult
   └─ CreditApplication.status = scored

7. Manual Decision
   └─ Lending admin reviews AI scoring
   └─ ApplicationDecision created
   └─ CreditApplication.status = approved/rejected
   └─ IF approved:
      └─ Loan record created (status=active)
      └─ LoanPayments (amortization schedule) generated
   └─ Notifications sent to borrower

8. Loan Disbursement (Post-Approval)
   └─ CreditApplication.status = disbursed
   └─ Loan.disbursed_at = NOW()
   └─ Funds transferred to borrower account

9. Loan Repayment
   └─ LoanPayment due_date arrives
   └─ Borrower pays via Paymongo
   └─ PaymongoPayment record created
   └─ LoanPayment.paid_date = transaction_date
   └─ LoanPayment.status = paid/late
   └─ BorrowerCreditHistory updated
```

### 4.2 Subscription & Billing Flow

```
1. Company Registration
   └─ Tenant created (status=pending)

2. Subscription Initiated
   └─ Subscription created (status=trial)
   └─ trial_ends_at = registration_date + 3 days (configurable)

3. During Trial
   └─ Can submit applications (unlimited)
   └─ IF applications_count > max_allowed:
      └─ Reject new applications
      └─ Require paid subscription

4. Trial Expires
   └─ Subscription.status = trial
   └─ subscription.trial_ends_at <= NOW()
   └─ Create payment via Paymongo
   └─ Webhook receives payment status

5. Payment Success
   └─ Subscription.status = active
   └─ current_period_start, current_period_end set
   └─ Tenant can continue operations

6. Billing Cycle
   └─ Every month: check subscription dates
   └─ IF current_period_end < NOW():
      └─ Subscription.status = expired
      └─ Notify tenant for renewal
      └─ Tenant cannot submit new applications

7. Renewal Payment
   └─ Tenant pays for next period
   └─ current_period_start/end updated
   └─ Subscription.status = active
```

---

## 5. KEY CALCULATIONS

### 5.1 Loan Payment Calculation

```
Formula (Diminishing Balance):
Monthly_Payment = (Principal × Monthly_Rate) /
                  (1 - (1 + Monthly_Rate)^(-Loan_Term))

Where:
├─ Principal = approved_amount_php
├─ Monthly_Rate = annual_interest_rate / 12
├─ Loan_Term = approved_term_months

Total_Payable = Monthly_Payment × Loan_Term
Total_Interest = Total_Payable - Principal

Processing_Fee = Principal × processing_fee_percent
Service_Fee = Principal × service_fee_percent
Insurance_Fee = Principal × insurance_fee_percent

Adjusted_Principal = Principal + Processing_Fee + Service_Fee + Insurance_Fee
```

### 5.2 Late Payment Penalties

```
IF paid_date > due_date:
   days_late = paid_date - due_date
   late_fee = amount_due_php × (late_payment_penalty_percent / 100) × days_late
   total_due = amount_due_php + late_fee

   IF days_late > 30:
      BorrowerCreditHistory.late_payments += 1

   IF days_late > 90:
      Loan.status = defaulted
      BorrowerCreditHistory.defaults += 1
```

### 5.3 Application Capacity (Billing Enforcement)

```
Current_Period = Subscription.current_period_start TO current_period_end
Applications_This_Period = COUNT(CreditApplications)
                           WHERE created_at BETWEEN current_period_start AND current_period_end
                           AND tenant_id = subscription.tenant_id

IF Applications_This_Period >= Plan.max_applications_per_month:
   └─ REJECT new application submissions
   └─ Notify tenant to upgrade plan
```

---

## 6. DATA SECURITY & COMPLIANCE

### 6.1 Row-Level Security (RLS) Policies

```
Super Admin:
├─ Can view/edit all tenants
├─ Can manage subscription plans
├─ Can view audit logs
└─ Can access all system data

Lending Admin:
├─ Can only access data for their tenant_id
├─ Can manage borrowers in their tenant
├─ Can review applications within their tenant
├─ Cannot access other tenants' data
└─ Cannot modify subscription plans

Borrower:
├─ Can only view/edit their own profile
├─ Can only access their own applications
├─ Can only upload documents for their applications
├─ Cannot view other borrowers' data
└─ Cannot access lending admin functions
```

### 6.2 Audit Trail & Compliance

```
Audit Logs Track:
├─ User action (CREATE, READ, UPDATE, DELETE)
├─ Entity type (credit_applications, documents, decisions, etc.)
├─ Entity ID affected
├─ Old values (before change)
├─ New values (after change)
├─ IP address (for security tracking)
├─ User agent (device info)
└─ Timestamp

Document Verifications Record:
├─ Who verified (verified_by user_id)
├─ What they decided (status: verified/rejected)
├─ Notes (reason for decision)
└─ When (verified_at timestamp)

Consent Records:
├─ Data Privacy Act (DPA) compliance
├─ Track user consent for data usage
├─ IP address & user agent for verification
└─ Consented timestamp
```

---

## 7. INTEGRATIONS

### 7.1 Supabase Components

```
Authentication (auth.users):
├─ Built-in auth system
├─ Email/password signup & login
├─ JWT tokens for API access
└─ User IDs referenced in all tables

Database (PostgreSQL):
├─ 25+ tables with relationships
├─ Row-level security policies
├─ Indexes for performance
└─ Foreign keys for referential integrity

Storage:
├─ Bucket: documents
├─ Stores PDF, image files
├─ Signed URLs for secure access
└─ File size tracking

Edge Functions:
├─ ai-credit-scoring: Process scoring algorithm
├─ create-payment-intent: Initialize PayMongo payment
├─ paymongo-webhook: Receive payment callbacks
├─ send-notification: Send async notifications
└─ admin-actions: Administrative operations
```

### 7.2 PayMongo Payment Gateway

```
Integration Points:
├─ Create Payment Intent (PHP amount → paymongo_payment_id)
├─ Webhook Listener (Payment status updates)
├─ Payment Methods (Card, E-Wallets, Bank Transfer)
├─ Store payment_method_id for recurring charges
└─ Track transaction metadata

Data Flow:
1. Subscription renewal → create-payment-intent edge function
2. PayMongo returns payment_id & checkout link
3. Tenant pays via PayMongo UI
4. PayMongo sends webhook to paymongo-webhook edge function
5. Webhook updates Subscription status
6. Notification sent to tenant
```

---

## 8. NOTIFICATION SYSTEM

### 8.1 Notification Types

```
NotificationType Enum:
├─ application_update (Application status changed)
├─ payment (Payment received, due reminder, late notice)
├─ document (Document verification result)
└─ system (Platform announcements, maintenance)

Triggers:
├─ Application submitted → lending_admin notified
├─ Documents verified → borrower notified
├─ Scoring completed → lending_admin notified
├─ Decision made (approve/reject) → borrower notified
├─ Loan disbursed → borrower notified
├─ Payment due → borrower notified
├─ Payment late → borrower notified
├─ Payment received → borrower notified
└─ Subscription renewal needed → lending_admin notified

Metadata Storage:
└─ Notification.metadata (JSON)
   ├─ application_id
   ├─ document_id
   ├─ loan_id
   ├─ decision_type
   └─ custom_data
```

---

## 9. CONFIGURATION & SETTINGS

### 9.1 Scoring Configuration (Per Tenant)

```
ScoringConfiguration:
├─ income_stability_weight (%) - Default: 30%
├─ dti_weight (%) - Default: 30%
├─ credit_history_weight (%) - Default: 25%
├─ loan_risk_weight (%) - Default: 15%
├─ low_risk_threshold - Default: 720
├─ medium_risk_threshold - Default: 620
├─ min_score - Default: 300
└─ max_score - Default: 850
```

### 9.2 Lending Settings (Per Tenant)

```
TenantLendingSettings:
├─ interest_rate_annual_percent (e.g., 12%)
├─ interest_type (diminishing_balance, flat, etc.)
├─ min_loan_amount_php (e.g., 1,000)
├─ max_loan_amount_php (e.g., 500,000)
├─ min_loan_term_months (e.g., 1)
├─ max_loan_term_months (e.g., 60)
├─ processing_fee_percent (e.g., 1%)
├─ service_fee_percent (e.g., 0.5%)
├─ insurance_fee_percent (e.g., 0.25%)
├─ late_payment_penalty_percent (e.g., 1% per day)
├─ required_documents: ['valid_id', 'proof_of_income']
└─ max_dti_ratio_percent (e.g., 50%)
```

### 9.3 Subscription Plans

```
SubscriptionPlan:
├─ name (e.g., "Starter", "Professional", "Enterprise")
├─ price_php (Monthly cost)
├─ max_applications_per_month (e.g., 50, 200, Unlimited)
├─ max_users (e.g., 5, 20, Unlimited)
├─ features: {
│  ├─ ai_scoring: boolean
│  ├─ document_verification: boolean
│  ├─ payment_processing: boolean
│  ├─ analytics_dashboard: boolean
│  ├─ custom_scoring_config: boolean
│  └─ api_access: boolean
│}
└─ is_active (boolean)
```

---

## 10. DATABASE SCHEMA SUMMARY

| Table | Rows | Purpose | Key Columns |
|-------|------|---------|-------------|
| tenants | 10-100s | Lending company accounts | id, company_name, status |
| subscription_plans | 3-10 | Pricing tiers | id, name, price_php |
| subscriptions | 1:1 | Active subscription per tenant | tenant_id, plan_id, status |
| user_profiles | 100s-1000s | Staff & borrower accounts | id, tenant_id, role |
| borrower_profiles | 1000s-10000s | Borrower details | id, user_id, monthly_income_php |
| credit_applications | 1000s-100000s | Loan requests | id, borrower_id, status, loan_amount_php |
| documents | 5000s-500000s | Uploaded files | application_id, verification_status |
| document_verifications | 5000s-500000s | Verification audit | document_id, verified_by, status |
| ai_scoring_results | 1000s-100000s | Scoring outputs | application_id, overall_score, risk_level |
| application_decisions | 1000s-100000s | Approval/rejection | application_id, decision, approved_amount_php |
| borrower_credit_history | 1000s-10000s | Payment history | borrower_id, late_payments, defaults |
| loans | 1000s-100000s | Approved loans | application_id, principal_amount_php, status |
| loan_payments | 10000s-1000000s | Monthly installments | loan_id, due_date, status, amount_due_php |
| paymongo_payments | 1000s-100000s | Subscription payments | user_id, paymongo_payment_id, status |
| notifications | 100000s+ | User alerts | user_id, type, is_read |
| audit_logs | 1000000s+ | System audit trail | action, entity_type, old_values, new_values |

---

## 11. GRAPHICAL REPRESENTATION SUGGESTIONS

### For UI/UX Design Documentation:

1. **Entity Relationship Diagram (ERD)**
   - Show all tables and their relationships
   - Highlight foreign keys and primary keys
   - Use crow's foot notation for cardinality

2. **Data Flow Diagram (DFD)**
   - Application workflow: Draft → Submission → Verification → Scoring → Decision → Disbursement
   - Payment workflow: Payment intent → PayMongo → Webhook → Status update
   - Subscription workflow: Trial → Renewal → Payment → Active

3. **State Diagrams**
   - Application status transitions
   - Loan status lifecycle
   - Subscription billing states

4. **Process Flows**
   - Document verification process
   - AI scoring calculation breakdown
   - Payment collection cycle

5. **Data Volume Indicators**
   - Estimated row counts per table
   - Data growth projections
   - Storage requirements

6. **Security Model Diagram**
   - Role-based access control (RBAC)
   - RLS policy enforcement
   - Multi-tenant isolation

---

## 12. PERFORMANCE CONSIDERATIONS

### Indexes
- credit_applications: (tenant_id, status)
- documents: (application_id, verification_status)
- loans: (borrower_id, status)
- loan_payments: (loan_id, due_date)
- user_profiles: (tenant_id, role)

### Query Optimization
- Pre-calculate borrower_credit_history aggregate
- Cache scoring configurations per tenant
- Materialized views for analytics dashboards

### Scalability
- Partition tables by tenant_id for multi-tenant isolation
- Archive old audit logs after compliance period
- Implement caching for subscription plan data

---

This data analysis provides a complete picture of HiramEase's data architecture, suitable for creating comprehensive graphical documentation of the system's data flow, entity relationships, and business logic.
