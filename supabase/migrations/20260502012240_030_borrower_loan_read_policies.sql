/*
  # Borrower RLS policies for loans and loan_payments

  Allows authenticated borrowers to read their own loan records and
  payment schedules via the borrower_profiles relationship.

  1. loans: SELECT for borrowers who own the borrower_profile
  2. loan_payments: SELECT for borrowers who own the borrower_profile
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'loans' AND policyname = 'Borrowers can view own loans'
  ) THEN
    CREATE POLICY "Borrowers can view own loans"
      ON loans FOR SELECT
      TO authenticated
      USING (
        borrower_id IN (
          SELECT id FROM borrower_profiles WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'loan_payments' AND policyname = 'Borrowers can view own loan payments'
  ) THEN
    CREATE POLICY "Borrowers can view own loan payments"
      ON loan_payments FOR SELECT
      TO authenticated
      USING (
        borrower_id IN (
          SELECT id FROM borrower_profiles WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
