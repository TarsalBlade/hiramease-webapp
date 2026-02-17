/*
  # HiramEase Initial Database Schema
  
  1. New Tables
    - `tenants` - Lending companies registered on the platform
      - `id` (uuid, primary key)
      - `company_name` (text) - Official company name
      - `registration_type` (text) - DTI or SEC
      - `registration_number` (text) - DTI/SEC registration number
      - `email` (text) - Company contact email
      - `phone` (text) - Company phone
      - `address` (text) - Business address
      - `status` (text) - pending, active, suspended
      - `created_at`, `updated_at` (timestamptz)
    
    - `subscription_plans` - Available subscription tiers
      - `id` (uuid, primary key)
      - `name` (text) - Plan name
      - `description` (text)
      - `price_php` (numeric) - Monthly price in PHP
      - `max_applications_per_month` (integer)
      - `max_users` (integer)
      - `features` (jsonb) - Feature flags
      - `is_active` (boolean)
    
    - `subscriptions` - Tenant subscriptions
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `plan_id` (uuid, references subscription_plans)
      - `status` (text) - trial, active, cancelled, expired
      - `trial_ends_at` (timestamptz)
      - `current_period_start`, `current_period_end` (timestamptz)
    
    - `user_profiles` - Extended user information
      - `id` (uuid, primary key, references auth.users)
      - `tenant_id` (uuid, nullable, references tenants)
      - `role` (text) - super_admin, lending_admin, borrower
      - `first_name`, `last_name` (text)
      - `phone` (text)
      - `is_active` (boolean)
    
    - `borrower_profiles` - Borrower-specific information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `tenant_id` (uuid, references tenants)
      - `date_of_birth` (date)
      - `gender` (text)
      - `civil_status` (text)
      - `nationality` (text)
      - `address`, `city`, `province`, `postal_code` (text)
      - `employer_name`, `employer_address` (text)
      - `employment_status` (text)
      - `monthly_income_php` (numeric)
    
    - `credit_applications` - Loan applications
      - `id` (uuid, primary key)
      - `application_number` (text, unique)
      - `borrower_id` (uuid, references borrower_profiles)
      - `tenant_id` (uuid, references tenants)
      - `loan_amount_php` (numeric)
      - `loan_purpose` (text)
      - `loan_term_months` (integer)
      - `collateral_type` (text)
      - `collateral_description` (text)
      - `collateral_estimated_value_php` (numeric)
      - `status` (text) - draft, submitted, under_review, verified, scored, approved, rejected, disbursed
      - `submitted_at`, `decided_at` (timestamptz)
    
    - `documents` - Uploaded documents
      - `id` (uuid, primary key)
      - `application_id` (uuid, references credit_applications)
      - `document_type` (text) - valid_id, proof_of_income, collateral_proof, etc.
      - `file_name`, `file_path` (text)
      - `file_size_bytes` (bigint)
      - `mime_type` (text)
      - `verification_status` (text) - pending, verified, rejected
      - `uploaded_by` (uuid, references auth.users)
    
    - `document_verifications` - Manual verification records
      - `id` (uuid, primary key)
      - `document_id` (uuid, references documents)
      - `verified_by` (uuid, references auth.users)
      - `status` (text) - verified, rejected
      - `notes` (text)
      - `verified_at` (timestamptz)
    
    - `ai_scoring_results` - AI credit scoring results
      - `id` (uuid, primary key)
      - `application_id` (uuid, references credit_applications)
      - `overall_score` (integer) - 0-100
      - `risk_level` (text) - low, medium, high
      - `score_breakdown` (jsonb) - Detailed scoring factors
      - `recommendation` (text) - approve, reject, review
      - `explanation` (text) - Human-readable explanation
      - `model_version` (text)
      - `scored_at` (timestamptz)
    
    - `application_decisions` - Final human decisions
      - `id` (uuid, primary key)
      - `application_id` (uuid, references credit_applications)
      - `decided_by` (uuid, references auth.users)
      - `decision` (text) - approved, rejected
      - `approved_amount_php` (numeric)
      - `approved_term_months` (integer)
      - `interest_rate_percent` (numeric)
      - `conditions` (text)
      - `rejection_reason` (text)
      - `decided_at` (timestamptz)
    
    - `consent_records` - NPC consent capture for Data Privacy Act compliance
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `consent_type` (text)
      - `consent_text` (text)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `consented_at` (timestamptz)
    
    - `audit_logs` - Compliance audit trail
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, nullable)
      - `user_id` (uuid, nullable)
      - `action` (text)
      - `entity_type` (text)
      - `entity_id` (uuid)
      - `old_values`, `new_values` (jsonb)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for role-based access control
    - Super admins can manage tenants and subscriptions
    - Lending admins can only access their tenant's data
    - Borrowers can only access their own data
*/

-- Create enum types for better data integrity
DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'lending_admin', 'borrower');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'under_review', 'verified', 'scored', 'approved', 'rejected', 'disbursed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE decision_type AS ENUM ('approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  registration_type text NOT NULL CHECK (registration_type IN ('DTI', 'SEC')),
  registration_number text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  province text,
  postal_code text,
  status tenant_status DEFAULT 'pending',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registration_type, registration_number)
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_php numeric(12,2) NOT NULL DEFAULT 0,
  max_applications_per_month integer NOT NULL DEFAULT 100,
  max_users integer NOT NULL DEFAULT 5,
  features jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status subscription_status DEFAULT 'trial',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'borrower',
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Borrower profiles table
CREATE TABLE IF NOT EXISTS borrower_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  civil_status text CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced')),
  nationality text DEFAULT 'Filipino',
  address text,
  city text,
  province text,
  postal_code text,
  employer_name text,
  employer_address text,
  employment_status text CHECK (employment_status IN ('employed', 'self_employed', 'unemployed', 'retired', 'student')),
  monthly_income_php numeric(12,2),
  years_employed integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Credit applications table
CREATE TABLE IF NOT EXISTS credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text NOT NULL UNIQUE,
  borrower_id uuid NOT NULL REFERENCES borrower_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loan_amount_php numeric(12,2) NOT NULL,
  loan_purpose text NOT NULL,
  loan_term_months integer NOT NULL,
  collateral_type text,
  collateral_description text,
  collateral_estimated_value_php numeric(12,2),
  status application_status DEFAULT 'draft',
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  verification_status verification_status DEFAULT 'pending',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document verifications table
CREATE TABLE IF NOT EXISTS document_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  verified_by uuid NOT NULL REFERENCES auth.users(id),
  status verification_status NOT NULL,
  notes text,
  verified_at timestamptz DEFAULT now()
);

-- AI scoring results table
CREATE TABLE IF NOT EXISTS ai_scoring_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level risk_level NOT NULL,
  score_breakdown jsonb DEFAULT '{}',
  recommendation text CHECK (recommendation IN ('approve', 'reject', 'review')),
  explanation text,
  model_version text DEFAULT '1.0',
  scored_at timestamptz DEFAULT now(),
  UNIQUE(application_id)
);

-- Application decisions table
CREATE TABLE IF NOT EXISTS application_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decision decision_type NOT NULL,
  approved_amount_php numeric(12,2),
  approved_term_months integer,
  interest_rate_percent numeric(5,2),
  conditions text,
  rejection_reason text,
  decided_at timestamptz DEFAULT now(),
  UNIQUE(application_id)
);

-- Consent records table
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_text text NOT NULL,
  ip_address inet,
  user_agent text,
  consented_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_tenant ON borrower_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_borrower_profiles_user ON borrower_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_tenant ON credit_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_borrower ON credit_applications(borrower_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_status ON credit_applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Subscription Plans: Anyone can read active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Tenants: Super admins can manage all, lending admins can view their own
CREATE POLICY "Super admins can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Lending admins can view their tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = tenants.id
      AND user_profiles.role = 'lending_admin'
    )
  );

-- Subscriptions: Super admins can manage, tenant admins can view
CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Lending admins can view their subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.tenant_id = subscriptions.tenant_id
      AND user_profiles.role = 'lending_admin'
    )
  );

-- User Profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
    )
  );

