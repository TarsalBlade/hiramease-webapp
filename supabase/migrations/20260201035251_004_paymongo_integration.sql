/*
  # PayMongo Integration Schema

  1. New Tables
    - `paymongo_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tenant_id` (uuid, foreign key to tenants) - nullable for borrowers
      - `paymongo_payment_id` (text, PayMongo payment intent ID)
      - `amount` (integer, amount in centavos)
      - `currency` (text, default 'PHP')
      - `status` (text, payment status)
      - `payment_method_type` (text, card/gcash/grabpay/paymaya/instapay/pesonet)
      - `description` (text, payment description)
      - `metadata` (jsonb, additional data)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `paymongo_payment_methods`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `paymongo_payment_method_id` (text)
      - `type` (text, card/gcash/grabpay/paymaya)
      - `details` (jsonb, masked card details, wallet info, etc.)
      - `is_default` (boolean)
      - `created_at` (timestamptz)

  2. Modifications
    - Add paymongo_payment_id to existing subscriptions table

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own payment data
    - Lending admins can view tenant payment data

  4. Important Notes
    - Uses centavos for amount (100 centavos = 1 PHP)
    - Supports payment methods: Cards, GCash, GrabPay, PayMaya, InstaPay, PESONet
    - Webhook handling through edge function
*/

-- Create paymongo_payments table
CREATE TABLE IF NOT EXISTS paymongo_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  paymongo_payment_id text UNIQUE,
  amount integer NOT NULL,
  currency text DEFAULT 'PHP' NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create paymongo_payment_methods table
CREATE TABLE IF NOT EXISTS paymongo_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paymongo_payment_method_id text UNIQUE NOT NULL,
  type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add paymongo_payment_id to subscriptions table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'paymongo_payment_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN paymongo_payment_id text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paymongo_payments_user_id ON paymongo_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_paymongo_payments_tenant_id ON paymongo_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_paymongo_payments_status ON paymongo_payments(status);
CREATE INDEX IF NOT EXISTS idx_paymongo_payment_methods_user_id ON paymongo_payment_methods(user_id);

-- Enable RLS
ALTER TABLE paymongo_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE paymongo_payment_methods ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON paymongo_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON paymongo_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lending admins can view tenant payments"
  ON paymongo_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'lending_admin'
      AND user_profiles.tenant_id = paymongo_payments.tenant_id
    )
  );

-- Payment methods policies
CREATE POLICY "Users can view own payment methods"
  ON paymongo_payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment methods"
  ON paymongo_payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON paymongo_payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_paymongo_payments_updated_at ON paymongo_payments;
CREATE TRIGGER update_paymongo_payments_updated_at
  BEFORE UPDATE ON paymongo_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();