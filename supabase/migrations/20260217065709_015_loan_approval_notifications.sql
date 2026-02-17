/*
  # Loan Approval Notification System

  1. New Tables
    - `notification_templates`: Message templates for lending companies
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `template_type` (text): 'loan_approval', 'loan_rejection', etc.
      - `subject` (text): Email subject
      - `email_body` (text): Email message body
      - `sms_body` (text): SMS message body
      - `in_app_message` (text): In-app notification message
      - `is_active` (boolean): Whether template is active
      - `created_at`, `updated_at`

  2. Security
    - Enable RLS on notification_templates
    - Lending admins can manage their tenant's templates
    - System can read templates for sending notifications

  3. Default Templates
    - Create default loan approval template for each tenant
*/

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  email_body text NOT NULL,
  sms_body text NOT NULL,
  in_app_message text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, template_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Lending admins can view tenant templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

CREATE POLICY "Lending admins can manage tenant templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'lending_admin'
    )
  );

-- Create function to get or create default notification template
CREATE OR REPLACE FUNCTION get_or_create_notification_template(
  p_tenant_id uuid,
  p_template_type text
)
RETURNS notification_templates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template notification_templates;
  v_default_subject text;
  v_default_email text;
  v_default_sms text;
  v_default_in_app text;
BEGIN
  -- Try to get existing template
  SELECT * INTO v_template
  FROM notification_templates
  WHERE tenant_id = p_tenant_id AND template_type = p_template_type;

  -- If not found, create default template
  IF NOT FOUND THEN
    IF p_template_type = 'loan_approval' THEN
      v_default_subject := 'Loan Application Approved';
      v_default_email := 'Congratulations! Your loan application has been approved.

Loan Details:
- Amount: {{loan_amount}}
- Term: {{loan_term}} months
- Monthly Payment: {{monthly_payment}}

Next Steps:
1. Visit our office to complete the documentation
2. Bring a valid government-issued ID
3. Sign the loan agreement

Our office is open Monday-Friday, 9:00 AM - 5:00 PM.

For questions, please contact us at our office or reply to this email.

Thank you for choosing us!';
      v_default_sms := 'Your loan of {{loan_amount}} has been approved! Please visit our office to complete the process. Contact us for more details.';
      v_default_in_app := 'Your loan application for {{loan_amount}} has been approved! Visit our office to complete the documentation and sign the agreement.';
    ELSIF p_template_type = 'loan_rejection' THEN
      v_default_subject := 'Loan Application Update';
      v_default_email := 'Thank you for your loan application.

After careful review, we regret to inform you that we are unable to approve your application at this time.

Reason: {{rejection_reason}}

You may reapply after addressing the concerns or contact us to discuss alternative options.

Thank you for your understanding.';
      v_default_sms := 'Unfortunately, your loan application could not be approved at this time. Please contact us for more information.';
      v_default_in_app := 'Your loan application could not be approved. Reason: {{rejection_reason}}';
    ELSE
      v_default_subject := 'Notification';
      v_default_email := 'You have a new notification.';
      v_default_sms := 'You have a new notification.';
      v_default_in_app := 'You have a new notification.';
    END IF;

    INSERT INTO notification_templates (
      tenant_id,
      template_type,
      subject,
      email_body,
      sms_body,
      in_app_message,
      is_active
    ) VALUES (
      p_tenant_id,
      p_template_type,
      v_default_subject,
      v_default_email,
      v_default_sms,
      v_default_in_app,
      true
    )
    RETURNING * INTO v_template;
  END IF;

  RETURN v_template;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_notification_template(uuid, text) TO authenticated;
