/*
  # Lending Settings and Notifications

  1. New Tables
    - `tenant_lending_settings`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, unique, references tenants)
      - `interest_rate_annual_percent` (numeric) - annual interest rate
      - `interest_type` (text) - 'diminishing_balance', 'flat', or 'add_on'
      - `min_loan_amount_php` (numeric) - minimum loan amount
      - `max_loan_amount_php` (numeric) - maximum loan amount
      - `min_loan_term_months` (integer) - minimum term in months
      - `max_loan_term_months` (integer) - maximum term in months
      - `processing_fee_percent` (numeric) - upfront processing fee
      - `service_fee_percent` (numeric) - service/admin fee
      - `insurance_fee_percent` (numeric) - insurance fee
      - `late_payment_penalty_percent` (numeric) - monthly late penalty
      - `required_documents` (jsonb) - list of required doc types
      - `max_dti_ratio_percent` (numeric) - max debt-to-income
      - `created_at` / `updated_at`

    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `tenant_id` (uuid, references tenants, nullable)
      - `title` (text)
      - `message` (text)
      - `type` (text) - 'application_update', 'payment', 'document', 'system'
      - `is_read` (boolean, default false)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Lending admins can manage their own lending settings
    - Borrowers can read lending settings for active tenants (to see rates)
    - Users can read/update their own notifications
    - Super admins can view all notifications

  3. Functions
    - `get_or_create_lending_settings` - retrieves or creates default lending settings for a tenant
*/

-- Tenant Lending Settings
CREATE TABLE IF NOT EXISTS tenant_lending_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE NOT NULL REFERENCES tenants(id),
  interest_rate_annual_percent numeric NOT NULL DEFAULT 24,
  interest_type text NOT NULL DEFAULT 'diminishing_balance',
  min_loan_amount_php numeric NOT NULL DEFAULT 5000,
  max_loan_amount_php numeric NOT NULL DEFAULT 1000000,
  min_loan_term_months integer NOT NULL DEFAULT 3,
  max_loan_term_months integer NOT NULL DEFAULT 60,
  processing_fee_percent numeric NOT NULL DEFAULT 2,
  service_fee_percent numeric NOT NULL DEFAULT 0,
  insurance_fee_percent numeric NOT NULL DEFAULT 0,
  late_payment_penalty_percent numeric NOT NULL DEFAULT 3,
  required_documents jsonb NOT NULL DEFAULT '["valid_id", "proof_of_income"]'::jsonb,
  max_dti_ratio_percent numeric NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_interest_type CHECK (interest_type IN ('diminishing_balance', 'flat', 'add_on')),
  CONSTRAINT valid_interest_rate CHECK (interest_rate_annual_percent >= 0 AND interest_rate_annual_percent <= 100),
  CONSTRAINT valid_loan_amounts CHECK (min_loan_amount_php > 0 AND max_loan_amount_php >= min_loan_amount_php),
  CONSTRAINT valid_loan_terms CHECK (min_loan_term_months > 0 AND max_loan_term_months >= min_loan_term_months),
  CONSTRAINT valid_fees CHECK (
    processing_fee_percent >= 0 AND
    service_fee_percent >= 0 AND
    insurance_fee_percent >= 0 AND
    late_payment_penalty_percent >= 0
  )
);

ALTER TABLE tenant_lending_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lending admins can view their lending settings"
  ON tenant_lending_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can insert their lending settings"
  ON tenant_lending_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can update their lending settings"
  ON tenant_lending_settings
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'lending_admin'
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Borrowers can view active tenant lending settings"
  ON tenant_lending_settings
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'borrower'
    AND EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = tenant_lending_settings.tenant_id
      AND t.status = 'active'
    )
  );

CREATE POLICY "Super admins can manage all lending settings"
  ON tenant_lending_settings
  FOR ALL
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  tenant_id uuid REFERENCES tenants(id),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (type IN ('application_update', 'payment', 'document', 'system'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('super_admin', 'lending_admin')
    OR user_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_tenant_lending_settings_tenant ON tenant_lending_settings(tenant_id);

-- Function to get or create lending settings
CREATE OR REPLACE FUNCTION get_or_create_lending_settings(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings tenant_lending_settings;
BEGIN
  SELECT * INTO v_settings
  FROM tenant_lending_settings
  WHERE tenant_id = p_tenant_id;

  IF v_settings.id IS NULL THEN
    INSERT INTO tenant_lending_settings (tenant_id)
    VALUES (p_tenant_id)
    RETURNING * INTO v_settings;
  END IF;

  RETURN row_to_json(v_settings);
END;
$$;
