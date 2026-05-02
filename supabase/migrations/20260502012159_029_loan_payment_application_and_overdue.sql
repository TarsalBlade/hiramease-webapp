/*
  # Loan Payment Application & Overdue Status

  1. New Function: apply_manual_payment_to_loan
     - Called after a manual_payment is recorded against a loan_id
     - Finds the earliest pending/late installment(s) and applies the amount
     - Marks installments paid (or partially paid), calculates days_late
     - Returns the number of installments updated

  2. New Function: refresh_overdue_loan_payments
     - Scans all loan_payments with status='pending' whose due_date < today
     - Updates them to 'late' (if partially paid or unpaid but due_date passed)
     - Updates them to 'missed' (if unpaid and due_date > 30 days ago)
     - Updates days_late column

  3. RLS
     - No new tables — functions run as SECURITY DEFINER
*/

-- -------------------------------------------------------
-- Function: apply_manual_payment_to_loan
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_manual_payment_to_loan(
  p_loan_id   uuid,
  p_amount    numeric,
  p_paid_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining  numeric := p_amount;
  v_row        record;
  v_updated    integer := 0;
  v_days_late  integer;
BEGIN
  -- Loop through installments oldest-first that still need payment
  FOR v_row IN
    SELECT id, amount_due_php, amount_paid_php, due_date, late_fee_php
    FROM loan_payments
    WHERE loan_id = p_loan_id
      AND status IN ('pending', 'late', 'missed')
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    DECLARE
      v_outstanding numeric;
      v_apply       numeric;
      v_new_paid    numeric;
    BEGIN
      v_outstanding := (v_row.amount_due_php + COALESCE(v_row.late_fee_php, 0)) - COALESCE(v_row.amount_paid_php, 0);
      IF v_outstanding <= 0 THEN
        CONTINUE;
      END IF;

      v_apply    := LEAST(v_remaining, v_outstanding);
      v_new_paid := COALESCE(v_row.amount_paid_php, 0) + v_apply;
      v_remaining := v_remaining - v_apply;

      -- Calculate days_late: if paid after due_date
      v_days_late := GREATEST(0, (p_paid_date - v_row.due_date)::integer);

      UPDATE loan_payments
      SET
        amount_paid_php = v_new_paid,
        paid_date       = p_paid_date,
        days_late       = v_days_late,
        status = CASE
          WHEN v_new_paid >= (v_row.amount_due_php + COALESCE(v_row.late_fee_php, 0)) THEN 'paid'
          ELSE 'late'
        END,
        updated_at = now()
      WHERE id = v_row.id;

      v_updated := v_updated + 1;
    END;
  END LOOP;

  -- If all installments paid, mark loan as paid_off
  IF NOT EXISTS (
    SELECT 1 FROM loan_payments
    WHERE loan_id = p_loan_id
      AND status IN ('pending', 'late', 'missed')
  ) THEN
    UPDATE loans SET status = 'paid_off', updated_at = now() WHERE id = p_loan_id;
  END IF;

  RETURN v_updated;
END;
$$;

-- -------------------------------------------------------
-- Function: refresh_overdue_loan_payments
-- Marks pending installments as late/missed based on today's date
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_overdue_loan_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_count integer;
BEGIN
  UPDATE loan_payments
  SET
    status     = CASE
                   WHEN (v_today - due_date) > 30 AND amount_paid_php = 0 THEN 'missed'
                   ELSE 'late'
                 END,
    days_late  = GREATEST(0, (v_today - due_date)::integer),
    updated_at = now()
  WHERE status = 'pending'
    AND due_date < v_today
    AND amount_paid_php < amount_due_php;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
