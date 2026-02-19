/*
  # Fix borrower user profile visibility for lending admins

  1. Security Changes
    - Add RLS policy on `user_profiles` allowing lending admins to view
      user profiles of borrowers associated with their tenant through
      the `borrower_profiles` table
    - This fixes the issue where borrower name/email/phone was not
      showing up in the lending admin's application review screen

  2. Important Notes
    - Borrowers have `tenant_id = NULL` in `user_profiles` because they
      are not directly associated with a specific tenant
    - The existing policy only allowed lending admins to view profiles
      with matching `tenant_id`, which excluded all borrowers
    - The new policy allows lending admins to see user profiles of users
      who have a `borrower_profiles` row linked to the admin's tenant
*/

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
