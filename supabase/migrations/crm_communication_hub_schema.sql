-- Migration: Multi-email contact linking, domain fallback, internal notes, and communication templates

-- 1. Contacts: Support multiple secondary emails
ALTER TABLE public.crm_contacts 
  ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}';

-- 2. Clients: Support multiple secondary emails and corporate company domain
ALTER TABLE public.crm_clients 
  ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS company_domain text;

-- 3. Leads: Support multiple secondary emails and corporate company domain
ALTER TABLE public.crm_leads 
  ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS company_domain text;

-- 4. Threads: Link to specific contact if applicable & add channel tag
ALTER TABLE public.crm_threads
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email';

-- 5. Internal Collaboration Notes (private team notes inside client/lead timeline)
CREATE TABLE IF NOT EXISTS public.crm_internal_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.crm_threads(id) ON DELETE SET NULL,
  author_email text NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 6. Communication Templates & Canned Snippets
CREATE TABLE IF NOT EXISTS public.crm_communication_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  shortcut text NOT NULL, -- e.g. "/invoice-reminder"
  channel text NOT NULL DEFAULT 'all', -- 'all', 'email', 'whatsapp'
  subject text,
  body text NOT NULL,
  category text DEFAULT 'General',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_additional_emails ON public.crm_contacts USING gin(additional_emails);
CREATE INDEX IF NOT EXISTS idx_crm_clients_additional_emails ON public.crm_clients USING gin(additional_emails);
CREATE INDEX IF NOT EXISTS idx_crm_leads_additional_emails ON public.crm_leads USING gin(additional_emails);
CREATE INDEX IF NOT EXISTS idx_crm_threads_contact_id ON public.crm_threads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_threads_client_id ON public.crm_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_threads_lead_id ON public.crm_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_internal_notes_client_id ON public.crm_internal_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_internal_notes_lead_id ON public.crm_internal_notes(lead_id);

-- 8. Row Level Security & Permissions
ALTER TABLE public.crm_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communication_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_internal_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_internal_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_communication_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_communication_templates TO service_role;

DROP POLICY IF EXISTS "Authenticated users can manage crm_internal_notes" ON public.crm_internal_notes;
CREATE POLICY "Authenticated users can manage crm_internal_notes" ON public.crm_internal_notes FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage crm_communication_templates" ON public.crm_communication_templates;
CREATE POLICY "Authenticated users can manage crm_communication_templates" ON public.crm_communication_templates FOR ALL USING (auth.role() = 'authenticated');

-- 9. Seed Useful Default Canned Templates if not already existing
INSERT INTO public.crm_communication_templates (title, shortcut, channel, subject, body, category)
SELECT 'Invoice Follow-up', '/invoice-reminder', 'all', 'Quick follow-up regarding invoice {{latest_invoice_number}}', 
'Hi {{contact_name}},

Hope you are having a productive week. 

Just following up on invoice {{latest_invoice_number}} for {{latest_invoice_amount}}, which is pending payment. Please let us know if you need any adjustments or details from our side.

Best regards,
{{sender_name}}', 'Billing'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_communication_templates WHERE shortcut = '/invoice-reminder');

INSERT INTO public.crm_communication_templates (title, shortcut, channel, subject, body, category)
SELECT 'Onboarding Welcome & Questionnaire', '/onboarding', 'email', 'Welcome to the team — Project Kickoff', 
'Hi {{contact_name}},

We are thrilled to begin working with {{company}}!

To ensure a seamless kickoff, please take 5 minutes to review our initial milestone checklist and share any required assets.

Looking forward to bringing this vision to life.

Best regards,
{{sender_name}}', 'Onboarding'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_communication_templates WHERE shortcut = '/onboarding');

INSERT INTO public.crm_communication_templates (title, shortcut, channel, subject, body, category)
SELECT 'WhatsApp Quick Intro', '/whatsapp-intro', 'whatsapp', NULL, 
'Hi {{contact_name}}, this is {{sender_name}} following up on your project inquiry for {{company}}. When would be a good time for a brief 10-minute discovery chat?', 'Sales'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_communication_templates WHERE shortcut = '/whatsapp-intro');
