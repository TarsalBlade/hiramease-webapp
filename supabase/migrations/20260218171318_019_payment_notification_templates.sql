/*
  # Add Payment Notification Template Defaults

  1. Changes
    - Updates the `get_or_create_notification_template` function to include
      specific default templates for `payment_reminder` and `payment_overdue` types
    - These templates use placeholders: {{due_date}}, {{amount_due}}, {{loan_amount}}, {{days_overdue}}

  2. New Template Types
    - `payment_reminder`: Sent before or on the due date to remind borrowers
    - `payment_overdue`: Sent when a payment is past due

  3. Security
    - No RLS changes needed; templates are managed through existing policies
*/

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
  SELECT * INTO v_template
  FROM notification_templates
  WHERE tenant_id = p_tenant_id AND template_type = p_template_type;

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

    ELSIF p_template_type = 'payment_reminder' THEN
      v_default_subject := 'Payment Reminder';
      v_default_email := 'This is a friendly reminder that your loan payment is due.

Payment Details:
- Due Date: {{due_date}}
- Amount Due: {{amount_due}}
- Loan Amount: {{loan_amount}}

Please ensure your payment is made on or before the due date to avoid any late fees.

Payment Methods:
- Visit our office
- Transfer through our supported payment channels

For questions, please contact us.

Thank you for your prompt payment!';
      v_default_sms := 'Reminder: Your loan payment of {{amount_due}} is due on {{due_date}}. Please pay on time to avoid late fees. Contact us for details.';
      v_default_in_app := 'Your payment of {{amount_due}} is due on {{due_date}}. Please make your payment on time to avoid penalties.';

    ELSIF p_template_type = 'payment_overdue' THEN
      v_default_subject := 'Payment Overdue Notice';
      v_default_email := 'IMPORTANT: Your loan payment is overdue.

Overdue Details:
- Original Due Date: {{due_date}}
- Amount Due: {{amount_due}}
- Days Overdue: {{days_overdue}}

Please settle your payment as soon as possible to avoid additional late fees and penalties.

Late fees may apply based on your loan agreement terms. Contact us immediately to discuss payment arrangements if you are experiencing financial difficulty.

We are here to help find a solution.';
      v_default_sms := 'URGENT: Your payment of {{amount_due}} is {{days_overdue}} days overdue. Please pay immediately to avoid additional fees. Contact us for assistance.';
      v_default_in_app := 'Your payment of {{amount_due}} is {{days_overdue}} days overdue. Please settle immediately to avoid additional penalties.';

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
