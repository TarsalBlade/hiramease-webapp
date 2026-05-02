
/*
  # Fix advance/overpayment status on loan_payments

  ## Problem
  When a borrower pays more than the current installment, the excess spills
  into the next installment as a partial credit. The old logic marked that
  next installment as 'late' unconditionally whenever it was only partially
  paid — even if its due date is still in the future.

  ## Fix
  Change the status assignment in apply_manual_payment_to_loan so that a
  partially-paid installment is only marked 'late' when p_paid_date is
  actually past its due_date. Otherwise it stays 'pending' (advance payment).

  ## Also fixes current bad data
  Resets any installment that was wrongly marked 'late' due to advance
  payment (has amount_paid_php > 0 but due_date is in the future).
*/

-- ----------------------------------------------------------------
-- 1. Recreate function with corrected status logic
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_manual_payment_to_loan(
  p_loan_id   uuid,
  p_amount    numeric,
  p_paid_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining   numeric := p_amount;
  v_row         record;
  v_updated     integer := 0;
  v_days_late   integer;
  v_outstanding numeric;
  v_apply       numeric;
  v_new_paid    numeric;
BEGIN
  FOR v_row IN
    SELECT id, amount_due_php, amount_paid_php, due_date, late_fee_php
    FROM loan_payments
    WHERE loan_id = p_loan_id
      AND status IN ('pending'::payment_status, 'late'::payment_status, 'missed'::payment_status)
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_outstanding := (v_row.amount_due_php + COALESCE(v_row.late_fee_php, 0))
                     - COALESCE(v_row.amount_paid_php, 0);

    CONTINUE WHEN v_outstanding <= 0;

    v_apply    := LEAST(v_remaining, v_outstanding);
    v_new_paid := COALESCE(v_row.amount_paid_php, 0) + v_apply;
    v_remaining := v_remaining - v_apply;

    v_days_late := GREATEST(0, (p_paid_date - v_row.due_date)::integer);

    UPDATE loan_payments
    SET
      amount_paid_php = v_new_paid,
      paid_date       = p_paid_date,
      days_late       = v_days_late,
      status          = CASE
                          -- Fully paid
                          WHEN v_new_paid >= (v_row.amount_due_php + COALESCE(v_row.late_fee_php, 0))
                            THEN 'paid'::payment_status
                          -- Partially paid and already past due date → late
                          WHEN p_paid_date > v_row.due_date
                            THEN 'late'::payment_status
                          -- Partially paid but due date not yet reached → advance payment, keep pending
                          ELSE 'pending'::payment_status
                        END,
      updated_at      = now()
    WHERE id = v_row.id;

    v_updated := v_updated + 1;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM loan_payments
    WHERE loan_id = p_loan_id
      AND status IN ('pending'::payment_status, 'late'::payment_status, 'missed'::payment_status)
  ) THEN
    UPDATE loans SET status = 'paid_off'::loan_status, updated_at = now()
    WHERE id = p_loan_id;
  END IF;

  RETURN v_updated;
END;
$$;

-- ----------------------------------------------------------------
-- 2. Fix existing wrongly-marked 'late' installments that are
--    actually advance payments (due_date in the future, partial pay)
-- ----------------------------------------------------------------
UPDATE loan_payments
SET
  status     = 'pending'::payment_status,
  days_late  = 0,
  updated_at = now()
WHERE status = 'late'::payment_status
  AND amount_paid_php > 0
  AND amount_paid_php < amount_due_php
  AND due_date > CURRENT_DATE;
