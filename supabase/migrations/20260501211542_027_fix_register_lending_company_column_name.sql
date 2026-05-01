/*
  # Fix register_lending_company function

  The function was inserting into column `name` on the `tenants` table,
  but the actual column is `company_name`. This replaces the function
  with the corrected column reference.
*/

CREATE OR REPLACE FUNCTION public.register_lending_company(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_company_name text,
  p_registration_type text,
  p_registration_number text,
  p_company_email text,
  p_company_phone text DEFAULT NULL::text
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
  -- Create the tenant (fixed: company_name not name)
  INSERT INTO tenants (company_name, registration_type, registration_number, email, phone, status)
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
