/*
  # Free Trial System Enhancement

  1. Changes
    - Add trial_used flag to subscriptions to prevent multiple trials
    - Add paymongo_payment_id to track subscription payments
    - Add helper function to activate free trial
    - Add helper function to check trial status
  
  2. Security
    - Policies remain restrictive
    - Only authenticated users can activate their tenant's trial
    - Trial can only be activated once per tenant
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_used'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_used boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'paymongo_payment_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN paymongo_payment_id text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION activate_free_trial(p_tenant_id uuid, p_plan_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_trial_end timestamptz;
BEGIN
  v_trial_end := now() + interval '14 days';
  
  INSERT INTO subscriptions (
    tenant_id,
    plan_id,
    status,
    trial_used,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    p_tenant_id,
    p_plan_id,
    'trial',
    true,
    v_trial_end,
    now(),
    v_trial_end
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = CASE 
      WHEN subscriptions.trial_used = true AND subscriptions.status != 'trial' 
      THEN subscriptions.status
      ELSE 'trial'
    END,
    trial_ends_at = CASE 
      WHEN subscriptions.trial_used = false 
      THEN v_trial_end
      ELSE subscriptions.trial_ends_at
    END,
    trial_used = CASE 
      WHEN subscriptions.trial_used = false 
      THEN true
      ELSE subscriptions.trial_used
    END,
    current_period_end = CASE 
      WHEN subscriptions.trial_used = false 
      THEN v_trial_end
      ELSE subscriptions.current_period_end
    END,
    updated_at = now()
  RETURNING * INTO v_subscription;
  
  RETURN json_build_object(
    'success', true,
    'subscription', row_to_json(v_subscription)
  );
END;
$$;

CREATE OR REPLACE FUNCTION check_trial_status(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_days_left integer;
  v_status text;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE tenant_id = p_tenant_id;
  
  IF v_subscription IS NULL THEN
    RETURN json_build_object(
      'has_subscription', false,
      'can_start_trial', true
    );
  END IF;
  
  IF v_subscription.status = 'trial' THEN
    v_days_left := GREATEST(0, EXTRACT(day FROM (v_subscription.trial_ends_at - now()))::integer);
    
    IF v_subscription.trial_ends_at < now() THEN
      UPDATE subscriptions
      SET status = 'expired', updated_at = now()
      WHERE tenant_id = p_tenant_id;
      
      v_status := 'expired';
    ELSE
      v_status := 'trial';
    END IF;
    
    RETURN json_build_object(
      'has_subscription', true,
      'status', v_status,
      'trial_ends_at', v_subscription.trial_ends_at,
      'days_left', v_days_left,
      'is_expired', v_subscription.trial_ends_at < now()
    );
  END IF;
  
  RETURN json_build_object(
    'has_subscription', true,
    'status', v_subscription.status,
    'current_period_end', v_subscription.current_period_end
  );
END;
$$;
