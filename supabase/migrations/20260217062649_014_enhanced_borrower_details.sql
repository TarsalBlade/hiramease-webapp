/*
  # Enhanced Borrower Details and Credit History

  1. Modified Tables
    - `borrower_profiles`: Add detailed employment and financial fields
      - `job_title` (text): Position/role at employer
      - `other_monthly_income_php` (numeric): Additional income sources
      - `existing_debts_php` (numeric): Total existing monthly obligations
      - `tin` (text): Tax Identification Number
      - `emergency_contact_name` (text)
      - `emergency_contact_phone` (text)
      - `emergency_contact_relationship` (text)
      - `reference_name` (text)
      - `reference_phone` (text)
      - `reference_relationship` (text)

  2. New Tables
    - `loans`: Tracks approved and disbursed loans
      - `id` (uuid, primary key)
      - `application_id` (uuid, references credit_applications)
      - `borrower_id` (uuid, references borrower_profiles)
      - `tenant_id` (uuid, references tenants)
      - `principal_amount_php` (numeric): Original loan amount
      - `interest_rate_percent` (numeric): Applied interest rate
      - `term_months` (integer): Loan term
      - `monthly_payment_php` (numeric): Scheduled monthly payment
      - `total_payable_php` (numeric): Total amount to be paid
      - `disbursed_at` (timestamptz): When funds were released
      - `maturity_date` (date): Final payment due date
      - `status` (enum): active, paid_off, defaulted, written_off
      - `created_at`, `updated_at`

    - `loan_payments`: Tracks all payments made
      - `id` (uuid, primary key)
      - `loan_id` (uuid, references loans)
      - `borrower_id` (uuid, references borrower_profiles)
      - `tenant_id` (uuid, references tenants)
      - `payment_number` (integer): Which payment in sequence
      - `due_date` (date): When payment was due
      - `paid_date` (date): When payment was made (null if unpaid)
      - `amount_due_php` (numeric): Expected payment amount
      - `amount_paid_php` (numeric): Actual amount paid
      - `status` (enum): pending, paid, late, missed
      - `days_late` (integer): Days overdue
      - `late_fee_php` (numeric): Late payment penalty
      - `created_at`, `updated_at`

  3. Security
    - Enable RLS on all new tables
    - Lending admins can view/manage loans and payments for their tenant
    - Borrowers can view their own loans and payments
*/

-- Add new fields to borrower_profiles
ALTER TABLE borrower_profiles
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS other_monthly_income_php numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS existing_debts_php numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tin text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS reference_name text,
  ADD COLUMN IF NOT EXISTS reference_phone text,
  ADD COLUMN IF NOT EXISTS reference_relationship text;

-- Create loan status enum
DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('active', 'paid_off', 'defaulted', 'written_off');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late', 'missed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES credit_applications(id) ON DELETE SET NULL,
  borrower_id uuid REFERENCES borrower_profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  principal_amount_php numeric NOT NULL,
  interest_rate_percent numeric NOT NULL,
  term_months integer NOT NULL,
  monthly_payment_php numeric NOT NULL,
  total_payable_php numeric NOT NULL,
  disbursed_at timestamptz DEFAULT now(),
  maturity_date date NOT NULL,
  status loan_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  borrower_id uuid REFERENCES borrower_profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  payment_number integer NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  amount_due_php numeric NOT NULL,
  amount_paid_php numeric DEFAULT 0,
  status payment_status DEFAULT 'pending',
  days_late integer DEFAULT 0,
  late_fee_php numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_tenant ON loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_borrower ON loan_payments(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON loan_payments(status);

-- Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loans
CREATE POLICY "Lending admins can view tenant loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

CREATE POLICY "Borrowers can view own loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    borrower_id IN (
      SELECT id FROM borrower_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Lending admins can manage tenant loans"
  ON loans FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

-- RLS Policies for loan_payments
CREATE POLICY "Lending admins can view tenant payments"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

CREATE POLICY "Borrowers can view own payments"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    borrower_id IN (
      SELECT id FROM borrower_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Lending admins can manage tenant payments"
  ON loan_payments FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );
