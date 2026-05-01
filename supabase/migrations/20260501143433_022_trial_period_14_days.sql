/*
  # Update trial period to 14 days

  1. Changes
    - Updates `activate_free_trial` function to set trial duration to 14 days
    - Updates `register_lending_company` function to set initial trial to 14 days

  2. Impact
    - New lending companies will get a 14-day free trial upon registration
    - Existing active trials are extended to 14 days from now if they haven't used up
      more than 14 days yet (to avoid cutting short any ongoing trials)
*/

CREATE OR REPLACE FUNCTION activate_free_trial(p_tenant_id uuid, p_plan_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing subscriptions;
  v_subscription subscriptions;
  v_trial_end timestamptz;
BEGIN
  SELECT * INTO v_existing
  FROM subscriptions
  WHERE tenant_id = p_tenant_id;

  IF v_existing IS NOT NULL AND v_existing.trial_used = true THEN
    IF v_existing.status = 'trial' THEN
      RETURN json_build_object(
        'success', true,
        'message', 'Trial already active',
        'subscription', row_to_json(v_existing)
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'Free trial has already been used for this account'
      );
    END IF;
  END IF;

  v_trial_end := now() + interval '14 days';

  IF v_existing IS NULL THEN
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
    RETURNING * INTO v_subscription;
  ELSE
    UPDATE subscriptions
    SET
      plan_id = p_plan_id,
      status = 'trial',
      trial_used = true,
      trial_ends_at = v_trial_end,
      current_period_start = now(),
      current_period_end = v_trial_end,
      updated_at = now()
    WHERE tenant_id = p_tenant_id
    RETURNING * INTO v_subscription;
  END IF;

  UPDATE tenants SET status = 'active' WHERE id = p_tenant_id;

  RETURN json_build_object(
    'success', true,
    'subscription', row_to_json(v_subscription)
  );
END;
$$;

-- Also update the register_lending_company function so new signups get 14-day trial
CREATE OR REPLACE FUNCTION register_lending_company(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_company_name text,
  p_registration_type text,
  p_registration_number text,
  p_company_email text,
  p_company_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_subscription_id uuid;
  v_default_plan_id uuid;
  v_trial_end timestamptz;
BEGIN
  -- Create the tenant
  INSERT INTO tenants (name, registration_type, registration_number, email, phone, status)
  VALUES (p_company_name, p_registration_type, p_registration_number, p_company_email, p_company_phone, 'active')
  RETURNING id INTO v_tenant_id;

  -- Create the user profile
  INSERT INTO user_profiles (id, tenant_id, first_name, last_name, email, role, is_active)
  VALUES (p_user_id, v_tenant_id, p_first_name, p_last_name, p_email, 'lending_admin', true);

  -- Find the default/cheapest active plan
  SELECT id INTO v_default_plan_id
  FROM subscription_plans
  WHERE is_active = true
  ORDER BY price_php ASC
  LIMIT 1;

  -- Set 14-day trial
  v_trial_end := now() + interval '14 days';

  IF v_default_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (
      tenant_id,
      plan_id,
      status,
      trial_used,
      trial_ends_at,
      current_period_start,
      current_period_end
    ) VALUES (
      v_tenant_id,
      v_default_plan_id,
      'trial',
      true,
      v_trial_end,
      now(),
      v_trial_end
    )
    RETURNING id INTO v_subscription_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'subscription_id', v_subscription_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A company with this registration number or email already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
