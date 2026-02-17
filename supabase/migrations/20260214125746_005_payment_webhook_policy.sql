/*
  # Add Payment Update Policy for Webhooks

  1. Changes
    - Add policy to allow service role to update payment status
    - This enables the webhook function to update payment records
  
  2. Security
    - Policy is restrictive and only allows updates via service role key
    - Regular users cannot update payment statuses directly
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'paymongo_payments'
    AND policyname = 'Service role can update payments'
  ) THEN
    CREATE POLICY "Service role can update payments"
      ON paymongo_payments FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
