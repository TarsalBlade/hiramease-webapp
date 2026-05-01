/*
  # Fix credit_applications INSERT RLS policy

  ## Problem
  The existing "Borrowers can create applications" INSERT policy checks that
  the borrower_id belongs to the authenticated user, but does NOT verify that
  the tenant_id on the application matches the tenant_id on the borrower_profile.
  This means the tenant_id could be null or mismatched, causing the application
  to be invisible to the lending admin (who filters by their own tenant_id).

  ## Fix
  Replace the INSERT policy to also enforce that:
    1. The borrower_id belongs to the authenticated user (existing check)
    2. The tenant_id on the application matches the tenant_id on the borrower_profile

  This ensures every submitted application is correctly associated with a tenant
  and therefore visible to the lending admin of that tenant.
*/

-- Drop old policy and replace with stricter version
DROP POLICY IF EXISTS "Borrowers can create applications" ON credit_applications;

CREATE POLICY "Borrowers can create applications"
  ON credit_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrower_profiles bp
      WHERE bp.id = credit_applications.borrower_id
        AND bp.user_id = auth.uid()
        AND bp.tenant_id = credit_applications.tenant_id
    )
  );
