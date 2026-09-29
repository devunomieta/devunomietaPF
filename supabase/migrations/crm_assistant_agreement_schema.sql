-- Migration: CRM Personal Assistant Agreement & NDA with Consent Gating & Profit Attribution
-- Timestamp: 2026-09-29

-- 1. Table: crm_team_agreements
CREATE TABLE IF NOT EXISTS public.crm_team_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document Versioning & Content Hashing
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  title TEXT NOT NULL DEFAULT 'Personal Assistant Agreement & Perpetual Non-Disclosure Agreement',
  terms_hash TEXT NOT NULL, -- SHA-256 hash of the canonical contract terms
  terms_text TEXT NOT NULL, -- Exact text agreed upon
  
  -- Consent & Legal Identity Verification
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE, -- Protected: visible only to Super Admins & in the signed PDF
  
  -- Digital Signature & Audit Telemetry
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  device_summary TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'signed' | 'revoked'
  
  -- Co-signer metadata
  principal_name TEXT NOT NULL DEFAULT 'Joseph Unomieta',
  principal_title TEXT NOT NULL DEFAULT 'Principal & Founder',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for instant lookup during layout/auth session checks
CREATE INDEX IF NOT EXISTS idx_crm_team_agreements_user ON public.crm_team_agreements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_team_agreements_auth ON public.crm_team_agreements(auth_user_id, status);

-- 2. Add agreement status tracking columns to crm_users
ALTER TABLE public.crm_users 
  ADD COLUMN IF NOT EXISTS agreement_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;

-- 3. Add co-handling and 15% net profit attribution columns
-- On clients table
ALTER TABLE public.crm_clients
  ADD COLUMN IF NOT EXISTS co_handled_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;

-- On invoices table
ALTER TABLE public.crm_invoices
  ADD COLUMN IF NOT EXISTS co_handled_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direct_service_cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS declared_profit NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assistant_profit_share NUMERIC(12,2) DEFAULT NULL;
