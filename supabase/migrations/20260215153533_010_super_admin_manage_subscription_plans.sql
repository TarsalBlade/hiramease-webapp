/*
  # Super Admin Subscription Plan Management

  1. Security Changes
    - Add SELECT policy for super admins to view ALL plans (including inactive)
    - Add UPDATE policy for super admins to modify plan details and pricing
    - Existing public SELECT policy for active plans remains unchanged

  2. Notes
    - Super admins use `get_user_role() = 'super_admin'` pattern consistent with other policies
    - Price changes take effect on next payment; existing subscriptions are not retroactively affected
*/

CREATE POLICY "Super admins can view all subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin'::user_role);

CREATE POLICY "Super admins can update subscription plans"
  ON subscription_plans
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin'::user_role)
  WITH CHECK (get_user_role() = 'super_admin'::user_role);
