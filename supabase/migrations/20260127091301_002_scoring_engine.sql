/*
  # Credit Scoring Engine Schema
  
  1. New Tables
    - `scoring_configurations` - Company-configurable scoring weights
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants) - One config per company
      - `income_stability_weight` (numeric) - Default 0.30
      - `dti_weight` (numeric) - Default 0.30
      - `credit_history_weight` (numeric) - Default 0.25
      - `loan_risk_weight` (numeric) - Default 0.15
      - `low_risk_threshold` (integer) - Default 720
      - `medium_risk_threshold` (integer) - Default 620
      - `created_at`, `updated_at` (timestamptz)
    
    - `borrower_credit_history` - Internal credit history per borrower per tenant
      - `id` (uuid, primary key)
      - `borrower_id` (uuid, references borrower_profiles)
      - `tenant_id` (uuid, references tenants)
      - `total_loans` (integer) - Number of past loans
      - `on_time_payments` (integer) - Payments made on time
      - `late_payments` (integer) - Late payments
      - `defaults` (integer) - Number of defaults
      - `total_borrowed_php` (numeric) - Total amount ever borrowed
      - `total_repaid_php` (numeric) - Total amount repaid
      - `last_loan_date` (date)
      - `created_at`, `updated_at` (timestamptz)

  2. Modified Tables
    - `ai_scoring_results` - Enhanced with detailed factor scores
      - Add `income_stability_score` (integer, 0-100)
      - Add `dti_score` (integer, 0-100)
      - Add `credit_history_score` (integer, 0-100)
      - Add `loan_risk_score` (integer, 0-100)
      - Add `factors_explanation` (jsonb) - Detailed explanations
      - Add `borrower_explanation` (text) - Safe explanation for borrower
      - Add `documents_verified` (boolean) - Scoring requires verified docs

    - `application_decisions` - Enhanced with override logic
      - Add `override_ai_recommendation` (boolean)
      - Add `override_reason` (text)
      - Add `original_ai_recommendation` (text)

  3. Security
    - Enable RLS on new tables
    - Lending admins can manage their tenant's scoring config
    - Credit history is tenant-isolated
*/

-- Scoring configurations table
CREATE TABLE IF NOT EXISTS scoring_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  income_stability_weight numeric(4,2) NOT NULL DEFAULT 0.30 CHECK (income_stability_weight >= 0 AND income_stability_weight <= 1),
  dti_weight numeric(4,2) NOT NULL DEFAULT 0.30 CHECK (dti_weight >= 0 AND dti_weight <= 1),
  credit_history_weight numeric(4,2) NOT NULL DEFAULT 0.25 CHECK (credit_history_weight >= 0 AND credit_history_weight <= 1),
  loan_risk_weight numeric(4,2) NOT NULL DEFAULT 0.15 CHECK (loan_risk_weight >= 0 AND loan_risk_weight <= 1),
  low_risk_threshold integer NOT NULL DEFAULT 720 CHECK (low_risk_threshold >= 300 AND low_risk_threshold <= 850),
  medium_risk_threshold integer NOT NULL DEFAULT 620 CHECK (medium_risk_threshold >= 300 AND medium_risk_threshold <= 850),
  min_score integer NOT NULL DEFAULT 300,
  max_score integer NOT NULL DEFAULT 850,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id),
  CONSTRAINT valid_thresholds CHECK (low_risk_threshold > medium_risk_threshold),
  CONSTRAINT valid_total_weight CHECK (
    income_stability_weight + dti_weight + credit_history_weight + loan_risk_weight = 1.00
  )
);

-- Borrower credit history table (internal per tenant)
CREATE TABLE IF NOT EXISTS borrower_credit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid NOT NULL REFERENCES borrower_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total_loans integer NOT NULL DEFAULT 0,
  on_time_payments integer NOT NULL DEFAULT 0,
  late_payments integer NOT NULL DEFAULT 0,
  defaults integer NOT NULL DEFAULT 0,
  total_borrowed_php numeric(14,2) NOT NULL DEFAULT 0,
  total_repaid_php numeric(14,2) NOT NULL DEFAULT 0,
  last_loan_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(borrower_id, tenant_id)
);

-- Add new columns to ai_scoring_results
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_scoring_results' AND column_name = 'income_stability_score'
  ) THEN
    ALTER TABLE ai_scoring_results 
      ADD COLUMN income_stability_score integer CHECK (income_stability_score >= 0 AND income_stability_score <= 100),
      ADD COLUMN dti_score integer CHECK (dti_score >= 0 AND dti_score <= 100),
      ADD COLUMN credit_history_score integer CHECK (credit_history_score >= 0 AND credit_history_score <= 100),
      ADD COLUMN loan_risk_score integer CHECK (loan_risk_score >= 0 AND loan_risk_score <= 100),
      ADD COLUMN factors_explanation jsonb DEFAULT '{}',
      ADD COLUMN borrower_explanation text,
      ADD COLUMN documents_verified boolean DEFAULT false,
      ADD COLUMN scoring_config_snapshot jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update overall_score constraint for 300-850 range
ALTER TABLE ai_scoring_results DROP CONSTRAINT IF EXISTS ai_scoring_results_overall_score_check;
ALTER TABLE ai_scoring_results ADD CONSTRAINT ai_scoring_results_overall_score_check 
  CHECK (overall_score >= 300 AND overall_score <= 850);

-- Add override columns to application_decisions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_decisions' AND column_name = 'override_ai_recommendation'
  ) THEN
    ALTER TABLE application_decisions 
      ADD COLUMN override_ai_recommendation boolean DEFAULT false,
      ADD COLUMN override_reason text,
      ADD COLUMN original_ai_recommendation text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_tenant ON scoring_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_borrower_credit_history_borrower ON borrower_credit_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_credit_history_tenant ON borrower_credit_history(tenant_id);

-- Enable RLS
ALTER TABLE scoring_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_credit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scoring_configurations
CREATE POLICY "Lending admins can view their scoring config"
  ON scoring_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = scoring_configurations.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can insert their scoring config"
  ON scoring_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = scoring_configurations.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can update their scoring config"
  ON scoring_configurations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = scoring_configurations.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = scoring_configurations.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

-- RLS Policies for borrower_credit_history
CREATE POLICY "Lending admins can view tenant credit history"
  ON borrower_credit_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = borrower_credit_history.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can manage tenant credit history"
  ON borrower_credit_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = borrower_credit_history.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can update tenant credit history"
  ON borrower_credit_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = borrower_credit_history.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = borrower_credit_history.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_scoring_configurations_updated_at ON scoring_configurations;
CREATE TRIGGER update_scoring_configurations_updated_at
  BEFORE UPDATE ON scoring_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_borrower_credit_history_updated_at ON borrower_credit_history;
CREATE TRIGGER update_borrower_credit_history_updated_at
  BEFORE UPDATE ON borrower_credit_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();