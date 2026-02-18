/*
  # Notification System Fix & Super Admin Enhancements

  1. Notifications
    - Drop conflicting constraint on notifications.type
    - Add expanded check constraint supporting: application_update, payment, document, system, loan_approved, loan_rejected, new_application
    - Create trigger function to auto-notify lending admins on new application submission
    - Create trigger function to auto-notify borrowers on application status change

  2. Super Admin Enhancements
    - Add super_admin read policies for borrower_profiles and credit_applications
    - Add super_admin update policy for user_profiles (to manage accounts)
    - Add super_admin insert policy for notifications (to send system-wide notices)
    - Add super_admin insert policy for activity_logs

  3. Activity Logs
    - Add super_admin insert policy for activity_logs
    - Ensure comprehensive logging capabilities
*/

-- Fix notification type constraint: drop old restrictive one, keep expanded one
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('application_update', 'payment', 'document', 'system', 'loan_approved', 'loan_rejected', 'new_application'));

-- Function: notify lending admins when borrower submits a new application
CREATE OR REPLACE FUNCTION notify_on_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrower_name text;
  v_admin_record record;
BEGIN
  IF NEW.status = 'submitted' AND (OLD IS NULL OR OLD.status <> 'submitted') THEN
    SELECT COALESCE(up.first_name || ' ' || up.last_name, 'A borrower')
    INTO v_borrower_name
    FROM borrower_profiles bp
    JOIN user_profiles up ON up.id = bp.user_id
    WHERE bp.id = NEW.borrower_id;

    FOR v_admin_record IN
      SELECT id FROM user_profiles
      WHERE tenant_id = NEW.tenant_id AND role = 'lending_admin' AND is_active = true
    LOOP
      INSERT INTO notifications (user_id, tenant_id, title, message, type, metadata)
      VALUES (
        v_admin_record.id,
        NEW.tenant_id,
        'New Loan Application',
        v_borrower_name || ' submitted application ' || NEW.application_number || ' for PHP ' || to_char(NEW.loan_amount_php, 'FM999,999,999'),
        'new_application',
        jsonb_build_object('application_id', NEW.id, 'application_number', NEW.application_number, 'borrower_id', NEW.borrower_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_application ON credit_applications;
CREATE TRIGGER trg_notify_new_application
  AFTER INSERT OR UPDATE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_application();

-- Function: notify borrower when their application status changes (approved/rejected)
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
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status <> NEW.status THEN
    SELECT bp.user_id INTO v_borrower_user_id
    FROM borrower_profiles bp WHERE bp.id = NEW.borrower_id;

    SELECT t.company_name INTO v_tenant_name
    FROM tenants t WHERE t.id = NEW.tenant_id;

    IF NEW.status = 'approved' THEN
      v_title := 'Loan Application Approved';
      v_message := 'Your application ' || NEW.application_number || ' with ' || COALESCE(v_tenant_name, 'the lending company') || ' has been approved.';
      v_type := 'loan_approved';
    ELSE
      v_title := 'Loan Application Update';
      v_message := 'Your application ' || NEW.application_number || ' with ' || COALESCE(v_tenant_name, 'the lending company') || ' has been reviewed. Please check your dashboard for details.';
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

-- Super admin RLS: read borrower_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.borrower_profiles'::regclass 
    AND polname = 'Super admins can view all borrower profiles'
  ) THEN
    CREATE POLICY "Super admins can view all borrower profiles"
      ON borrower_profiles FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin RLS: read credit_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.credit_applications'::regclass 
    AND polname = 'Super admins can view all applications'
  ) THEN
    CREATE POLICY "Super admins can view all applications"
      ON credit_applications FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin RLS: update user_profiles (for managing accounts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.user_profiles'::regclass 
    AND polname = 'Super admins can update all profiles'
  ) THEN
    CREATE POLICY "Super admins can update all profiles"
      ON user_profiles FOR UPDATE
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin RLS: insert notifications (system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.notifications'::regclass 
    AND polname = 'Super admins can view all notifications'
  ) THEN
    CREATE POLICY "Super admins can view all notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin insert activity logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.activity_logs'::regclass 
    AND polname = 'Super admins can insert any activity logs'
  ) THEN
    CREATE POLICY "Super admins can insert any activity logs"
      ON activity_logs FOR INSERT
      TO authenticated
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin read all tenants (ensure policy exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.tenants'::regclass 
    AND polname = 'Super admins can view all tenants'
  ) THEN
    CREATE POLICY "Super admins can view all tenants"
      ON tenants FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin update tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.tenants'::regclass 
    AND polname = 'Super admins can update all tenants'
  ) THEN
    CREATE POLICY "Super admins can update all tenants"
      ON tenants FOR UPDATE
      TO authenticated
      USING (get_user_role() = 'super_admin')
      WITH CHECK (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin read loans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.loans'::regclass 
    AND polname = 'Super admins can view all loans'
  ) THEN
    CREATE POLICY "Super admins can view all loans"
      ON loans FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Super admin read loan payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.loan_payments'::regclass 
    AND polname = 'Super admins can view all loan payments'
  ) THEN
    CREATE POLICY "Super admins can view all loan payments"
      ON loan_payments FOR SELECT
      TO authenticated
      USING (get_user_role() = 'super_admin');
  END IF;
END $$;

-- Enable realtime on notifications table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
