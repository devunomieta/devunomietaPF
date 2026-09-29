-- Add new business context columns to crm_leads and crm_clients:
-- Location, Website, Pain Points (Identified Problems), Proposed Solution

alter table public.crm_leads 
  add column if not exists location text,
  add column if not exists website text,
  add column if not exists pain_points text,
  add column if not exists proposed_solution text;

alter table public.crm_clients 
  add column if not exists location text,
  add column if not exists website text,
  add column if not exists pain_points text,
  add column if not exists proposed_solution text;
