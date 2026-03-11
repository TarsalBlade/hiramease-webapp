# HiramEase Platform - Complete System Documentation

## Table of Contents
1. [Functional Decomposition Diagram](#1-functional-decomposition-diagram)
2. [Use Case Diagrams](#2-use-case-diagrams)
3. [Technology Stack](#3-technology-stack)
4. [User Acceptance Testing (UAT)](#4-user-acceptance-testing)

---

## 1. FUNCTIONAL DECOMPOSITION DIAGRAM

### 1.1 System-Level Decomposition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HiramEase Platform                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
        ┌───────────▼──────────┐   │    ┌──────────▼────────────┐
        │  Authentication &    │   │    │  Loan Management      │
        │  User Management     │   │    │  System               │
        └─────────────────────┘   │    └───────────────────────┘
                                   │
        ┌──────────────────────────▼──────────────────────────┐
        │      Subscription & Billing Module                  │
        └───────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
    ┌───▼────────────────┐  ┌──────▼──────────┐  ┌───────────▼──────┐
    │ Application        │  │ Payment         │  │ Notification &   │
    │ Processing Module  │  │ Processing      │  │ Reporting Module │
    │                    │  │ Module          │  │                  │
    └────────────────────┘  └─────────────────┘  └──────────────────┘
```

### 1.2 Detailed Module Breakdown

#### **A. Authentication & User Management Module**

```
Authentication & User Management
├─ User Registration
│  ├─ Email validation
│  ├─ Password hashing (Supabase Auth)
│  ├─ Role assignment (super_admin, lending_admin, borrower)
│  ├─ Profile creation (UserProfile)
│  └─ Tenant assignment (for lending_admin)
│
├─ User Login
│  ├─ Email/password verification
│  ├─ Session token generation (JWT)
│  ├─ Auth state management (React Context)
│  └─ Automatic session refresh
│
├─ User Profile Management
│  ├─ View profile
│  ├─ Update personal information
│  ├─ Avatar/photo upload
│  ├─ Email preferences
│  └─ Password change
│
├─ Role-Based Access Control (RBAC)
│  ├─ Route protection (by role)
│  ├─ Component-level permissions
│  ├─ Data access filtering (RLS policies)
│  └─ Feature visibility
│
└─ Session Management
   ├─ JWT token validation
   ├─ Token refresh mechanism
   ├─ Logout (session termination)
   ├─ Auto-logout on token expiry
   └─ Multi-tab session sync
```

#### **B. Subscription & Billing Module**

```
Subscription & Billing
├─ Subscription Plan Management (Super Admin)
│  ├─ Create subscription plans
│  ├─ Edit plan features & pricing
│  ├─ Set application limits per month
│  ├─ Define user limits
│  ├─ Activate/deactivate plans
│  └─ Track plan usage
│
├─ Trial Period Management
│  ├─ Initiate 3-day free trial
│  ├─ Track trial expiry
│  ├─ Monitor trial usage
│  ├─ Enforce trial limits
│  └─ Prompt for upgrade
│
├─ Subscription Lifecycle
│  ├─ Create subscription
│  ├─ Activate subscription
│  ├─ Renew subscription
│  ├─ Cancel subscription
│  └─ Suspend subscription (non-payment)
│
├─ Payment Processing (PayMongo Integration)
│  ├─ Create payment intent
│  ├─ Generate checkout links
│  ├─ Support multiple payment methods
│  │  ├─ Credit/Debit cards
│  │  ├─ GCash
│  │  ├─ GrabPay
│  │  ├─ PayMaya
│  │  ├─ QR Philippines
│  │  ├─ InstaPay
│  │  └─ PesoNet
│  ├─ Webhook payment status updates
│  ├─ Payment retry logic
│  └─ Failed payment handling
│
├─ Billing & Invoicing
│  ├─ Generate invoices
│  ├─ Track billing cycles
│  ├─ Calculate subscription costs
│  ├─ Application usage tracking
│  ├─ Overage charges (if applicable)
│  └─ Invoice download/email
│
└─ Subscription Enforcement
   ├─ Check active subscription before operations
   ├─ Enforce monthly application limits
   ├─ Enforce user count limits
   ├─ Block operations on expired subscription
   ├─ Notify of upcoming renewal
   └─ Auto-suspend on payment failure
```

#### **C. Tenant & Company Management Module**

```
Tenant Management
├─ Company Registration
│  ├─ Register lending company
│  ├─ Collect company details (name, registration type, number)
│  ├─ Address information
│  ├─ Contact details
│  ├─ Logo upload
│  └─ Verify registration documents
│
├─ Tenant Status Management
│  ├─ pending (New, awaiting activation)
│  ├─ active (Operational)
│  ├─ suspended (Temporary freeze)
│  └─ Status transitions & audit logging
│
├─ Lending Settings Configuration (Per Tenant)
│  ├─ Interest rate settings
│  │  ├─ Annual percentage rate (APR)
│  │  ├─ Interest calculation type (flat, diminishing, compound, etc.)
│  │  └─ Tier-based rates (optional)
│  │
│  ├─ Loan amount constraints
│  │  ├─ Minimum loan amount (PHP)
│  │  ├─ Maximum loan amount (PHP)
│  │  └─ Step increments
│  │
│  ├─ Loan term constraints
│  │  ├─ Minimum term (months)
│  │  ├─ Maximum term (months)
│  │  └─ Allowed term options
│  │
│  ├─ Fee configuration
│  │  ├─ Processing fee (%)
│  │  ├─ Service fee (%)
│  │  ├─ Insurance fee (%)
│  │  ├─ Late payment penalty (% per day)
│  │  └─ Other fees
│  │
│  ├─ Document requirements
│  │  ├─ Required documents list
│  │  ├─ Optional documents
│  │  └─ Document verification workflow
│  │
│  └─ Risk parameters
│     ├─ Maximum DTI ratio (%)
│     ├─ Minimum credit score (if applicable)
│     └─ Blacklist management
│
├─ Scoring Configuration (Per Tenant)
│  ├─ Income stability weight (%)
│  ├─ DTI weight (%)
│  ├─ Credit history weight (%)
│  ├─ Loan risk weight (%)
│  ├─ Risk thresholds (low/medium/high)
│  ├─ Min/max score bounds
│  └─ Historical snapshots for audit
│
└─ User Management (Tenant Level)
   ├─ Add lending admin users
   ├─ Remove users
   ├─ Manage user permissions
   ├─ Track user activity
   └─ Enforce max user limits
```

#### **D. Application Processing Module**

```
Loan Application Processing
├─ Application Lifecycle Management
│  ├─ draft (Borrower in progress)
│  ├─ submitted (Ready for review)
│  ├─ under_review (Admin reviewing)
│  ├─ verified (All documents verified)
│  ├─ scored (AI scoring completed)
│  ├─ approved (Decision made - approved)
│  ├─ rejected (Decision made - rejected)
│  └─ disbursed (Funds transferred)
│
├─ Application Creation
│  ├─ Generate unique application number
│  ├─ Capture loan amount requested
│  ├─ Capture loan purpose
│  ├─ Capture requested loan term
│  ├─ Optional: Capture collateral details
│  ├─ Link to borrower profile
│  ├─ Link to tenant
│  └─ Save draft
│
├─ Application Submission
│  ├─ Validate all required fields
│  ├─ Check subscription active
│  ├─ Check monthly application limit
│  ├─ Mark as submitted
│  ├─ Timestamp submission
│  ├─ Trigger notification to admin
│  └─ Create audit log
│
├─ Document Management
│  ├─ Upload documents to Supabase Storage
│  ├─ Support multiple file types (PDF, images)
│  ├─ Validate file size limits
│  ├─ Validate file format
│  ├─ Track document type classification
│  ├─ Track upload timestamp
│  ├─ Initial verification_status = pending
│  ├─ Trigger document review notifications
│  └─ Handle document rejections with feedback
│
├─ Document Verification Workflow
│  ├─ Lending admin reviews documents
│  ├─ Approve document (verification_status = verified)
│  ├─ Reject document (verification_status = rejected)
│  ├─ Add verification notes
│  ├─ Create DocumentVerification audit records
│  ├─ Request reupload for rejected docs
│  ├─ Check if all required docs verified
│  ├─ Update application status to verified
│  └─ Trigger next workflow step
│
├─ Borrower Data Collection
│  ├─ Personal Information
│  │  ├─ Date of birth
│  │  ├─ Gender
│  │  ├─ Civil status
│  │  ├─ Nationality
│  │  └─ Address details
│  │
│  ├─ Employment Information
│  │  ├─ Employer name
│  │  ├─ Job title
│  │  ├─ Employment status
│  │  ├─ Years employed
│  │  ├─ Monthly income
│  │  └─ Employer address
│  │
│  ├─ Financial Information
│  │  ├─ Monthly income (primary)
│  │  ├─ Other monthly income sources
│  │  ├─ Existing debts
│  │  └─ Assets/savings
│  │
│  └─ Contact Information
│     ├─ Emergency contact name
│     ├─ Emergency contact phone
│     ├─ Reference name
│     ├─ Reference contact details
│     └─ Employer contact
│
└─ Application Retrieval & Filtering
   ├─ List all applications (with RLS)
   ├─ Filter by status
   ├─ Filter by date range
   ├─ Filter by borrower
   ├─ Search by application number
   ├─ Pagination support
   └─ Sort options
```

#### **E. AI Credit Scoring Module**

```
AI Credit Scoring Engine
├─ Score Calculation (0-850 scale)
│  ├─ Income Stability Score (0-100)
│  │  ├─ Factor: Years employed (0-80 points)
│  │  ├─ Factor: Employment status (5-10 points)
│  │  ├─ Factor: Income trends (+/-15 points)
│  │  └─ Weighted score = score × 0.30
│  │
│  ├─ Debt-to-Income (DTI) Score (0-100)
│  │  ├─ Calculate DTI = monthly_debts / monthly_income
│  │  ├─ DTI < 20%: 100 points (excellent)
│  │  ├─ DTI 20-30%: 80 points (good)
│  │  ├─ DTI 30-40%: 60 points (fair)
│  │  ├─ DTI 40-50%: 40 points (poor)
│  │  ├─ DTI > 50%: 20 points (very poor)
│  │  └─ Weighted score = score × 0.30
│  │
│  ├─ Credit History Score (0-100)
│  │  ├─ Factor: Payment history (on_time_payments / total_loans)
│  │  ├─ Factor: Late payments penalty
│  │  ├─ Factor: Defaults penalty
│  │  ├─ Factor: Credit age/history length
│  │  └─ Weighted score = score × 0.25
│  │
│  ├─ Loan Risk Score (0-100)
│  │  ├─ Factor: Loan amount vs annual income
│  │  ├─ Factor: Loan term (shorter = lower risk)
│  │  ├─ Factor: Collateral (presence & value)
│  │  ├─ Factor: Loan purpose (business/education = safer)
│  │  └─ Weighted score = score × 0.15
│  │
│  └─ Overall Score Calculation
│     └─ Overall = (Factor1 × W1) + (Factor2 × W2) + (Factor3 × W3) + (Factor4 × W4)
│
├─ Risk Level Classification
│  ├─ LOW (safe): Score >= 720
│  ├─ MEDIUM (acceptable): Score 620-719
│  ├─ HIGH (risky): Score < 620
│  └─ Risk assessment automation
│
├─ Recommendation Engine
│  ├─ APPROVE: Low risk + documents verified + DTI acceptable
│  ├─ REJECT: High risk OR missing required documents
│  ├─ REVIEW: Medium risk + needs human review
│  └─ Override capability for manual decisions
│
├─ Scoring Process Workflow
│  ├─ Trigger: Application status = verified
│  ├─ Fetch application details
│  ├─ Fetch borrower profile
│  ├─ Fetch credit history
│  ├─ Fetch scoring configuration (tenant-specific)
│  ├─ Execute scoring calculation
│  ├─ Generate detailed explanation
│  ├─ Create AIScoringResult record
│  ├─ Update application status = scored
│  ├─ Store configuration snapshot
│  └─ Trigger notification
│
├─ Transparency & Explainability
│  ├─ Factor breakdown (individual scores)
│  ├─ Weighted contributions
│  ├─ Human-readable explanation
│  ├─ Borrower-friendly explanation
│  ├─ Factor details & thresholds used
│  └─ Historical scoring audit trail
│
└─ Configuration Management
   ├─ Per-tenant scoring weights
   ├─ Per-tenant risk thresholds
   ├─ Score range customization
   ├─ Override threshold management
   └─ Version tracking for model changes
```

#### **F. Decision & Approval Module**

```
Loan Decision & Approval
├─ Decision Review
│  ├─ Review AI scoring result
│  ├─ Review application details
│  ├─ Review borrower profile
│  ├─ Review document verification status
│  ├─ Review credit history
│  └─ Review previous decisions (if any)
│
├─ Manual Decision Making
│  ├─ Accept AI recommendation
│  ├─ Override AI recommendation
│  ├─ Decision options:
│  │  ├─ APPROVE
│  │  └─ REJECT
│  │
│  ├─ For Approvals, set:
│  │  ├─ Approved amount (may differ from requested)
│  │  ├─ Approved term (months)
│  │  ├─ Interest rate (%)
│  │  ├─ Optional conditions (text)
│  │  └─ Fee structure confirmation
│  │
│  ├─ For Rejections, set:
│  │  ├─ Rejection reason (specific)
│  │  ├─ Option to reapply
│  │  ├─ Feedback for borrower
│  │  └─ Internal notes
│  │
│  ├─ Track decision data:
│  │  ├─ decided_by (user_id)
│  │  ├─ decided_at (timestamp)
│  │  ├─ override_ai_recommendation (boolean)
│  │  ├─ override_reason (if applicable)
│  │  └─ original_ai_recommendation
│  │
│  └─ Create ApplicationDecision record
│
├─ Loan Creation (Post-Approval)
│  ├─ Validate approval decision
│  ├─ Create Loan record:
│  │  ├─ Link to application
│  │  ├─ Principal amount = approved_amount
│  │  ├─ Interest rate = approved_rate
│  │  ├─ Term = approved_term
│  │  ├─ Status = active
│  │  ├─ Create disbursement schedule
│  │  └─ Calculate total payable
│  │
│  ├─ Generate Payment Schedule
│  │  ├─ Calculate monthly payment
│  │  ├─ Create LoanPayment records
│  │  ├─ Set due dates for each payment
│  │  ├─ Payment schedule: payment_number 1 to term_months
│  │  └─ Track payment status (pending)
│  │
│  └─ Trigger notifications
│     ├─ Notify borrower of approval
│     ├─ Provide loan details summary
│     ├─ Provide payment schedule
│     └─ Next steps instructions
│
├─ Rejection Handling
│  ├─ Update application status = rejected
│  ├─ Send rejection notice to borrower
│  ├─ Provide feedback/reasons
│  ├─ Allow reapplication after period
│  ├─ Update borrower credit history
│  └─ Audit trail logging
│
└─ Condition Management
   ├─ Special conditions for approval
   ├─ Higher interest rate (if applicable)
   ├─ Lower amount than requested
   ├─ Collateral requirements
   ├─ Additional documentation needs
   └─ Communicate conditions to borrower
```

#### **G. Payment Processing Module**

```
Loan Payment Management
├─ Payment Schedule Management
│  ├─ Generate amortization schedule
│  ├─ Calculate monthly payment amount
│  │  └─ Formula: Monthly_Payment = (Principal × Monthly_Rate) / (1 - (1 + Monthly_Rate)^(-Term))
│  ├─ Set payment due dates
│  ├─ Create LoanPayment records (one per month)
│  ├─ Track payment_number (1 to term_months)
│  ├─ Initial status: all pending
│  └─ Support schedule queries
│
├─ Payment Collection
│  ├─ Prompt payment when due
│  ├─ Send payment reminders (e.g., 5 days before due)
│  ├─ Support multiple payment methods (via PayMongo):
│  │  ├─ Credit/Debit cards
│  │  ├─ GCash e-wallet
│  │  ├─ GrabPay
│  │  ├─ PayMaya
│  │  ├─ QR Philippines
│  │  ├─ InstaPay bank transfer
│  │  └─ PesoNet bank transfer
│  │
│  ├─ Create payment intent
│  ├─ Generate checkout link
│  ├─ Store payment method (if user authorizes)
│  └─ Support recurring/auto-payments
│
├─ Payment Processing
│  ├─ PayMongo webhook receives payment status
│  ├─ Payment status transitions:
│  │  ├─ pending → processing
│  │  ├─ processing → paid (successful)
│  │  └─ processing → failed
│  │
│  ├─ On successful payment:
│  │  ├─ Update LoanPayment.paid_date = payment_date
│  │  ├─ Update LoanPayment.status = paid
│  │  ├─ Update amount_paid_php = payment_amount
│  │  ├─ Create PaymongoPayment record
│  │  ├─ Calculate principal reduction
│  │  ├─ Update loan principal (if overpayment)
│  │  ├─ Update BorrowerCreditHistory.on_time_payments
│  │  └─ Trigger payment confirmation notification
│  │
│  ├─ On failed payment:
│  │  ├─ Store failure reason
│  │  ├─ Retry payment collection
│  │  ├─ Notify borrower
│  │  └─ Track failed attempts
│  │
│  └─ Payment reconciliation
│     ├─ Match payments to scheduled amounts
│     ├─ Handle overpayments
│     ├─ Handle underpayments
│     └─ Partial payment handling
│
├─ Late Payment Handling
│  ├─ Track payments past due date
│  ├─ Calculate days_late = current_date - due_date
│  ├─ Calculate late fees:
│  │  └─ late_fee = amount_due × (late_penalty_percent / 100) × days_late
│  │
│  ├─ Status transitions:
│  │  ├─ pending → late (after due_date passes)
│  │  ├─ late → paid (when payment received)
│  │  └─ late → missed (after threshold, e.g., 30 days)
│  │
│  ├─ Send late payment notices:
│  │  ├─ 1st notice (5 days late)
│  │  ├─ 2nd notice (15 days late)
│  │  ├─ 3rd notice (30 days late)
│  │  └─ Final notice (60 days late)
│  │
│  ├─ Update credit history:
│  │  ├─ If days_late > 30: BorrowerCreditHistory.late_payments += 1
│  │  └─ Track cumulative late count
│  │
│  └─ Escalation (after 90 days late):
│     ├─ Update Loan.status = defaulted
│     ├─ BorrowerCreditHistory.defaults += 1
│     ├─ Notify lending company
│     ├─ Halt new applications from borrower (optional)
│     └─ Consider legal action
│
├─ Loan Payoff Management
│  ├─ Early payoff calculation
│  ├─ Calculate remaining balance
│  ├─ Calculate remaining interest
│  ├─ Prepayment penalties (if applicable)
│  ├─ Update Loan.status = paid_off
│  ├─ Mark remaining payments as cancelled
│  ├─ Issue payoff statement
│  └─ Trigger completion notification
│
└─ Payment History & Reporting
   ├─ List all payments for a loan
   ├─ Filter by date range
   ├─ Calculate total paid vs owed
   ├─ Track payment consistency
   ├─ Generate payment reports
   └─ Export payment history
```

#### **H. Notification & Communication Module**

```
Notification Management
├─ Notification Types
│  ├─ application_update (Application status changes)
│  ├─ payment (Payment due, received, late, missed)
│  ├─ document (Document uploaded, verified, rejected)
│  └─ system (Platform announcements, maintenance)
│
├─ Notification Triggers
│  ├─ Application Events:
│  │  ├─ Application submitted → Notify lending_admin
│  │  ├─ Documents verified → Notify borrower
│  │  ├─ Scoring completed → Notify lending_admin
│  │  ├─ Decision made → Notify borrower
│  │  └─ Loan disbursed → Notify borrower
│  │
│  ├─ Payment Events:
│  │  ├─ Payment due (in 5 days) → Remind borrower
│  │  ├─ Payment due (today) → Remind borrower
│  │  ├─ Payment received → Confirm to borrower
│  │  ├─ Payment late (1+ day) → Notify borrower
│  │  ├─ Payment missed (30+ days) → Escalate notice
│  │  └─ Payment failed → Notify borrower to retry
│  │
│  ├─ Document Events:
│  │  ├─ Document upload successful → Confirm
│  │  ├─ Document verified → Notify borrower
│  │  ├─ Document rejected → Request reupload
│  │  └─ Document needed → Prompt upload
│  │
│  └─ Subscription Events:
│     ├─ Trial ending (in 1 day) → Remind to upgrade
│     ├─ Trial expired → Promote plans
│     ├─ Subscription ending → Remind to renew
│     └─ Renewal successful → Confirmation
│
├─ Notification Delivery
│  ├─ In-app notifications (Notification table)
│  ├─ Email notifications (async via edge function)
│  ├─ SMS notifications (optional integration)
│  └─ Push notifications (optional integration)
│
├─ Notification Management (UI)
│  ├─ View all notifications
│  ├─ Mark as read
│  ├─ Mark all as read
│  ├─ Delete notification
│  ├─ Filter by type
│  ├─ Filter by date
│  └─ Sort by date (newest first)
│
├─ Notification Preferences
│  ├─ Opt-in/out for notification types
│  ├─ Preferred notification channels
│  ├─ Frequency settings (immediate vs digest)
│  ├─ Quiet hours (do not disturb)
│  └─ Language preferences
│
└─ Notification Templates
   ├─ Application received confirmation
   ├─ Document verification results
   ├─ Approval/rejection decisions
   ├─ Payment schedule introduction
   ├─ Payment reminders
   ├─ Late payment notices
   ├─ Trial expiry warnings
   └─ System maintenance notices
```

#### **I. Reporting & Analytics Module**

```
Analytics & Reporting
├─ Dashboard Metrics (Lending Admin)
│  ├─ Application Metrics:
│  │  ├─ Total applications (current period)
│  │  ├─ Approved applications count
│  │  ├─ Rejected applications count
│  │  ├─ Pending applications count
│  │  ├─ Approval rate (%)
│  │  ├─ Average approval time
│  │  └─ Applications trend (chart)
│  │
│  ├─ Loan Metrics:
│  │  ├─ Total active loans
│  │  ├─ Total loan value (PHP)
│  │  ├─ Average loan amount
│  │  ├─ Total disbursed
│  │  ├─ Loans at risk (late payments)
│  │  ├─ Defaulted loans
│  │  └─ Loan portfolio health
│  │
│  ├─ Payment Metrics:
│  │  ├─ Total payments received
│  │  ├─ On-time payment rate (%)
│  │  ├─ Late payments count
│  │  ├─ Payment collection trends
│  │  ├─ Average days to payment (after due)
│  │  ├─ Outstanding payments amount
│  │  └─ Revenue generated
│  │
│  ├─ Borrower Metrics:
│  │  ├─ Total active borrowers
│  │  ├─ New borrowers (period)
│  │  ├─ Repeat borrowers count
│  │  ├─ Average borrower score
│  │  ├─ Default borrowers
│  │  └─ Borrower retention rate
│  │
│  └─ Financial Metrics:
│     ├─ Interest collected
│     ├─ Fees collected
│     ├─ Operating costs (if tracked)
│     ├─ Net profit/loss
│     └─ ROI on portfolio
│
├─ Dashboard Metrics (Super Admin)
│  ├─ Tenant Metrics:
│  │  ├─ Total active tenants
│  │  ├─ Tenants by subscription plan
│  │  ├─ Trial tenants count
│  │  ├─ Revenue per tenant
│  │  ├─ Tenant churn rate
│  │  └─ Tenant growth trend
│  │
│  ├─ Platform Metrics:
│  │  ├─ Total platform users
│  │  ├─ Total applications (all tenants)
│  │  ├─ Total loans disbursed
│  │  ├─ Platform revenue
│  │  ├─ System health metrics
│  │  └─ API performance
│  │
│  ├─ Subscription Metrics:
│  │  ├─ Active subscriptions by plan
│  │  ├─ MRR (Monthly Recurring Revenue)
│  │  ├─ Subscription renewal rate
│  │  ├─ Plan upgrade/downgrade trends
│  │  └─ Churn analysis
│  │
│  └─ System Metrics:
│     ├─ API response times
│     ├─ Error rates
│     ├─ Database performance
│     ├─ Storage usage
│     └─ Audit log volume
│
├─ Report Generation
│  ├─ Monthly performance report (auto-generate)
│  ├─ Custom date range reports
│  ├─ Export formats (PDF, CSV, Excel)
│  ├─ Scheduled report delivery (email)
│  ├─ Historical data comparison
│  ├─ Trend analysis reports
│  └─ Compliance reports (audit trail)
│
├─ Data Visualization
│  ├─ Line charts (trends over time)
│  ├─ Bar charts (comparisons)
│  ├─ Pie charts (distribution)
│  ├─ Heatmaps (risk assessment)
│  ├─ Gauge charts (KPIs)
│  └─ Maps (geographic distribution, if applicable)
│
├─ Audit & Compliance Reports
│  ├─ User activity audit log
│  ├─ Data modification history
│  ├─ Decision override tracking
│  ├─ Loan approval/rejection audit
│  ├─ Payment reconciliation report
│  ├─ Consent record report (DPA compliance)
│  └─ System access logs
│
└─ Borrower Reports
   ├─ Loan statement
   ├─ Amortization schedule
   ├─ Payment history
   ├─ Current balance
   ├─ Interest paid YTD
   └─ Payoff projection
```

#### **J. Security & Compliance Module**

```
Security & Compliance
├─ Data Privacy (DPA - Data Privacy Act)
│  ├─ Consent Management
│  │  ├─ Capture user consent
│  │  ├─ Track consent timestamp
│  │  ├─ Track consent IP address
│  │  ├─ Track consent user agent (device)
│  │  ├─ Store consent records
│  │  ├─ Allow consent withdrawal
│  │  └─ Audit consent changes
│  │
│  ├─ Data Retention Policies
│  │  ├─ Define retention periods by data type
│  │  ├─ Auto-delete old records (if policy allows)
│  │  ├─ Archive sensitive data
│  │  ├─ Secure deletion protocols
│  │  └─ Compliance documentation
│  │
│  ├─ Access Control (RLS)
│  │  ├─ Row-Level Security policies
│  │  ├─ Tenant-based isolation
│  │  ├─ Role-based permissions
│  │  ├─ User ownership verification
│  │  └─ Policy enforcement at DB level
│  │
│  └─ Data Anonymization
│     ├─ PII masking in logs
│     ├─ Anonymized reports
│     ├─ Secure data export (compliance)
│     └─ Right to be forgotten support
│
├─ Audit Logging & Compliance Trail
│  ├─ Audit Log Capture
│  │  ├─ User action (CREATE, READ, UPDATE, DELETE)
│  │  ├─ Entity type (applications, loans, payments, etc.)
│  │  ├─ Entity ID affected
│  │  ├─ Old values (before change)
│  │  ├─ New values (after change)
│  │  ├─ User ID (who made change)
│  │  ├─ Timestamp (when)
│  │  ├─ IP address (from where)
│  │  └─ User agent (device/browser)
│  │
│  ├─ Audit Log Analysis
│  │  ├─ Search logs by date range
│  │  ├─ Filter by user
│  │  ├─ Filter by action type
│  │  ├─ Filter by entity type
│  │  ├─ Detect suspicious activity
│  │  ├─ Compliance reporting
│  │  └─ Export audit trail
│  │
│  └─ Document Verification Trail
│     ├─ Track document uploads
│     ├─ Track verification actions
│     ├─ Store verification notes
│     ├─ Maintain rejection history
│     ├─ Archive verified documents
│     └─ Compliance audit access
│
├─ Role-Based Access Control (RBAC)
│  ├─ Super Admin Role
│  │  ├─ View all tenants
│  │  ├─ Manage subscription plans
│  │  ├─ View system-wide audit logs
│  │  ├─ Manage platform users
│  │  ├─ Access analytics dashboard
│  │  └─ Configure system settings
│  │
│  ├─ Lending Admin Role
│  │  ├─ Access only their tenant's data
│  │  ├─ Manage borrowers (add, view, edit)
│  │  ├─ Review & verify applications
│  │  ├─ Make approval/rejection decisions
│  │  ├─ Configure lending settings (their tenant)
│  │  ├─ Configure scoring weights (their tenant)
│  │  ├─ View tenant analytics
│  │  ├─ Manage loan disbursements
│  │  ├─ Track payments
│  │  └─ View tenant audit logs
│  │
│  └─ Borrower Role
│     ├─ Create loan applications (own)
│     ├─ View own applications
│     ├─ Upload documents (own application)
│     ├─ View application status
│     ├─ View approved loans
│     ├─ Make loan payments
│     ├─ View payment history
│     ├─ Download statements
│     └─ Update own profile
│
├─ Threat Protection
│  ├─ SQL Injection Prevention
│  │  └─ Parameterized queries (Supabase handles)
│  │
│  ├─ XSS Protection
│  │  ├─ Input sanitization
│  │  ├─ Output encoding
│  │  ├─ Content Security Policy (CSP)
│  │  └─ React auto-escaping
│  │
│  ├─ CSRF Protection
│  │  ├─ SameSite cookies
│  │  ├─ CSRF tokens (Supabase)
│  │  └─ Origin validation
│  │
│  ├─ Rate Limiting
│  │  ├─ API rate limits (per user)
│  │  ├─ Payment attempt limits
│  │  ├─ Login attempt limits
│  │  └─ DDoS protection
│  │
│  └─ Authentication Security
│     ├─ JWT token encryption
│     ├─ Token expiry & refresh
│     ├─ Password hashing (bcrypt)
│     ├─ Session timeout
│     └─ Multi-factor auth (optional)
│
└─ Compliance Certifications
   ├─ Data Privacy Act (DPA) compliance
   ├─ BSP cybersecurity requirements
   ├─ PCI-DSS compliance (payment)
   └─ Regular security audits
```

---

## 2. USE CASE DIAGRAMS

### 2.1 Overall System Use Case Diagram

```
                         ┌─────────────────────────────────┐
                         │      HiramEase Platform         │
                         └─────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
         ┌────▼─────┐           ┌────▼──────┐          ┌──────▼───┐
         │  Borrower │           │Lending    │          │  Super   │
         │           │           │  Admin    │          │  Admin   │
         └───────────┘           └───────────┘          └──────────┘
              │                       │                       │
              ├─ Register             ├─ Login                ├─ Login
              ├─ Login                ├─ Review Apps          ├─ Manage Plans
              ├─ Submit App           ├─ Verify Docs          ├─ Manage Tenants
              ├─ Upload Docs          ├─ Score Apps           ├─ View Analytics
              ├─ View Status          ├─ Make Decisions       ├─ Audit Logs
              ├─ Pay Loan             ├─ Configure Settings   └─ System Config
              ├─ View History         └─ View Analytics
              └─ Download Statement
```

### 2.2 Borrower Use Case Diagram

```
                          ┌──────────────────┐
                          │    Borrower      │
                          └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
            ┌───────▼─────┐  ┌────▼─────┐  ┌──▼────────┐
            │  Loan App   │  │ Document  │  │ Payment   │
            │  Management │  │Management │  │Management │
            └─────────────┘  └──────────┘  └───────────┘
                    │             │             │
       ┌────────────┼────────────┐│             │
       │            │            ││             │
    ┌──▼──┐    ┌────▼────┐  ┌───▼────┐    ┌──▼──────┐
    │Create│   │  Submit  │  │ Upload │    │Make Loan│
    │ Draft│   │ for Review│  │Document│    │Payments │
    └──────┘   └──────────┘  └────────┘    └─────────┘
                                │              │
                                │              │
                            ┌───▼─────────────▼───┐
                            │  Receive & View     │
                            │  Notifications      │
                            └─────────────────────┘
```

### 2.3 Lending Admin Use Case Diagram

```
                      ┌──────────────────────┐
                      │   Lending Admin      │
                      └──────────────────────┘
                               │
                  ┌────────────┼────────────┐
                  │            │            │
         ┌────────▼────┐   ┌───▼────┐  ┌──▼──────────┐
         │Application  │   │Document│  │ Loan & Fee  │
         │ Management  │   │ Reviews │  │  Management │
         └────────┬────┘   └────┬───┘  └──┬──────────┘
                  │             │         │
        ┌─────────┴─────────┐   │      ┌──▼──────────┐
        │                   │   │      │  Make       │
    ┌───▼───┐    ┌──────────▼───▼──┐   │  Decisions  │
    │ Review│    │ Verify Documents│   │  & Approve  │
    │  Apps │    │& Set Status     │   │ Loan        │
    └───────┘    └─────────────────┘   └──┬──────────┘
                         │                  │
                         │            ┌─────▼──────┐
                         │            │ Configure  │
                         │            │Settings &  │
                         │            │Parameters  │
                         │            └────────────┘
                         │
                ┌────────▼────────┐
                │  Score & Track  │
                │ Loan Payments   │
                │ & Collections   │
                └─────────────────┘
```

### 2.4 Super Admin Use Case Diagram

```
                        ┌──────────────────┐
                        │   Super Admin    │
                        └──────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
          ┌──────▼────────┐ ┌────▼────┐   ┌────▼────┐
          │ Subscription  │ │ Tenant   │   │  System │
          │ Management    │ │ Management│  │  Audit  │
          └──────┬────────┘ └────┬────┘   └────┬────┘
                 │               │             │
       ┌─────────┼─────────┐     │             │
       │         │         │     │             │
   ┌───▼──┐ ┌────▼───┐ ┌───▼────▼┐   ┌────────▼────┐
   │Create│ │Manage  │ │Manage &  │   │  View Audit │
   │Plans │ │ Payment│ │Activate  │   │  Logs &     │
   │      │ │Methods │ │Tenants   │   │  Analytics  │
   └──────┘ └────────┘ └──────────┘   └─────────────┘
```

### 2.5 Authentication Use Case Diagram

```
                        ┌─────────────────┐
                        │   User (Any)    │
                        └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼──┐  ┌──────▼──────┐  ┌─▼────────┐
              │Register│  │    Login    │  │Password  │
              │        │  │             │  │Reset     │
              └────────┘  └──────┬──────┘  └──────────┘
                                 │
                          ┌──────▼────────┐
                          │ Authenticate  │
                          │ & Get JWT     │
                          │ Token         │
                          └──────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                ┌───▼────┐  ┌────▼────┐  ┌───▼─────┐
                │ Access │  │ Maintain│  │  Auto   │
                │Platform│  │ Session │  │ Logout  │
                └────────┘  │ & Token │  │on Expiry│
                            │ Refresh │  └─────────┘
                            └─────────┘
```

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
└─────────────────────────────────────────────────────────┘

Framework & Libraries:
├─ React 18.3.1
│  ├─ Component-based UI architecture
│  ├─ Hooks (useState, useEffect, useContext)
│  ├─ Functional components
│  └─ React Context API for state management
│
├─ TypeScript 5.5.3
│  ├─ Static type checking
│  ├─ Type safety for all data structures
│  ├─ Database types auto-generated from schema
│  └─ Interface definitions (src/types/database.ts)
│
├─ Vite 5.4.2 (Build Tool)
│  ├─ Fast development server
│  ├─ Hot module replacement (HMR)
│  ├─ Optimized production builds
│  ├─ ES modules support
│  └─ Code splitting & lazy loading
│
├─ Tailwind CSS 3.4.1
│  ├─ Utility-first CSS framework
│  ├─ Responsive design (mobile-first)
│  ├─ Dark mode support
│  ├─ Custom configuration (tailwind.config.js)
│  ├─ PostCSS integration
│  └─ Autoprefixer for browser compatibility
│
├─ Lucide React 0.344.0
│  ├─ SVG icon library
│  ├─ 300+ professionally designed icons
│  ├─ Lightweight and fast
│  ├─ Customizable size and color
│  └─ Used throughout UI components
│
└─ React Router (Implicit via Page Components)
   ├─ Page-based routing (src/pages/*)
   ├─ Protected routes (role-based)
   ├─ Nested layouts (DashboardLayout)
   └─ Navigation state management

Authentication Context:
├─ AuthContext (src/contexts/AuthContext.tsx)
├─ User state management
├─ Session persistence
├─ Role-based UI rendering
└─ Auth state listeners
```

### 3.2 Backend & Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Backend Infrastructure                      │
└─────────────────────────────────────────────────────────┘

Supabase (Backend-as-a-Service):
├─ PostgreSQL Database
│  ├─ 25+ relational tables
│  ├─ Foreign key constraints
│  ├─ Row-Level Security (RLS) policies
│  ├─ Indexes for performance optimization
│  ├─ Automatic timestamps (created_at, updated_at)
│  ├─ UUID primary keys
│  └─ JSONB columns for flexible data
│
├─ Authentication (Auth Module)
│  ├─ Email/password authentication
│  ├─ Built-in auth.users table
│  ├─ JWT token generation & refresh
│  ├─ Session management
│  ├─ Password hashing (bcrypt)
│  └─ User UUID linking
│
├─ Storage
│  ├─ Supabase Storage (S3-compatible)
│  ├─ Bucket: "documents"
│  ├─ File upload/download
│  ├─ Signed URL generation
│  ├─ Access control per file
│  ├─ Metadata tracking (file_size, mime_type)
│  └─ Secure file deletion
│
├─ Real-time Features (Optional)
│  ├─ Websocket connections
│  ├─ Real-time database updates
│  ├─ Presence tracking
│  └─ Channel subscriptions
│
└─ Edge Functions (Serverless)
   ├─ Runtime: Deno
   ├─ Trigger: HTTP POST/GET
   ├─ Functions deployed:
   │  ├─ ai-credit-scoring
   │  ├─ create-payment-intent
   │  ├─ paymongo-webhook
   │  ├─ send-notification
   │  └─ admin-actions
   └─ Environment variables support
```

### 3.3 Payment Processing Integration

```
PayMongo Integration:
├─ Payment Gateway
│  ├─ API endpoint: https://api.paymongo.com
│  ├─ Supported payment methods:
│  │  ├─ Credit/Debit cards
│  │  ├─ GCash e-wallet
│  │  ├─ GrabPay
│  │  ├─ PayMaya
│  │  ├─ QR Philippines
│  │  ├─ InstaPay bank transfer
│  │  └─ PesoNet bank transfer
│  │
│  ├─ Payment Intent Creation
│  │  ├─ Amount (PHP)
│  │  ├─ Description
│  │  ├─ Metadata (application_id, tenant_id)
│  │  ├─ Return URL (success page)
│  │  └─ Idempotency key
│  │
│  └─ Webhook Integration
│     ├─ Payment status notifications
│     ├─ Signature verification
│     ├─ Event handling (charge.paid, payment.failed)
│     ├─ Edge function: paymongo-webhook
│     └─ Webhook retry logic
│
├─ Payment Data Model
│  ├─ PaymongoPayment table
│  ├─ PaymongoPaymentMethod table
│  ├─ Payment status tracking
│  └─ Transaction audit logging
│
└─ Security
   ├─ API keys stored in Edge Function secrets
   ├─ Webhook signature verification
   ├─ PCI-DSS compliance
   └─ No sensitive data logged
```

### 3.4 AI/ML Integration

```
Credit Scoring Engine:
├─ Scoring Algorithm (Custom Logic)
│  ├─ Implementation: src/services/creditScoringEngine.ts
│  ├─ Factors calculated:
│  │  ├─ Income Stability Score (0-100)
│  │  ├─ Debt-to-Income Ratio Score (0-100)
│  │  ├─ Credit History Score (0-100)
│  │  └─ Loan Risk Score (0-100)
│  │
│  ├─ Weighted Formula:
│  │  └─ Overall = (F1×W1) + (F2×W2) + (F3×W3) + (F4×W4)
│  │
│  ├─ Score Range: 300-850
│  ├─ Risk Classification: Low/Medium/High
│  └─ Recommendation: Approve/Review/Reject
│
├─ Execution
│  ├─ Triggered: Application status = verified
│  ├─ Edge Function: ai-credit-scoring
│  ├─ Input data: Application + Borrower + History + Config
│  ├─ Output: AIScoringResult
│  └─ Async execution
│
└─ Configuration
   ├─ Per-tenant scoring weights
   ├─ Risk thresholds
   ├─ Score range limits
   ├─ Factor thresholds
   └─ Model version tracking
```

### 3.5 Development Tools & Practices

```
Development Environment:
├─ Package Manager
│  └─ npm (Node.js)
│
├─ Build Tools
│  ├─ Vite (Dev server & production build)
│  ├─ TypeScript compiler
│  └─ PostCSS (CSS processing)
│
├─ Code Quality
│  ├─ ESLint 9.9.1
│  │  ├─ Config: eslint.config.js
│  │  ├─ React plugin
│  │  ├─ TypeScript support
│  │  └─ Linting rules
│  │
│  └─ TypeScript Type Checking
│     ├─ tsconfig.app.json
│     ├─ tsconfig.json (root)
│     └─ Type validation
│
├─ Browser Support
│  ├─ Browserslist configuration
│  ├─ Autoprefixer for compatibility
│  └─ Modern browser targets
│
├─ Version Control
│  ├─ Git (gitignore configured)
│  ├─ Bolt configuration (.bolt/config.json)
│  └─ Environment variables (.env)
│
└─ Project Structure
   ├─ src/
   │  ├─ components/ (React components)
   │  ├─ pages/ (Page-level components)
   │  ├─ contexts/ (React Context providers)
   │  ├─ services/ (Business logic)
   │  ├─ utils/ (Utility functions)
   │  ├─ lib/ (Supabase client)
   │  ├─ types/ (TypeScript types)
   │  └─ index.css (Global styles)
   │
   ├─ supabase/
   │  ├─ migrations/ (DB schema migrations)
   │  └─ functions/ (Edge Functions)
   │
   └─ public/ (Static assets)
```

### 3.6 Deployment Architecture

```
Deployment Pipeline:
├─ Frontend Hosting
│  ├─ Build output: dist/ (Vite)
│  ├─ Static file hosting (Vercel, Netlify, Firebase)
│  ├─ CDN distribution
│  ├─ Environment variables (.env)
│  └─ HTTPS/SSL certificate
│
├─ Backend (Supabase)
│  ├─ Cloud PostgreSQL (managed)
│  ├─ Authentication service (managed)
│  ├─ Storage service (managed)
│  ├─ Edge Functions (deployed globally)
│  └─ Automatic backups & redundancy
│
├─ Payment Processing
│  ├─ PayMongo sandbox (testing)
│  ├─ PayMongo production (live)
│  ├─ Webhook URLs configured
│  └─ API keys rotated regularly
│
└─ Monitoring & Observability
   ├─ Error tracking (Sentry optional)
   ├─ Performance monitoring
   ├─ Audit logging
   ├─ Database query performance
   └─ Edge Function logs
```

### 3.7 Technology Stack Summary Table

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **UI Framework** | React | 18.3.1 | Component-based UI |
| **Language** | TypeScript | 5.5.3 | Type-safe development |
| **Build Tool** | Vite | 5.4.2 | Fast builds & HMR |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **Icons** | Lucide React | 0.344.0 | Icon library |
| **Backend** | Supabase | Latest | BaaS platform |
| **Database** | PostgreSQL | 14+ | Relational database |
| **Auth** | Supabase Auth | Built-in | User authentication |
| **Storage** | Supabase Storage | S3-compatible | File storage |
| **Serverless** | Edge Functions | Deno | Compute layer |
| **Payment** | PayMongo | API v1 | Payment gateway |
| **Linting** | ESLint | 9.9.1 | Code quality |
| **Package Manager** | npm | Latest | Dependency management |
| **Version Control** | Git | Latest | Source control |

---

## 4. USER ACCEPTANCE TESTING (UAT)

### 4.1 UAT Test Cases - Authentication & Access Control

#### TC-AUTH-001: User Registration as Borrower
```
Objective: Verify borrower can successfully register
Precondition: User not previously registered

Steps:
1. Navigate to signup page
2. Enter email address (valid format)
3. Enter password (min 8 chars, complexity rules)
4. Confirm password
5. Accept terms & conditions
6. Click "Sign Up"

Expected Results:
✓ Account created successfully
✓ Verification email sent (if enabled)
✓ Redirected to borrower dashboard
✓ User profile created with role=borrower
✓ Session active (JWT token)

Data Validation:
✓ Email stored in auth.users
✓ UserProfile.role = 'borrower'
✓ UserProfile.tenant_id = NULL
✓ created_at timestamp set
```

#### TC-AUTH-002: User Registration as Lending Admin
```
Objective: Verify lending admin registration via invitation
Precondition: Tenant exists; Lending admin invitation sent

Steps:
1. Click invitation link in email
2. Enter email (pre-filled from invitation)
3. Enter password (min 8 chars)
4. Confirm password
5. Click "Accept Invitation & Create Account"

Expected Results:
✓ Account created with role=lending_admin
✓ UserProfile.tenant_id assigned correctly
✓ Redirected to lending admin dashboard
✓ Can access tenant data only

Data Validation:
✓ UserProfile.role = 'lending_admin'
✓ UserProfile.tenant_id = correct tenant UUID
✓ RLS policies enforce tenant isolation
```

#### TC-AUTH-003: User Login
```
Objective: Verify user can login successfully
Precondition: User account exists; Not currently logged in

Steps:
1. Navigate to login page
2. Enter registered email
3. Enter correct password
4. Click "Login"

Expected Results:
✓ Authentication successful
✓ JWT token received
✓ Redirected to appropriate dashboard (by role)
✓ Session persists across page refreshes
✓ User can access protected routes

Data Validation:
✓ Session token stored securely
✓ AuthContext.user populated
✓ AuthContext.session active
✓ Token expiry set to 1 hour
```

#### TC-AUTH-004: Login with Invalid Credentials
```
Objective: Verify login fails with incorrect credentials
Precondition: User account exists

Steps:
1. Navigate to login page
2. Enter email
3. Enter incorrect password
4. Click "Login"

Expected Results:
✓ Login fails
✓ Error message: "Invalid email or password"
✓ User remains on login page
✓ Session NOT created

Data Validation:
✓ No JWT token issued
✓ AuthContext.user = null
```

#### TC-AUTH-005: Password Reset
```
Objective: Verify user can reset forgotten password
Precondition: User account exists

Steps:
1. Navigate to login page
2. Click "Forgot Password"
3. Enter registered email
4. Click "Send Reset Link"
5. Check email for reset link
6. Click reset link
7. Enter new password
8. Confirm password
9. Click "Reset Password"

Expected Results:
✓ Password reset email sent
✓ Reset link valid for 24 hours
✓ New password accepted
✓ Old password no longer works
✓ Can login with new password

Data Validation:
✓ Password hash updated in auth.users
✓ Previous session tokens invalidated
```

#### TC-AUTH-006: Session Timeout & Auto-Logout
```
Objective: Verify session expires and user is logged out
Precondition: User logged in; Session timeout = 60 minutes

Steps:
1. User logs in successfully
2. Wait 60 minutes without activity
3. Attempt to perform action

Expected Results:
✓ Session automatically invalidated
✓ User redirected to login page
✓ Error message: "Session expired, please login again"
✓ Must re-authenticate

Data Validation:
✓ JWT token expired
✓ AuthContext cleared
```

---

### 4.2 UAT Test Cases - Loan Application Management

#### TC-APP-001: Create Loan Application (Draft)
```
Objective: Verify borrower can create draft loan application
Precondition: Borrower logged in; Subscription active

Steps:
1. Navigate to "New Application"
2. Enter loan amount: 50,000 PHP
3. Select loan purpose: "Business"
4. Enter loan term: 12 months
5. Add collateral description: "Motorcycle"
6. Click "Save as Draft"

Expected Results:
✓ Application created
✓ Status = 'draft'
✓ Application number generated (unique)
✓ Data saved to credit_applications table
✓ Can be edited before submission

Data Validation:
✓ CreditApplication.status = 'draft'
✓ CreditApplication.application_number generated
✓ CreditApplication.borrower_id linked
✓ CreditApplication.loan_amount_php = 50000
```

#### TC-APP-002: Submit Loan Application
```
Objective: Verify borrower can submit application for review
Precondition: Draft application exists; Required documents uploaded

Steps:
1. Navigate to draft application
2. Review all details
3. Confirm all required documents attached
4. Click "Submit for Review"
5. Accept terms & conditions
6. Click "Confirm Submission"

Expected Results:
✓ Application status changed to 'submitted'
✓ submitted_at timestamp set
✓ Notification sent to lending admin
✓ Confirmation message shown to borrower
✓ Application no longer editable

Data Validation:
✓ CreditApplication.status = 'submitted'
✓ CreditApplication.submitted_at = current timestamp
✓ Notification record created
✓ Audit log entry created
```

#### TC-APP-003: Upload Documents
```
Objective: Verify borrower can upload required documents
Precondition: Application created; Borrower logged in

Steps:
1. Navigate to application
2. Go to "Documents" section
3. Click "Upload Valid ID"
4. Select PDF file (valid ID image)
5. File size: 2 MB
6. Click "Upload"
7. Repeat for Proof of Income document

Expected Results:
✓ Files uploaded successfully
✓ Stored in Supabase Storage
✓ Document records created in DB
✓ verification_status = 'pending' initially
✓ Upload confirmation shown
✓ Files accessible via signed URLs

Data Validation:
✓ Document.file_path set correctly
✓ Document.file_size_bytes recorded
✓ Document.mime_type = 'application/pdf'
✓ Document.verification_status = 'pending'
✓ uploaded_by = borrower user_id
✓ created_at timestamp set
```

#### TC-APP-004: Reject Invalid Document
```
Objective: Verify borrower can reupload rejected documents
Precondition: Document rejected by admin

Steps:
1. Borrower receives notification: "Document rejected"
2. Navigate to application
3. View document with status 'rejected'
4. See rejection reason: "Image too blurry"
5. Click "Reupload Document"
6. Select clearer image
7. Click "Upload"

Expected Results:
✓ Old document marked as rejected
✓ New document uploaded
✓ New verification_status = 'pending'
✓ verification_status change triggers notification
✓ Admin can review new document

Data Validation:
✓ Old Document.verification_status = 'rejected'
✓ DocumentVerification.status = 'rejected'
✓ DocumentVerification.notes captured
✓ New Document created with new ID
✓ New Document.verification_status = 'pending'
```

#### TC-APP-005: List Applications with Filtering
```
Objective: Verify user can view & filter applications
Precondition: Multiple applications exist

Steps:
1. Navigate to Applications page
2. View all applications (paginated, 10 per page)
3. Filter by Status: "Pending Review"
4. Filter by Date Range: Last 30 days
5. Search by Application Number: APP-2024-001
6. Sort by Date (newest first)

Expected Results:
✓ All filters applied correctly
✓ Only matching applications shown
✓ Pagination works correctly
✓ Results accurate and complete
✓ Performance acceptable (< 2 sec)

Data Validation:
✓ SQL query efficient with proper indexes
✓ RLS policies enforce data access
✓ Correct record counts returned
```

---

### 4.3 UAT Test Cases - Document Verification

#### TC-DOC-001: Verify Document as Admin
```
Objective: Verify lending admin can verify submitted documents
Precondition: Document uploaded; Admin logged in; Assigned to review

Steps:
1. Admin navigates to application
2. Go to "Documents" section
3. View document (PDF preview)
4. Review document details
5. Confirm document is legitimate
6. Click "Approve Document"
7. Add optional notes: "ID valid and clear"
8. Click "Save"

Expected Results:
✓ Document verification_status = 'verified'
✓ DocumentVerification record created
✓ verified_by = admin user_id
✓ verified_at = current timestamp
✓ Notification sent to borrower
✓ Audit log entry created

Data Validation:
✓ Document.verification_status = 'verified'
✓ DocumentVerification.status = 'verified'
✓ DocumentVerification.notes captured
✓ No duplicate DocumentVerification records
```

#### TC-DOC-002: Reject Document as Admin
```
Objective: Verify lending admin can reject documents
Precondition: Document uploaded; Quality issues present

Steps:
1. Admin reviews document
2. Identifies quality issue (blurry/incomplete)
3. Click "Reject Document"
4. Select reason: "Image too blurry"
5. Add notes: "Please provide clearer photo"
6. Click "Save"

Expected Results:
✓ Document verification_status = 'rejected'
✓ DocumentVerification record created
✓ Rejection reason & notes captured
✓ Notification sent to borrower
✓ Borrower prompted to reupload
✓ Audit log entry created

Data Validation:
✓ Document.verification_status = 'rejected'
✓ DocumentVerification.status = 'rejected'
✓ DocumentVerification.notes captured
```

#### TC-DOC-003: Auto-Update App Status When All Docs Verified
```
Objective: Verify application status updates when all docs verified
Precondition: Multiple documents required; Last document being verified

Steps:
1. Admin verifies all required documents
2. Admin verifies the final document
3. System detects all docs now verified

Expected Results:
✓ Application status auto-changes to 'verified'
✓ Next step triggered (AI scoring)
✓ Notification sent to admin: "Ready for scoring"
✓ Borrower notified: "Documents verified"

Data Validation:
✓ CreditApplication.status = 'verified'
✓ All required Document types have verification_status = 'verified'
✓ Status change logged in audit_logs
```

---

### 4.4 UAT Test Cases - AI Credit Scoring

#### TC-SCORE-001: Run AI Scoring
```
Objective: Verify AI scoring runs after doc verification
Precondition: Application.status = 'verified'

Steps:
1. Application doc verification complete
2. System triggers AI scoring (automatic)
3. Scoring completes within 5 seconds

Expected Results:
✓ AIScoringResult created
✓ Overall score calculated: 700 (example)
✓ Risk level assigned: LOW
✓ Recommendation: APPROVE
✓ Factor breakdown provided
✓ Application status = 'scored'
✓ Admin notified to review

Data Validation:
✓ AIScoringResult.overall_score in range [300, 850]
✓ AIScoringResult.risk_level in [low, medium, high]
✓ AIScoringResult.recommendation in [approve, reject, review]
✓ All factor scores populated
✓ factors_explanation array populated
✓ Model version recorded
```

#### TC-SCORE-002: Score Calculation Accuracy
```
Objective: Verify scoring calculation is accurate

Test Data:
- Borrower: 5 years employed, income 50,000 PHP/month
- Existing debts: 10,000 PHP/month
- Credit history: 10 loans, 9 on-time, 1 late
- Loan request: 100,000 PHP, 12-month term

Expected Score Components:
- Income Stability: 80 × 0.30 = 24 points
- DTI: DTI = 10k/50k = 20% → 80 × 0.30 = 24 points
- Credit History: 90% on-time → 85 × 0.25 = 21.25 points
- Loan Risk: Good ratio → 80 × 0.15 = 12 points
- Overall: 24 + 24 + 21.25 + 12 = ~700-750

Expected Results:
✓ Overall score within calculated range
✓ Individual factors match calculations
✓ Risk level classification correct
✓ Recommendation aligns with score

Data Validation:
✓ Mathematical accuracy verified
✓ No rounding errors significant
```

#### TC-SCORE-003: Risk Level Classification
```
Objective: Verify risk levels assigned correctly

Test Scenarios:

Scenario A: High Score (800+)
├─ Risk Level: LOW
└─ Recommendation: APPROVE

Scenario B: Medium Score (650)
├─ Risk Level: MEDIUM
└─ Recommendation: REVIEW

Scenario C: Low Score (550)
├─ Risk Level: HIGH
└─ Recommendation: REJECT

Expected Results:
✓ All classifications correct
✓ Thresholds applied consistently
✓ No misclassifications
✓ Recommendations appropriate for risk level

Data Validation:
✓ Threshold values in config: low_risk=720, medium_risk=620
```

---

### 4.5 UAT Test Cases - Application Decision

#### TC-DEC-001: Approve Application
```
Objective: Verify lending admin can approve application
Precondition: Application scored; Status = 'scored'

Steps:
1. Admin navigates to application
2. Reviews AI scoring
3. Agrees with AI recommendation: "APPROVE"
4. Set Approved Amount: 100,000 PHP
5. Set Approved Term: 12 months
6. Set Interest Rate: 12% per annum
7. Add conditions: "None"
8. Click "Approve Loan"

Expected Results:
✓ ApplicationDecision record created
✓ Application status = 'approved'
✓ Loan record created
✓ Loan status = 'active'
✓ Payment schedule generated (12 payments)
✓ Borrower notified: "Loan approved"
✓ Admin notified: "Approval recorded"

Data Validation:
✓ ApplicationDecision.decision = 'approved'
✓ ApplicationDecision.decided_by = admin user_id
✓ ApplicationDecision.decided_at = current timestamp
✓ ApplicationDecision.override_ai_recommendation = false
✓ Loan.principal_amount_php = 100000
✓ Loan.interest_rate_percent = 12
✓ Loan.term_months = 12
✓ LoanPayment records: count = 12
✓ CreditApplication.status = 'approved'
```

#### TC-DEC-002: Reject Application
```
Objective: Verify lending admin can reject application
Precondition: Application scored; Status = 'scored'

Steps:
1. Admin navigates to application
2. Reviews AI scoring: HIGH RISK (score 550)
3. Agrees with recommendation: "REJECT"
4. Select rejection reason: "High debt-to-income ratio"
5. Add additional notes: "Suggest reapplication after 6 months"
6. Click "Reject Application"

Expected Results:
✓ ApplicationDecision record created
✓ Application status = 'rejected'
✓ No Loan created
✓ Borrower notified: "Loan rejected"
✓ Rejection reason provided to borrower
✓ Option to reapply shown

Data Validation:
✓ ApplicationDecision.decision = 'rejected'
✓ ApplicationDecision.rejection_reason captured
✓ ApplicationDecision.decided_at = current timestamp
✓ CreditApplication.status = 'rejected'
✓ Loan record NOT created
```

#### TC-DEC-003: Override AI Recommendation
```
Objective: Verify admin can override AI scoring
Precondition: Application scored; AI recommends REJECT

Scenario: Admin has additional context (e.g., collateral verification)

Steps:
1. Application has low score (550) → AI recommends REJECT
2. Admin reviews additional collateral documentation (provided offline)
3. Determines collateral value covers loan 150%
4. Decides to override AI and APPROVE
5. Set approved amount, term, rate
6. Click "Override AI & Approve"
7. Select override reason: "Collateral covers 150% of loan"

Expected Results:
✓ ApplicationDecision.override_ai_recommendation = true
✓ ApplicationDecision.override_reason captured
✓ ApplicationDecision.original_ai_recommendation = 'reject'
✓ Application approved despite low score
✓ Loan created successfully
✓ Audit log notes override
✓ Borrower approved notification sent

Data Validation:
✓ Override tracked for compliance
✓ Historical record maintained
✓ No data loss
```

---

### 4.6 UAT Test Cases - Loan Management & Payments

#### TC-LOAN-001: Generate Loan Payment Schedule
```
Objective: Verify monthly payment schedule correctly calculated
Precondition: Loan approved and created

Loan Details:
- Principal: 100,000 PHP
- Interest Rate: 12% per annum
- Term: 12 months

Steps:
1. Loan record created
2. System generates payment schedule
3. View payment schedule

Expected Results:
✓ 12 LoanPayment records created
✓ Monthly payment = ~8,885 PHP (calculated)
✓ Due dates set to 1st of each month
✓ All payments status = 'pending'
✓ payment_number: 1, 2, 3, ..., 12
✓ Total payments = ~106,614 PHP (includes interest)

Data Validation:
✓ Mathematical accuracy of payment calculation
✓ Sum of all payments = total_payable
✓ Each payment has correct due_date
✓ No duplicate LoanPayment records
```

#### TC-LOAN-002: Make Payment (On Time)
```
Objective: Verify borrower can make loan payment
Precondition: Loan active; Payment due; Borrower logged in

Steps:
1. Borrower navigates to "Make Payment"
2. Selects loan: LOAN-001
3. Views payment details: 8,885 PHP due on 2024-02-01
4. Selects payment method: "GCash"
5. Click "Pay Now"
6. Redirected to PayMongo payment page
7. Completes payment on PayMongo
8. Returns to app with success status

Expected Results:
✓ PaymongoPayment record created
✓ Payment processed successfully
✓ LoanPayment.paid_date set to payment date
✓ LoanPayment.status = 'paid'
✓ LoanPayment.amount_paid_php = 8,885
✓ Payment confirmation email sent
✓ Borrower receives notification
✓ BorrowerCreditHistory.on_time_payments incremented

Data Validation:
✓ PaymongoPayment.status = 'paid'
✓ PaymongoPayment.amount = 8885
✓ PaymongoPayment.paymongo_payment_id captured
✓ LoanPayment correctly linked to PaymongoPayment
✓ Loan.monthly_payment_php = 8885
```

#### TC-LOAN-003: Late Payment Detection
```
Objective: Verify system detects and processes late payments
Precondition: Payment due 2024-02-01; Now 2024-02-10

Steps:
1. Borrower makes payment 9 days after due date
2. System processes payment

Expected Results:
✓ Payment accepted
✓ LoanPayment.status = 'late'
✓ LoanPayment.days_late = 9
✓ Late fee calculated: amount × 1% × 9 days = ~80 PHP
✓ LoanPayment.late_fee_php = 80
✓ Borrower notified of late payment fee
✓ BorrowerCreditHistory.on_time_payments NOT incremented
✓ BorrowerCreditHistory maintained for record
✓ Late payment notice stored

Data Validation:
✓ Days late calculation accurate
✓ Late fee calculation correct
✓ Fee amount added to next payment or collected
```

#### TC-LOAN-004: Payment Reminder Notifications
```
Objective: Verify payment reminders sent at correct times
Precondition: Payment due 2024-02-01

Steps:
1. Simulate 2024-01-27 (5 days before due)
   → System sends: "Payment due in 5 days"
2. Simulate 2024-02-01 (due date)
   → System sends: "Payment due today"
3. Simulate 2024-02-06 (5 days late)
   → System sends: "Payment is 5 days late"
4. Simulate 2024-02-15 (14 days late)
   → System sends: "Urgent: Payment 14 days overdue"

Expected Results:
✓ All reminders sent at correct times
✓ Reminders contain payment amount
✓ Reminders contain due date
✓ Urgency escalates with days late
✓ Borrower can click reminder to pay immediately
✓ Notification records created

Data Validation:
✓ Notification.type correctly assigned
✓ Notification.created_at accurate
✓ Notification.metadata contains payment details
```

#### TC-LOAN-005: Default Detection (90+ Days Late)
```
Objective: Verify loan defaults after extended non-payment
Precondition: Payment due 2024-02-01; Now 2024-05-01 (90+ days late)

Steps:
1. Payment remains unpaid for 90+ days
2. System triggers default process

Expected Results:
✓ Loan.status changes to 'defaulted'
✓ BorrowerCreditHistory.defaults incremented
✓ Borrower receives "Loan Defaulted" notice
✓ Lending admin receives escalation notice
✓ Borrower flagged for future applications
✓ Legal action may be triggered (manual)
✓ Audit log entry created

Data Validation:
✓ Loan.status = 'defaulted'
✓ Default detected only when days_late >= 90
✓ Only defaulted once (no duplicates)
```

---

### 4.7 UAT Test Cases - Subscription & Billing

#### TC-SUB-001: Create Free Trial Subscription
```
Objective: Verify new tenant gets 3-day free trial
Precondition: New lending company registers

Steps:
1. Company completes registration
2. System creates subscription
3. View subscription details

Expected Results:
✓ Subscription created
✓ Status = 'trial'
✓ trial_ends_at = registration_date + 3 days
✓ current_period_start/end NOT set yet
✓ Company can submit unlimited applications during trial
✓ Countdown timer shown to company

Data Validation:
✓ Subscription.status = 'trial'
✓ Subscription.trial_ends_at = correct date
✓ Subscription.plan_id = Free Trial plan
```

#### TC-SUB-002: Trial Expiration & Payment Prompt
```
Objective: Verify trial expiration triggers payment prompt
Precondition: Trial subscription created; 3 days passed

Steps:
1. Simulate date = trial_ends_at
2. System detects trial expiry
3. Company receives prompt to upgrade
4. Company clicks "Choose Plan"
5. Selects "Professional Plan" ($99/month)
6. Initiates payment

Expected Results:
✓ Trial status maintained until payment
✓ Payment prompt displays available plans
✓ Upgrade flow initiated
✓ PayMongo payment intent created
✓ Checkout link generated
✓ Company redirected to payment page

Data Validation:
✓ Subscription.status still = 'trial' (until payment succeeds)
✓ PaymongoPayment record created with pending status
```

#### TC-SUB-003: Payment Success & Subscription Activation
```
Objective: Verify successful payment activates subscription
Precondition: Company completed PayMongo payment; Webhook received

Steps:
1. Company completes payment on PayMongo
2. PayMongo sends webhook: payment successful
3. Edge function processes webhook
4. Subscription status updated

Expected Results:
✓ Subscription.status = 'active'
✓ current_period_start = today
✓ current_period_end = today + 30 days
✓ Company can continue operations
✓ Application limits enforce per plan
✓ Confirmation email sent
✓ Invoice generated

Data Validation:
✓ Subscription.paymongo_payment_id linked
✓ Subscription.status = 'active'
✓ PaymongoPayment.status = 'paid'
```

#### TC-SUB-004: Application Limit Enforcement
```
Objective: Verify monthly application limits enforced
Precondition: Company on "Starter" plan (50 apps/month)

Steps:
1. Company submits 50 applications this month
2. Attempts to submit 51st application
3. System checks limit

Expected Results:
✓ 1st-50th applications accepted
✓ 51st application rejected
✓ Error message: "Monthly application limit reached"
✓ Prompt to upgrade to higher plan
✓ Upgrade link provided
✓ Audit log notes limit enforcement

Data Validation:
✓ Application count = 50
✓ 51st application NOT created
✓ Subscription.plan.max_applications_per_month enforced
```

#### TC-SUB-005: Subscription Renewal
```
Objective: Verify subscription auto-renewal or manual renewal
Precondition: Active subscription; current_period_end = tomorrow

Steps:
Automatic Renewal (if configured):
1. current_period_end reached
2. System initiates auto-payment
3. PayMongo processes charge
4. Webhook updates subscription

OR Manual Renewal (if required):
1. Company receives renewal prompt
2. Company clicks "Renew"
3. PayMongo payment initiated
4. Payment succeeds
5. Subscription renewed

Expected Results:
✓ Subscription renewed successfully
✓ Status remains 'active'
✓ current_period_start/end updated
✓ No service interruption
✓ Renewal invoice generated

Data Validation:
✓ Subscription.current_period_end extended
✓ PaymongoPayment record created for renewal
```

#### TC-SUB-006: Payment Failure & Suspension
```
Objective: Verify subscription suspended on payment failure
Precondition: Renewal payment failed; Company notified

Steps:
1. Renewal payment attempt fails
2. System retries after 3 days
3. Retry also fails
4. Company receives suspension warning
5. Company doesn't pay within grace period

Expected Results:
✓ Subscription.status = 'expired'
✓ Company cannot submit new applications
✓ Existing loans/applications unaffected
✓ Suspension notice sent
✓ Reactivation path provided
✓ Company can pay to reactivate

Data Validation:
✓ Subscription.status = 'expired'
✓ Timestamp of status change recorded
```

---

### 4.8 UAT Test Cases - Notifications & Alerts

#### TC-NOTIF-001: Notification Creation & Delivery
```
Objective: Verify notifications created and delivered correctly
Precondition: Event triggers notification (e.g., app submitted)

Steps:
1. Borrower submits application
2. System creates notification for lending_admin
3. Admin logs in to dashboard
4. Notification appears in notification panel

Expected Results:
✓ Notification record created
✓ Notification.is_read = false initially
✓ Notification appears in notification center
✓ Real-time update (if websocket enabled)
✓ Red badge shows unread count
✓ Notification content clear and actionable

Data Validation:
✓ Notification.user_id = admin user_id
✓ Notification.type = 'application_update'
✓ Notification.metadata contains application_id
✓ Notification.created_at = event timestamp
```

#### TC-NOTIF-002: Mark Notifications as Read
```
Objective: Verify user can mark notifications as read
Precondition: Unread notifications exist

Steps:
1. User clicks notification
2. Navigates to related entity
3. User returns to notification panel
4. Notification marked as read
5. Alternative: User clicks "Mark as Read"

Expected Results:
✓ Notification.is_read = true
✓ Notification no longer highlighted
✓ Unread count decremented
✓ Badge count updated

Data Validation:
✓ Notification.is_read = true
✓ Updated timestamp recorded (optional)
```

#### TC-NOTIF-003: Delete Notifications
```
Objective: Verify user can delete notifications
Precondition: Notifications exist

Steps:
1. User clicks "Delete" on notification
2. Confirmation dialog appears
3. User confirms deletion

Expected Results:
✓ Notification deleted from database
✓ Removed from notification panel
✓ Cannot be recovered
✓ Unread count updated if applicable

Data Validation:
✓ Notification record deleted (or soft-deleted)
```

---

### 4.9 UAT Test Cases - Reporting & Analytics

#### TC-REPORT-001: View Dashboard Metrics (Lending Admin)
```
Objective: Verify dashboard displays accurate metrics
Precondition: Admin logged in; Historical data exists

Steps:
1. Admin navigates to Analytics Dashboard
2. Dashboard loads with all metrics
3. Review the following:
   - Total applications (this month): 25
   - Approved applications: 18
   - Rejection rate: 28%
   - Average approval time: 2.5 days
   - Total loan portfolio: 2.5M PHP
   - Portfolio at-risk: 3% (late payments)
   - Payment collection rate: 97%

Expected Results:
✓ All metrics display correctly
✓ Numbers match database counts
✓ Charts render without errors
✓ Data refreshes on page reload
✓ Performance acceptable (< 3 sec)

Data Validation:
✓ Metric calculations correct
✓ Data aggregation accurate
✓ No data duplication
```

#### TC-REPORT-002: Generate Custom Report
```
Objective: Verify user can generate custom date-range report
Precondition: Admin logged in

Steps:
1. Navigate to Reports section
2. Click "Generate Report"
3. Select date range: 2024-01-01 to 2024-02-29
4. Select metrics: Applications, Loans, Payments
5. Select format: PDF
6. Click "Generate"

Expected Results:
✓ Report generated within 10 seconds
✓ PDF downloaded to device
✓ Report contains all selected metrics
✓ Data aggregated correctly
✓ Professional formatting applied
✓ Company logo included
✓ Report date & timestamp

Data Validation:
✓ Report data matches dashboard
✓ No missing information
✓ PDF renders correctly
```

#### TC-REPORT-003: Audit Log Report (Compliance)
```
Objective: Verify audit logs can be exported for compliance
Precondition: Admin logged in; Audit logs exist

Steps:
1. Admin navigates to Audit Logs
2. Filter by date range: Last 30 days
3. Click "Export as CSV"
4. File downloads

Expected Results:
✓ CSV file generated
✓ Contains all columns:
  - Timestamp, User ID, Action, Entity Type, Entity ID
  - Old Values, New Values, IP Address, User Agent
✓ All records included (paginated export)
✓ Format suitable for compliance

Data Validation:
✓ All audit_logs records exported
✓ No missing rows
✓ CSV format valid
```

---

### 4.10 UAT Test Cases - Security & Access Control

#### TC-SEC-001: RLS Policy Enforcement (Tenant Isolation)
```
Objective: Verify lending admin cannot access other tenants' data
Precondition: Admin A belongs to Tenant 1; Admin B belongs to Tenant 2

Steps:
1. Admin A logs in
2. Attempts to access list of applications
3. Admin A should only see Tenant 1 applications
4. Admin A manually tries to access Tenant 2 app by URL/ID
5. System blocks access

Expected Results:
✓ Admin A sees only Tenant 1 data
✓ Admin B sees only Tenant 2 data
✓ Direct ID access blocked (403 Forbidden)
✓ Error message: "Access Denied"
✓ Audit log notes unauthorized access attempt

Data Validation:
✓ RLS policies applied at DB level
✓ Query results filtered by tenant_id
✓ No data leakage between tenants
```

#### TC-SEC-002: Role-Based Route Access
```
Objective: Verify users cannot access pages for other roles
Precondition: Borrower logged in

Steps:
1. Borrower tries to access /admin/dashboard (direct URL)
2. System checks user role

Expected Results:
✓ Access denied
✓ Redirected to borrower dashboard
✓ Error message: "Insufficient permissions"
✓ No error logs exposed to user

Data Validation:
✓ Role verification done before rendering
✓ Protected routes properly configured
```

#### TC-SEC-003: Session Security
```
Objective: Verify sessions are secure and cannot be hijacked
Precondition: User logged in

Steps:
1. User logs in → receives JWT token
2. Token examined (not decoded by client unnecessarily)
3. Token stored securely (HttpOnly cookie OR secure storage)
4. Token sent in Authorization header for API calls
5. Attempt to use token from different device/IP

Expected Results:
✓ Token valid only for authenticated user
✓ Different IP cannot use same token
✓ Token refresh mechanism works
✓ Old tokens invalidated after logout

Data Validation:
✓ JWT signature verified
✓ Token claims validated
✓ No token information logged in plain text
```

#### TC-SEC-004: Password Security
```
Objective: Verify passwords are securely hashed and validated
Precondition: User account exists

Steps:
1. User sets password: "SecurePass123!"
2. Password stored in auth.users table
3. Attempt to view password in DB
4. Password reset flow used

Expected Results:
✓ Password hashed using bcrypt (not plaintext)
✓ Hash stored in DB
✓ Cannot be reversed
✓ Each hash unique (salt included)
✓ Password reset links expire after 24 hours

Data Validation:
✓ Password field not readable
✓ Supabase handles hashing
✓ No passwords in logs/audit trails
```

---

### 4.11 UAT Test Cases - Error Handling & Edge Cases

#### TC-ERR-001: Handle Network Errors
```
Objective: Verify application handles network failures gracefully
Precondition: User performing action that requires API call

Steps:
1. Simulate network disconnect
2. User clicks "Submit Application"
3. API call fails (timeout)

Expected Results:
✓ Error message displayed: "Network error - please try again"
✓ Retry button provided
✓ User data preserved (not lost)
✓ No partial state updates
✓ Can retry when network restored

Data Validation:
✓ No corrupted records created
✓ Transaction rolled back if applicable
```

#### TC-ERR-002: Handle Concurrent Edits
```
Objective: Verify handling when multiple users edit same record
Precondition: Admin A viewing application; Admin B viewing same app

Steps:
1. Admin A makes change to application
2. Admin B makes conflicting change
3. Admin B attempts to save

Expected Results:
✓ Optimistic locking prevents conflict
✓ Admin B receives: "This record was modified"
✓ Admin B can view latest changes
✓ Admin B can retry merge changes
✓ No data lost

Data Validation:
✓ Last-write-wins or conflict resolution applied
✓ Audit trail shows both changes
```

#### TC-ERR-003: Large File Upload Handling
```
Objective: Verify large file upload doesn't crash app
Precondition: Borrower uploading document

Steps:
1. Select 50 MB file (larger than max 10 MB)
2. Click "Upload"
3. System processes upload

Expected Results:
✓ File size validation performed
✓ Error message: "File too large (max 10 MB)"
✓ Upload rejected
✓ No partial upload stored

Data Validation:
✓ File not stored
✓ No database record created
```

#### TC-ERR-004: Invalid Input Handling
```
Objective: Verify invalid input is rejected
Precondition: User entering data

Steps:
1. Enter loan amount: "abc" (non-numeric)
2. Enter email: "invalid-email" (bad format)
3. Enter phone: "12345" (invalid format)

Expected Results:
✓ Input validation triggers
✓ Error messages displayed in real-time
✓ Submit button disabled until valid
✓ User cannot submit invalid data

Data Validation:
✓ Client-side validation works
✓ Server-side validation also applied
✓ No invalid records in database
```

---

### 4.12 UAT Test Cases - Performance & Load Testing

#### TC-PERF-001: Dashboard Load Time
```
Objective: Verify dashboard loads within acceptable time
Precondition: Admin logged in; Dashboard has 1000s of records

Steps:
1. Navigate to Analytics Dashboard
2. Measure load time
3. Interact with filters
4. Generate report

Expected Results:
✓ Initial page load: < 3 seconds
✓ Metric updates: < 1 second
✓ Report generation: < 10 seconds
✓ Smooth interactions, no lag

Data Validation:
✓ No N+1 query problems
✓ Efficient database queries
✓ Indexes properly used
```

#### TC-PERF-002: Bulk Application Processing
```
Objective: Verify system can handle bulk data
Precondition: System with 10,000 applications

Steps:
1. Run scoring on 100 applications simultaneously
2. Monitor system performance
3. Check for failures

Expected Results:
✓ All scoring completes successfully
✓ No timeout errors
✓ System remains responsive
✓ Database connections pooled properly

Data Validation:
✓ All 100 AIScoringResult records created
✓ No duplicate records
✓ Processing times reasonable
```

---

## 5. UAT TEST EXECUTION & SIGN-OFF

### 5.1 Test Summary Matrix

| Category | # Test Cases | Priority | Status | Notes |
|----------|-------------|----------|--------|-------|
| Authentication | 6 | Critical | Ready | Security-critical |
| Applications | 5 | Critical | Ready | Core workflow |
| Documents | 3 | Critical | Ready | KYC compliance |
| Scoring | 3 | Critical | Ready | Business logic |
| Decisions | 3 | High | Ready | Approval process |
| Payments | 5 | Critical | Ready | Revenue stream |
| Subscriptions | 6 | High | Ready | Billing model |
| Notifications | 3 | Medium | Ready | UX enhancement |
| Reporting | 3 | Medium | Ready | Analytics |
| Security | 4 | Critical | Ready | Compliance |
| Error Handling | 4 | Medium | Ready | Robustness |
| Performance | 2 | High | Ready | Scalability |
| **TOTAL** | **47** | — | — | — |

### 5.2 UAT Sign-Off Requirements

```
✓ All Critical tests pass (100% success rate)
✓ High priority tests pass (95%+ success rate)
✓ Medium priority tests pass (90%+ success rate)
✓ No data loss or corruption incidents
✓ No security vulnerabilities identified
✓ Performance benchmarks met
✓ Documentation complete and accurate
✓ User training completed
✓ Production readiness confirmed

Sign-Off:
□ QA Lead: ________________  Date: ________
□ Business Owner: ____________  Date: ________
□ Technical Lead: ____________  Date: ________
□ Security Officer: ____________  Date: ________
```

---

## CONCLUSION

This comprehensive testing plan ensures HiramEase platform is production-ready, secure, compliant, and meets all user expectations. The 47+ test cases cover all critical system functions, edge cases, security requirements, and performance considerations.

Key Testing Focus Areas:
1. **Functional Completeness**: All features work as designed
2. **Data Integrity**: No data loss or corruption
3. **Security & Compliance**: DPA, RLS, audit trails
4. **Performance**: Acceptable load times
5. **Error Handling**: Graceful failure recovery
6. **User Experience**: Intuitive workflows
7. **Accessibility**: Available to all users

