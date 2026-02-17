/*
  # Fix Recursive RLS Policies

  1. Problem
    - RLS policies on user_profiles were querying user_profiles itself
    - This creates an infinite recursion causing 500 errors on auth

  2. Solution
    - Create a SECURITY DEFINER function to check user roles that bypasses RLS
    - Update policies to use this function instead of direct table queries
    
  3. Changes
    - Add `get_user_role` function with SECURITY DEFINER
    - Add `get_user_tenant_id` function with SECURITY DEFINER  
    - Update user_profiles policies to use these functions
    - Update other policies that had recursive issues
*/

-- Create a function to get the current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Create a function to get the current user's tenant_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid();
$$;

-- Drop and recreate user_profiles policies without recursion
DROP POLICY IF EXISTS "Lending admins can view tenant profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;

CREATE POLICY "Lending admins can view tenant profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Update tenants policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can manage tenants" ON tenants;

CREATE POLICY "Lending admins can view their tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Super admins can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Update subscriptions policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view their subscription" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;

CREATE POLICY "Lending admins can view their subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Update borrower_profiles policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view tenant borrower profiles" ON borrower_profiles;

CREATE POLICY "Lending admins can view tenant borrower profiles"
  ON borrower_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

-- Update credit_applications policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view tenant applications" ON credit_applications;
DROP POLICY IF EXISTS "Lending admins can update tenant applications" ON credit_applications;

CREATE POLICY "Lending admins can view tenant applications"
  ON credit_applications FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can update tenant applications"
  ON credit_applications FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

-- Update documents policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can update documents" ON documents;

CREATE POLICY "Lending admins can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      WHERE ca.id = documents.application_id
      AND ca.tenant_id = get_user_tenant_id()
    )
    AND get_user_role() = 'lending_admin'
  );

-- Update document_verifications policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can manage verifications" ON document_verifications;

CREATE POLICY "Lending admins can manage verifications"
  ON document_verifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN credit_applications ca ON ca.id = d.application_id
      WHERE d.id = document_verifications.document_id
      AND ca.tenant_id = get_user_tenant_id()
    )
    AND get_user_role() = 'lending_admin'
  );

-- Update audit_logs policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view tenant audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;

CREATE POLICY "Lending admins can view tenant audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR (tenant_id = get_user_tenant_id() AND get_user_role() = 'lending_admin')
    OR get_user_role() = 'super_admin'
  );

-- Update ai_scoring_results policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view scoring results" ON ai_scoring_results;
DROP POLICY IF EXISTS "Lending admins can create scoring results" ON ai_scoring_results;

CREATE POLICY "Lending admins can view scoring results"
  ON ai_scoring_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      WHERE ca.id = ai_scoring_results.application_id
      AND ca.tenant_id = get_user_tenant_id()
    )
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can create scoring results"
  ON ai_scoring_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      WHERE ca.id = application_id
      AND ca.tenant_id = get_user_tenant_id()
    )
    AND get_user_role() = 'lending_admin'
  );

-- Update application_decisions policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can manage decisions" ON application_decisions;

CREATE POLICY "Lending admins can manage decisions"
  ON application_decisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      WHERE ca.id = application_decisions.application_id
      AND ca.tenant_id = get_user_tenant_id()
    )
    AND get_user_role() = 'lending_admin'
  );

-- Update scoring_configurations policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view their scoring config" ON scoring_configurations;
DROP POLICY IF EXISTS "Lending admins can insert their scoring config" ON scoring_configurations;
DROP POLICY IF EXISTS "Lending admins can update their scoring config" ON scoring_configurations;

CREATE POLICY "Lending admins can view their scoring config"
  ON scoring_configurations FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can insert their scoring config"
  ON scoring_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can update their scoring config"
  ON scoring_configurations FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

-- Update borrower_credit_history policies to use helper functions
DROP POLICY IF EXISTS "Lending admins can view tenant credit history" ON borrower_credit_history;
DROP POLICY IF EXISTS "Lending admins can manage tenant credit history" ON borrower_credit_history;
DROP POLICY IF EXISTS "Lending admins can update tenant credit history" ON borrower_credit_history;

CREATE POLICY "Lending admins can view tenant credit history"
  ON borrower_credit_history FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can manage tenant credit history"
  ON borrower_credit_history FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );

CREATE POLICY "Lending admins can update tenant credit history"
  ON borrower_credit_history FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id() 
    AND get_user_role() = 'lending_admin'
  );