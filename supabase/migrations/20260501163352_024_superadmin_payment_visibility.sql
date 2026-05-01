/*
  # Super admin full visibility into all subscription payments

  1. Changes
    - Add SELECT policy on paymongo_payments for super_admin role
      so they can see every payment made by any subscribing company
    - Uses the existing get_user_role() helper function (consistent
      with the subscriptions table policy pattern)

  2. Security
    - Super admins can only SELECT (read) — no INSERT/UPDATE via this policy
    - INSERT still restricted to the paying user (existing policy)
    - UPDATE still restricted to service role (existing policy)
*/

CREATE POLICY "Super admins can view all payments"
  ON paymongo_payments
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');
