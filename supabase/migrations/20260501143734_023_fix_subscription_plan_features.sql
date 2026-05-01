/*
  # Fix subscription plan features and pricing

  1. Changes
    - Corrects plan names and descriptions to match their tier
    - Sets proper differentiated features per plan (Starter/Professional/Enterprise)
    - Sets realistic pricing (Starter: 1500, Professional: 3500, Enterprise: 7500)
    - Fixes max_applications and max_users per tier

  2. Plan Tiers
    - Starter (Basic): Core lending features, limited apps/users
    - Professional (Premium): + Advanced reports, priority support, custom scoring
    - Enterprise (Standard): All features + API access, dedicated support, white-label
*/

UPDATE subscription_plans
SET
  name = 'Starter',
  description = 'Perfect for small lending companies getting started.',
  price_php = 1500,
  max_applications_per_month = 50,
  max_users = 3,
  features = '{
    "ai_scoring": true,
    "document_verification": true,
    "basic_reports": true,
    "loan_management": true,
    "borrower_management": true,
    "email_notifications": true,
    "advanced_reports": false,
    "custom_scoring": false,
    "api_access": false,
    "dedicated_support": false,
    "white_label": false,
    "priority_support": false
  }'::jsonb
WHERE name = 'Starter';

UPDATE subscription_plans
SET
  name = 'Professional',
  description = 'For growing lending businesses that need more power.',
  price_php = 3500,
  max_applications_per_month = 200,
  max_users = 10,
  features = '{
    "ai_scoring": true,
    "document_verification": true,
    "basic_reports": true,
    "loan_management": true,
    "borrower_management": true,
    "email_notifications": true,
    "advanced_reports": true,
    "custom_scoring": true,
    "priority_support": true,
    "api_access": false,
    "dedicated_support": false,
    "white_label": false
  }'::jsonb
WHERE name = 'Professional';

UPDATE subscription_plans
SET
  name = 'Enterprise',
  description = 'Full-featured solution for large lending operations.',
  price_php = 7500,
  max_applications_per_month = 1000,
  max_users = 50,
  features = '{
    "ai_scoring": true,
    "document_verification": true,
    "basic_reports": true,
    "loan_management": true,
    "borrower_management": true,
    "email_notifications": true,
    "advanced_reports": true,
    "custom_scoring": true,
    "priority_support": true,
    "api_access": true,
    "dedicated_support": true,
    "white_label": true
  }'::jsonb
WHERE name = 'Enterprise';
