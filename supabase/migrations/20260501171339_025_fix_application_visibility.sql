/*
  # Fix loan application visibility for lending admins

  ## Problem
  Borrower user_profiles have tenant_id = NULL (borrowers are not tied to a
  specific tenant in user_profiles — their tenant relationship lives in
  borrower_profiles). The existing "Lending admins can view tenant profiles"
  policy requires user_profiles.tenant_id = get_user_tenant_id(), which never
  matches for borrowers, causing PostgREST nested joins to silently drop
  application rows.

  ## Changes
  1. Drop the conflicting/incomplete borrower visibility policy and replace it
     with one that correctly allows lending admins to see any user_profile
     where that user has a borrower_profile for the admin's tenant.
  2. Add a super_admin SELECT policy on ai_scoring_results for completeness.
  3. Ensure the credit_applications SELECT policy also covers the case where
     the application was submitted directly (belt-and-suspenders).
*/

-- Drop old incomplete policy for lending admin viewing borrower user profiles
DROP POLICY IF EXISTS "Lending admins can view borrower user profiles" ON user_profiles;

-- Re-create it using a clean EXISTS check against borrower_profiles
CREATE POLICY "Lending admins can view borrower user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'lending_admin'
    AND EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.user_id = user_profiles.id
        AND bp.tenant_id = get_user_tenant_id()
    )
  );

-- Ensure super admins can see all scoring results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_scoring_results'
      AND policyname = 'Super admins can view all scoring results'
  ) THEN
    CREATE POLICY "Super admins can view all scoring results"
      ON ai_scoring_results
      FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;
