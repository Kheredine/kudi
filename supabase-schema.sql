-- ============================================================
-- KUDI APP - Supabase Database Schema (Supabase Auth + RLS)
-- Run this in Supabase SQL Editor to set up tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT 'User',
  avatar TEXT,
  base_currency TEXT DEFAULT 'USD',
  payday_day INTEGER DEFAULT 25,
  payday1 INTEGER DEFAULT 10,
  payday2 INTEGER DEFAULT 25,
  payday_date_overrides JSONB DEFAULT '{}',
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark',
  active_account_id BIGINT,
  onboarded BOOLEAN DEFAULT false,
  last_recurring_gen DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'Other',
  label TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  account_id BIGINT,
  member_id BIGINT,
  recurring_ref BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '17:00',
  break_hours NUMERIC(4,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2) DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RECURRING ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'saving')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day INTEGER,
  day_of_week TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- SAVINGS GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC(12,2) DEFAULT 0,
  saved NUMERIC(12,2) DEFAULT 0,
  icon TEXT DEFAULT '🎯',
  deadline DATE,
  created_at DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- IOUS (Debts / Loans)
-- ============================================================
CREATE TABLE IF NOT EXISTS ious (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date_lent DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ACCOUNTS (Multi-account support)
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Account',
  type TEXT DEFAULT 'checking',
  icon TEXT DEFAULT '💳',
  color TEXT DEFAULT '#22C55E',
  currency TEXT DEFAULT 'USD',
  initial_balance NUMERIC(12,2) DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- MEMBERS (Shared finances)
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Unknown',
  avatar TEXT DEFAULT '👤',
  color TEXT DEFAULT '#6366F1',
  role TEXT DEFAULT 'member',
  joined_at DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- INDEXES for fast queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ious_user ON ious(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - SECURE
-- Users can ONLY access their own data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ious ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow full access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow full access to shifts" ON shifts;
DROP POLICY IF EXISTS "Allow full access to recurring" ON recurring;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can insert own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can update own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can view own recurring" ON recurring;
DROP POLICY IF EXISTS "Users can insert own recurring" ON recurring;
DROP POLICY IF EXISTS "Users can update own recurring" ON recurring;
DROP POLICY IF EXISTS "Users can delete own recurring" ON recurring;

-- ============================================================
-- SECURE POLICIES: user_id = auth.uid()
-- ============================================================

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- Shifts
CREATE POLICY "Users can view own shifts" ON shifts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own shifts" ON shifts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own shifts" ON shifts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own shifts" ON shifts
  FOR DELETE USING (user_id = auth.uid());

-- Recurring
CREATE POLICY "Users can view own recurring" ON recurring
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own recurring" ON recurring
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own recurring" ON recurring
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own recurring" ON recurring
  FOR DELETE USING (user_id = auth.uid());

-- Budgets
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (user_id = auth.uid());

-- Savings Goals
CREATE POLICY "Users can view own savings_goals" ON savings_goals
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own savings_goals" ON savings_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own savings_goals" ON savings_goals
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own savings_goals" ON savings_goals
  FOR DELETE USING (user_id = auth.uid());

-- IOUs
CREATE POLICY "Users can view own ious" ON ious
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ious" ON ious
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ious" ON ious
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own ious" ON ious
  FOR DELETE USING (user_id = auth.uid());

-- Accounts
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (user_id = auth.uid());

-- Members
CREATE POLICY "Users can view own members" ON members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own members" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own members" ON members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own members" ON members
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REALTIME PUBLICATION (for cross-device sync)
-- ============================================================
-- Add tables to Supabase realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE savings_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE ious;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;