CREATE POLICY "Lending admins can view tenant profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'lending_admin'
      AND up.tenant_id = user_profiles.tenant_id
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Borrower Profiles
CREATE POLICY "Borrowers can view their own borrower profile"
  ON borrower_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Borrowers can manage their own borrower profile"
  ON borrower_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Borrowers can update their own borrower profile"
  ON borrower_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Lending admins can view tenant borrower profiles"
  ON borrower_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = borrower_profiles.tenant_id
    )
  );

-- Credit Applications
CREATE POLICY "Borrowers can view their own applications"
  ON credit_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM borrower_profiles
      WHERE borrower_profiles.id = credit_applications.borrower_id
      AND borrower_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can create applications"
  ON credit_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrower_profiles
      WHERE borrower_profiles.id = credit_applications.borrower_id
      AND borrower_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can update draft applications"
  ON credit_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM borrower_profiles
      WHERE borrower_profiles.id = credit_applications.borrower_id
      AND borrower_profiles.user_id = auth.uid()
    )
    AND status = 'draft'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrower_profiles
      WHERE borrower_profiles.id = credit_applications.borrower_id
      AND borrower_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Lending admins can view tenant applications"
  ON credit_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = credit_applications.tenant_id
    )
  );

CREATE POLICY "Lending admins can update tenant applications"
  ON credit_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = credit_applications.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = credit_applications.tenant_id
    )
  );

-- Documents
CREATE POLICY "Users can view documents for their applications"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = documents.application_id
      AND bp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE ca.id = documents.application_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

CREATE POLICY "Users can upload documents for their applications"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = documents.application_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Lending admins can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE ca.id = documents.application_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

-- Document Verifications
CREATE POLICY "Lending admins can manage verifications"
  ON document_verifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN credit_applications ca ON ca.id = d.application_id
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE d.id = document_verifications.document_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

CREATE POLICY "Borrowers can view their document verifications"
  ON document_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN credit_applications ca ON ca.id = d.application_id
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE d.id = document_verifications.document_id
      AND bp.user_id = auth.uid()
    )
  );

-- AI Scoring Results
CREATE POLICY "Lending admins can view scoring results"
  ON ai_scoring_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE ca.id = ai_scoring_results.application_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can create scoring results"
  ON ai_scoring_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE ca.id = ai_scoring_results.application_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

-- Application Decisions
CREATE POLICY "Lending admins can manage decisions"
  ON application_decisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN user_profiles up ON up.tenant_id = ca.tenant_id
      WHERE ca.id = application_decisions.application_id
      AND up.id = auth.uid()
      AND up.role = 'lending_admin'
    )
  );

CREATE POLICY "Borrowers can view their decisions"
  ON application_decisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = application_decisions.application_id
      AND bp.user_id = auth.uid()
    )
  );

-- Consent Records
CREATE POLICY "Users can manage their own consent records"
  ON consent_records FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit Logs
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Lending admins can view tenant audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = audit_logs.tenant_id
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_php, max_applications_per_month, max_users, features) VALUES
  ('Starter', 'Perfect for small lending operations', 2999.00, 50, 3, '{"document_verification": true, "ai_scoring": true, "basic_reports": true}'),
  ('Professional', 'For growing lending companies', 7999.00, 200, 10, '{"document_verification": true, "ai_scoring": true, "advanced_reports": true, "api_access": true}'),
  ('Enterprise', 'Full-featured for large operations', 19999.00, 1000, 50, '{"document_verification": true, "ai_scoring": true, "advanced_reports": true, "api_access": true, "custom_scoring": true, "dedicated_support": true}')
ON CONFLICT DO NOTHING;

-- Function to generate application numbers
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS trigger AS $$
BEGIN
  NEW.application_number := 'APP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate application numbers
DROP TRIGGER IF EXISTS set_application_number ON credit_applications;
CREATE TRIGGER set_application_number
  BEFORE INSERT ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION generate_application_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_borrower_profiles_updated_at ON borrower_profiles;
CREATE TRIGGER update_borrower_profiles_updated_at
  BEFORE UPDATE ON borrower_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_credit_applications_updated_at ON credit_applications;
CREATE TRIGGER update_credit_applications_updated_at
  BEFORE UPDATE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();