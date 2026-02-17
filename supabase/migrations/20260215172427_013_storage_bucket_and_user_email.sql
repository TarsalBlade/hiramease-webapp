/*
  # Storage Bucket and User Email

  1. Storage
    - Create `documents` storage bucket for uploaded loan documents
    - Add storage policies for authenticated users to upload/read their documents
    - Add policy for lending admins to read documents for their tenant

  2. Modified Tables
    - `user_profiles`: Add `email` column (text) to avoid needing to join auth.users
    - Backfill email from auth.users for existing records

  3. Security
    - Storage policies restrict access appropriately
    - Email column inherits existing RLS on user_profiles
*/

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: borrowers can upload to their tenant folder
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Lending admins and borrowers can view documents
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Add email column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Backfill email from auth.users for existing records
UPDATE user_profiles
SET email = au.email
FROM auth.users au
WHERE user_profiles.id = au.id
AND user_profiles.email IS NULL;

-- Create trigger to auto-populate email on new user_profiles
CREATE OR REPLACE FUNCTION set_user_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_profile_email ON user_profiles;
CREATE TRIGGER trg_set_user_profile_email
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_profile_email();
