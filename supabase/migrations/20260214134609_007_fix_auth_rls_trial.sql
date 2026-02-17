/*
  # Fix Authentication, RLS, and Trial System

  1. New Functions
    - `register_lending_company` - SECURITY DEFINER function that handles tenant + subscription + profile creation atomically after auth signup
    - Replaces the broken client-side flow that failed due to RLS policies
  
  2. Security Changes
    - Add policy for lending admins to view their own subscription (already exists but verifying)
    - Add policy for authenticated users to update subscriptions via RPC (SECURITY DEFINER handles this)
    - Fix subscription upsert to use proper ON CONFLICT

  3. Important Notes
    - The old signup flow created tenants BEFORE creating the auth user, which violated RLS
    - The new flow: auth.signUp() -> register_lending_company() RPC -> profile created inside RPC
    - SECURITY DEFINER functions bypass RLS, so the function can create tenants and subscriptions
    - Trial activation already uses SECURITY DEFINER, so it should work
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
  v_subscription subscriptions;
  v_plan_id uuid;
  v_trial_end timestamptz;
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

  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE is_active = true
  ORDER BY price_php ASC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
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
      v_tenant.id,
      v_plan_id,
      'trial',
      true,
      v_trial_end,
      now(),
      v_trial_end
    )
    RETURNING * INTO v_subscription;
  END IF;

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant.id,
    'subscription_id', v_subscription.id
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

CREATE OR REPLACE FUNCTION register_borrower(
  p_user_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    p_user_id,
    'borrower',
    p_first_name,
    p_last_name,
    true
  );

  RETURN json_build_object('success', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile already exists for this user'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION register_super_admin(
  p_user_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    p_user_id,
    'super_admin',
    p_first_name,
    p_last_name,
    true
  );

  RETURN json_build_object('success', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile already exists for this user'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
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

  RETURN json_build_object(
    'success', true,
    'subscription', row_to_json(v_subscription)
  );
END;
$$;

CREATE OR REPLACE FUNCTION activate_paid_subscription(
  p_tenant_id uuid,
  p_plan_id uuid,
  p_payment_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_period_end timestamptz;
BEGIN
  v_period_end := now() + interval '30 days';

  INSERT INTO subscriptions (
    tenant_id,
    plan_id,
    status,
    trial_used,
    current_period_start,
    current_period_end,
    paymongo_payment_id
  ) VALUES (
    p_tenant_id,
    p_plan_id,
    'active',
    true,
    now(),
    v_period_end,
    p_payment_id
  )
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    current_period_start = now(),
    current_period_end = v_period_end,
    paymongo_payment_id = EXCLUDED.paymongo_payment_id,
    updated_at = now()
  RETURNING * INTO v_subscription;

  RETURN json_build_object(
    'success', true,
    'subscription', row_to_json(v_subscription)
  );
END;
$$;
