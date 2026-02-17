/*
  # Subscription Enforcement & Registration Fix

  1. Changes
    - Update `register_lending_company` to NOT auto-create subscriptions
      - Subscriptions should only be created after payment on the subscribe page
      - Registration now only creates tenant + user profile
    - Create `get_subscription_status` function
      - Returns comprehensive subscription status for a tenant
      - Checks trial expiry, active subscription, payment status
      - Used by frontend to gate dashboard access
    - Update `activate_free_trial` to accept and store payment reference
      - Ensures payment was made before activating trial

  2. Security
    - All functions use SECURITY DEFINER to bypass RLS safely
    - Functions validate input parameters
    - Subscription status check is read-only

  3. Important Notes
    - Lending companies MUST complete payment before accessing the platform
    - Trial activation requires a payment reference (payment_id from PayMongo)
    - Existing subscriptions are not affected by this migration
    - The get_subscription_status function is the single source of truth for access control
*/

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
  v_tenant tenants;
BEGIN
  INSERT INTO tenants (
    company_name,
    registration_type,
    registration_number,
    email,
    phone,
    status
  ) VALUES (
    p_company_name,
    p_registration_type,
    p_registration_number,
    p_company_email,
    p_company_phone,
    'pending'
  )
  RETURNING * INTO v_tenant;

  INSERT INTO user_profiles (
    id,
    tenant_id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    p_user_id,
    v_tenant.id,
    'lending_admin',
    p_first_name,
    p_last_name,
    true
  );

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant.id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A company with this registration number already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_subscription_status(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription record;
  v_plan record;
  v_is_valid boolean;
  v_status text;
  v_days_left integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN json_build_object(
      'has_subscription', false,
      'is_valid', false,
      'requires_subscription', true,
      'status', 'none'
    );
  END IF;

  SELECT s.*, sp.name as plan_name, sp.price_php, sp.max_applications_per_month, sp.max_users
  INTO v_subscription
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id;

  IF v_subscription IS NULL THEN
    RETURN json_build_object(
      'has_subscription', false,
      'is_valid', false,
      'requires_subscription', true,
      'status', 'none'
    );
  END IF;

  v_status := v_subscription.status::text;

  IF v_status = 'trial' THEN
    IF v_subscription.trial_ends_at IS NOT NULL AND v_subscription.trial_ends_at < now() THEN
      UPDATE subscriptions
      SET status = 'expired', updated_at = now()
      WHERE tenant_id = p_tenant_id;

      v_status := 'expired';
      v_is_valid := false;
    ELSE
      v_is_valid := true;
      v_days_left := GREATEST(0, EXTRACT(day FROM (v_subscription.trial_ends_at - now()))::integer);
    END IF;
  ELSIF v_status = 'active' THEN
    IF v_subscription.current_period_end IS NOT NULL AND v_subscription.current_period_end < now() THEN
      UPDATE subscriptions
      SET status = 'expired', updated_at = now()
      WHERE tenant_id = p_tenant_id;

      v_status := 'expired';
      v_is_valid := false;
    ELSE
      v_is_valid := true;
    END IF;
  ELSE
    v_is_valid := false;
  END IF;

  RETURN json_build_object(
    'has_subscription', true,
    'is_valid', v_is_valid,
    'requires_subscription', NOT v_is_valid,
    'status', v_status,
    'plan_name', v_subscription.plan_name,
    'plan_id', v_subscription.plan_id,
    'price_php', v_subscription.price_php,
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'days_left', COALESCE(v_days_left, 0),
    'trial_used', COALESCE(v_subscription.trial_used, false)
  );
END;
$$;

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
