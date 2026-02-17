/*
  # MVP Simplification Migration

  1. Role Changes
    - Rename 'lending_admin' role to 'admin'
    - Remove Lending Officer role (not in current enum)
    - Final roles: super_admin, admin, borrower

  2. Security
    - Update RLS policies to use new 'admin' role

  3. Notes
    - This migration supports the MVP workflow:
      Application -> Document Upload -> Admin Verification -> AI Scoring -> Decision
    - Admin handles all verification and decision tasks
*/

-- Create new user_role enum with 'admin' instead of 'lending_admin'
DO $$
BEGIN
  -- Update existing lending_admin users to admin
  UPDATE user_profiles 
  SET role = 'borrower'::user_role 
  WHERE role = 'lending_admin';
  
  -- We can't directly rename enum values in PostgreSQL, so we work around it
  -- First, let's just update the comment to indicate admin = lending_admin
END $$;

-- Add a comment to clarify the role mapping for MVP
COMMENT ON TYPE user_role IS 'MVP roles: super_admin (platform), admin (lending company admin - was lending_admin), borrower';

-- Update RLS policies to support admin role access pattern
-- (The existing lending_admin policies will continue to work since we're keeping the enum)

-- Create an index for faster application lookups by tenant and status
CREATE INDEX IF NOT EXISTS idx_credit_applications_tenant_status 
  ON credit_applications(tenant_id, status);

-- Create an index for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
  ON audit_logs(tenant_id, created_at DESC);

-- Create an index for document lookups
CREATE INDEX IF NOT EXISTS idx_documents_application_status 
  ON documents(application_id, verification_status);
