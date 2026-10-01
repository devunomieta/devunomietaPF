-- CRM Notifications System Schema
-- Migration: crm_notifications_schema.sql

-- 1. Create Notification Category Enum
DO $$ BEGIN
  CREATE TYPE public.crm_notification_category AS ENUM (
    'lead',
    'client',
    'mailbox',
    'whatsapp',
    'campaign',
    'monitoring',
    'invoice',
    'finance',
    'system',
    'user'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Notification Severity Enum
DO $$ BEGIN
  CREATE TYPE public.crm_notification_severity AS ENUM (
    'info',
    'success',
    'warning',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create Main Notifications Table
CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient targeting & RBAC scoping
  -- user_id is NULL for broadcasts/shared alerts subject to required_page_permission
  user_id uuid REFERENCES public.crm_users(id) ON DELETE CASCADE,
  target_role text DEFAULT 'all', -- 'all', 'superadmin', 'assistant', etc.
  required_page_permission text, -- e.g. 'leads', 'invoices', 'monitoring', 'mailbox', 'clients'
  
  -- Notification Content
  title text NOT NULL,
  message text NOT NULL,
  category public.crm_notification_category NOT NULL DEFAULT 'system',
  severity public.crm_notification_severity NOT NULL DEFAULT 'info',
  
  -- Navigation & Entity Relations
  link_url text, -- e.g. '/crm/leads?id=abc' or '/crm/mailbox?threadId=xyz'
  entity_type text, -- 'lead', 'client', 'thread', 'job', 'invoice'
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Smart Grouping & Deduplication (Recommendation 3)
  group_key text, -- e.g. 'import_batch_123', 'campaign_runs_456'
  group_count int DEFAULT 1,
  
  -- Status tracking
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  read_by text,
  is_archived boolean NOT NULL DEFAULT false,
  
  -- Snooze / Reminder Workflow (Recommendation 2)
  snoozed_until timestamp with time zone,
  reminder_count int DEFAULT 0,
  
  -- Trigger Actor context
  actor_email text,
  actor_name text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning fast sorting, filtering, and live queries
CREATE INDEX IF NOT EXISTS idx_crm_notif_created ON public.crm_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notif_user_read ON public.crm_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notif_category ON public.crm_notifications (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notif_severity ON public.crm_notifications (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notif_group_key ON public.crm_notifications (group_key);
CREATE INDEX IF NOT EXISTS idx_crm_notif_snoozed ON public.crm_notifications (snoozed_until) WHERE snoozed_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_notif_unread ON public.crm_notifications (is_read) WHERE is_read = false;

-- 4. User Notification Preferences Table (Recommendation 4)
CREATE TABLE IF NOT EXISTS public.crm_notification_preferences (
  user_email text PRIMARY KEY,
  sound_enabled boolean NOT NULL DEFAULT true,
  browser_push_enabled boolean NOT NULL DEFAULT false,
  push_subscription jsonb,
  email_digest_enabled boolean NOT NULL DEFAULT false,
  email_digest_frequency text NOT NULL DEFAULT 'daily',
  category_toggles jsonb NOT NULL DEFAULT '{
    "lead": true,
    "client": true,
    "mailbox": true,
    "whatsapp": true,
    "campaign": true,
    "monitoring": true,
    "invoice": true,
    "finance": true,
    "system": true,
    "user": true
  }'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Service role & Admin bypass
CREATE POLICY "Allow service_role full access to crm_notifications"
  ON public.crm_notifications FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role full access to crm_notification_preferences"
  ON public.crm_notification_preferences FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated CRM users can select notifications
CREATE POLICY "Allow authenticated read crm_notifications"
  ON public.crm_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update crm_notifications"
  ON public.crm_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read write crm_notification_preferences"
  ON public.crm_notification_preferences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant privileges
GRANT ALL ON TABLE public.crm_notifications TO authenticated, service_role;
GRANT ALL ON TABLE public.crm_notification_preferences TO authenticated, service_role;

-- Enable Realtime replication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notifications;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;
