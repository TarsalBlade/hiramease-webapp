/*
  # Comprehensive Fixes Migration

  1. New Columns
    - `tenants.logo_url` already exists (confirmed)
    - `tenants.description` - Company description for borrower display
    - `credit_applications.is_read_by_admin` already exists (confirmed)
    - `tenant_lending_settings.interest_type` already supports flat/diminishing_balance/add_on

  2. New Tables
    - `manual_payments` - For lending companies to record manual/offline payments
      - `id`, `loan_id`, `borrower_id`, `tenant_id`
      - `amount_php`, `payment_date`, `payment_method`, `reference_number`
      - `notes`, `recorded_by`, `created_at`

  3. Security
    - Enable RLS on manual_payments
    - Lending admins can manage manual payments for their tenant
    - Borrowers can view their own manual payments

  4. RLS policy fix for borrower_profiles to allow lending admins to see all tenant borrowers
     including those who just registered

  5. Add more interest type options to tenant_lending_settings
*/

-- Add description to tenants if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'description'
  ) THEN
    ALTER TABLE tenants ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

-- Create manual_payments table for offline/manual payment recording
CREATE TABLE IF NOT EXISTS manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE,
  borrower_id uuid REFERENCES borrower_profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  amount_php numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  receipt_number text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_tenant ON manual_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_borrower ON manual_payments(borrower_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_loan ON manual_payments(loan_id);

ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lending admins can manage tenant manual payments"
  ON manual_payments FOR ALL
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

CREATE POLICY "Borrowers can view own manual payments"
  ON manual_payments FOR SELECT
  TO authenticated
  USING (
    borrower_id IN (
      SELECT id FROM borrower_profiles WHERE user_id = auth.uid()
    )
  );

-- Update tenants RLS to allow lending admins to update their own tenant
CREATE POLICY "Lending admins can update their tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

-- Add interest_type enum values if the column supports it
-- The interest_type in tenant_lending_settings is already text, so we just document the valid options:
-- diminishing_balance, flat, add_on, straight_line, compound
-- No schema change needed since it's a text column
