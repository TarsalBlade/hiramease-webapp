
/*
  # Fix apply_manual_payment_to_loan + add trigger + backfill

  ## Problems fixed
  1. apply_manual_payment_to_loan assigned text literals to a payment_status
     enum column, causing a type error at runtime — the UPDATE never executed.
  2. The frontend only called the RPC optionally; existing payments were never
     applied to loan_payments installments.

  ## Changes
  1. Recreate apply_manual_payment_to_loan with proper ::payment_status casts.
  2. Add AFTER INSERT trigger on manual_payments so every new payment record
     automatically applies to the loan schedule — no frontend RPC call needed.
  3. Backfill all existing manual_payments that have a loan_id.
*/

-- ----------------------------------------------------------------
-- 1. Fix apply_manual_payment_to_loan (cast to payment_status enum)
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
  v_remaining  numeric := p_amount;
  v_row        record;
  v_updated    integer := 0;
  v_days_late  integer;
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
                          WHEN v_new_paid >= (v_row.amount_due_php + COALESCE(v_row.late_fee_php, 0))
                          THEN 'paid'::payment_status
                          ELSE 'late'::payment_status
                        END,
      updated_at      = now()
    WHERE id = v_row.id;

    v_updated := v_updated + 1;
  END LOOP;

  -- Mark loan paid_off if no remaining unpaid installments
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
-- 2. Trigger function: auto-apply on every INSERT into manual_payments
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_manual_payment_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.loan_id IS NOT NULL THEN
    PERFORM apply_manual_payment_to_loan(
      NEW.loan_id,
      NEW.amount_php,
      NEW.payment_date
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_manual_payment ON manual_payments;

CREATE TRIGGER trg_apply_manual_payment
AFTER INSERT ON manual_payments
FOR EACH ROW
EXECUTE FUNCTION apply_manual_payment_on_insert();

-- ----------------------------------------------------------------
-- 3. Backfill existing manual_payments (chronological per loan)
-- ----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT loan_id, amount_php, payment_date
    FROM manual_payments
    WHERE loan_id IS NOT NULL
    ORDER BY loan_id, payment_date ASC, created_at ASC
  LOOP
    PERFORM apply_manual_payment_to_loan(
      r.loan_id,
      r.amount_php,
      r.payment_date
    );
  END LOOP;
END;
$$;
