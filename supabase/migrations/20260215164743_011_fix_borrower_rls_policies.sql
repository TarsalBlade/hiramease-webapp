/*
  # Fix Borrower RLS Policies

  1. Problem
    - `credit_applications.borrower_id` references `borrower_profiles.id` (auto-generated UUID)
    - But all borrower RLS policies incorrectly compare `borrower_id = auth.uid()`
    - These never match because they are completely different UUIDs
    - Result: borrowers cannot view, create, or update any applications
    - The `tenants` table has no SELECT policy for borrowers, so lending company selection is empty

  2. Tables Fixed
    - `tenants` - Add SELECT policy so borrowers can see active lending companies
    - `credit_applications` - Fix all 3 borrower policies (SELECT, INSERT, UPDATE)
    - `documents` - Fix both borrower policies (SELECT, INSERT)
    - `application_decisions` - Fix borrower SELECT policy
    - `document_verifications` - Fix borrower SELECT policy
    - `ai_scoring_results` - Add missing borrower SELECT policy

  3. Fix Pattern
    - Old (broken): `borrower_id = auth.uid()`
    - New (correct): `EXISTS (SELECT 1 FROM borrower_profiles WHERE id = borrower_id AND user_id = auth.uid())`

  4. Security
    - All policies still restrict access to authenticated users
    - All policies still enforce ownership via auth.uid() through the borrower_profiles join
    - No data is exposed to unauthorized users
*/

-- 1. Allow borrowers to see active tenants for lending company selection
CREATE POLICY "Borrowers can view active tenants"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND get_user_role() = 'borrower'
  );

-- 2. Fix credit_applications borrower policies
DROP POLICY IF EXISTS "Borrowers can create applications" ON credit_applications;
DROP POLICY IF EXISTS "Borrowers can view their own applications" ON credit_applications;
DROP POLICY IF EXISTS "Borrowers can update draft applications" ON credit_applications;

CREATE POLICY "Borrowers can view their own applications"
  ON credit_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.id = credit_applications.borrower_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can create applications"
  ON credit_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.id = credit_applications.borrower_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can update draft applications"
  ON credit_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.id = credit_applications.borrower_id
      AND bp.user_id = auth.uid()
    )
    AND status = 'draft'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.id = credit_applications.borrower_id
      AND bp.user_id = auth.uid()
    )
  );

-- 3. Fix documents borrower policies
DROP POLICY IF EXISTS "Users can view documents for their applications" ON documents;
DROP POLICY IF EXISTS "Users can upload documents for their applications" ON documents;

CREATE POLICY "Users can view documents for their applications"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = documents.application_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents for their applications"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = documents.application_id
      AND bp.user_id = auth.uid()
    )
  );

-- Add missing lending admin SELECT for documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Lending admins can view tenant documents'
    AND polrelid = 'documents'::regclass
  ) THEN
    CREATE POLICY "Lending admins can view tenant documents"
      ON documents
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM credit_applications ca
          WHERE ca.id = documents.application_id
          AND ca.tenant_id = get_user_tenant_id()
        )
        AND get_user_role() = 'lending_admin'
      );
  END IF;
END $$;

-- 4. Fix application_decisions borrower SELECT policy
DROP POLICY IF EXISTS "Borrowers can view their decisions" ON application_decisions;

CREATE POLICY "Borrowers can view their decisions"
  ON application_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_applications ca
      JOIN borrower_profiles bp ON bp.id = ca.borrower_id
      WHERE ca.id = application_decisions.application_id
      AND bp.user_id = auth.uid()
    )
  );

-- 5. Fix document_verifications borrower SELECT policy
DROP POLICY IF EXISTS "Borrowers can view their document verifications" ON document_verifications;

CREATE POLICY "Borrowers can view their document verifications"
  ON document_verifications
  FOR SELECT
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

-- 6. Add missing borrower SELECT for ai_scoring_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Borrowers can view their scoring results'
    AND polrelid = 'ai_scoring_results'::regclass
  ) THEN
    CREATE POLICY "Borrowers can view their scoring results"
      ON ai_scoring_results
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM credit_applications ca
          JOIN borrower_profiles bp ON bp.id = ca.borrower_id
          WHERE ca.id = ai_scoring_results.application_id
          AND bp.user_id = auth.uid()
        )
      );
  END IF;
END $$;
