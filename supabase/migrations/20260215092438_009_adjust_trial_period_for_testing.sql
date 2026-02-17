/*
  # Adjust Trial Period for Testing

  1. Changes
    - Update `activate_free_trial` function to use 0 days trial period
    - This allows testing subscription enforcement without waiting for expiry
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

  v_trial_end := now() + interval '0 days';

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