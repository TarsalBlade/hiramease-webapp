/*
  # Improve Rejection Notification Trigger

  1. Changes
    - Updates `notify_on_application_decision()` trigger function to include
      the rejection reason in the in-app notification message for borrowers
    - Checks `application_decisions` table for the rejection_reason after the status update
    - Uses a clearer, more specific message for rejected applications

  2. Notes
    - The DB trigger is the sole source of in-app notifications for borrowers on decision
    - Email is handled separately by the frontend via send-notification edge function
    - Approved message remains unchanged
*/

CREATE OR REPLACE FUNCTION notify_on_application_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrower_user_id uuid;
  v_tenant_name text;
  v_title text;
  v_message text;
  v_type text;
  v_rejection_reason text;
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status <> NEW.status THEN
    SELECT bp.user_id INTO v_borrower_user_id
    FROM borrower_profiles bp WHERE bp.id = NEW.borrower_id;

    SELECT t.company_name INTO v_tenant_name
    FROM tenants t WHERE t.id = NEW.tenant_id;

    IF NEW.status = 'approved' THEN
      v_title := 'Loan Application Approved';
      v_message := 'Your application ' || NEW.application_number || ' with ' || COALESCE(v_tenant_name, 'the lending company') || ' has been approved. Please check your dashboard for details.';
      v_type := 'loan_approved';
    ELSE
      -- Try to get rejection reason from application_decisions
      SELECT ad.rejection_reason INTO v_rejection_reason
      FROM application_decisions ad
      WHERE ad.application_id = NEW.id
      ORDER BY ad.decided_at DESC
      LIMIT 1;

      v_title := 'Loan Application Not Approved';
      v_message := 'Your application ' || NEW.application_number || ' with ' || COALESCE(v_tenant_name, 'the lending company') || ' could not be approved. Reason: ' || COALESCE(v_rejection_reason, 'Please contact the lender for details.');
      v_type := 'loan_rejected';
    END IF;

    IF v_borrower_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, tenant_id, title, message, type, metadata)
      VALUES (
        v_borrower_user_id,
        NEW.tenant_id,
        v_title,
        v_message,
        v_type,
        jsonb_build_object('application_id', NEW.id, 'application_number', NEW.application_number, 'status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_decision ON credit_applications;
CREATE TRIGGER trg_notify_application_decision
  AFTER UPDATE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_application_decision();
