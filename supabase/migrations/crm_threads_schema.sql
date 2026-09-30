-- CRM Mailbox & Inbound Email Threads
-- Supports Gmail-like threaded conversations with inbound webhook parsing & outbound replies

create table if not exists public.crm_threads (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  normalized_subject text not null,
  recipient_email text not null, -- external participant (e.g. client/lead)
  recipient_name text,
  last_message_preview text,
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  unread_count integer not null default 0,
  is_starred boolean not null default false,
  is_archived boolean not null default false,
  folder text not null default 'inbox', -- 'inbox', 'sent', 'archive', 'trash'
  client_id uuid references public.crm_clients(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.crm_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.crm_threads(id) on delete cascade,
  direction text not null default 'inbound', -- 'inbound' (from client/lead) or 'outbound' (sent by admin/team)
  from_email text not null,
  from_name text,
  reply_to text,
  to_recipients jsonb not null default '[]'::jsonb, -- [{ email, name }]
  cc_recipients jsonb not null default '[]'::jsonb,
  subject text not null,
  body_text text,
  body_html text,
  message_id text, -- RFC message-id
  in_reply_to text,
  references_header text,
  attachments jsonb not null default '[]'::jsonb, -- [{ name, url, size, contentType }]
  security_status text not null default 'verified', -- 'verified', 'unverified', 'suspicious'
  raw_payload jsonb,
  sent_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_threads_folder on public.crm_threads(folder, last_message_at desc);
create index if not exists idx_crm_threads_recipient on public.crm_threads(recipient_email);
create index if not exists idx_crm_threads_unread on public.crm_threads(unread_count);
create index if not exists idx_crm_messages_thread on public.crm_messages(thread_id, sent_at asc);
create index if not exists idx_crm_messages_msg_id on public.crm_messages(message_id);

alter table public.crm_threads enable row level security;
alter table public.crm_messages enable row level security;

grant select, insert, update, delete on public.crm_threads to authenticated;
grant select, insert, update, delete on public.crm_messages to authenticated;
grant select, insert, update, delete on public.crm_threads to service_role;
grant select, insert, update, delete on public.crm_messages to service_role;

drop policy if exists "Admins can manage crm_threads" on public.crm_threads;
create policy "Admins can manage crm_threads" on public.crm_threads for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_messages" on public.crm_messages;
create policy "Admins can manage crm_messages" on public.crm_messages for all using (auth.role() = 'authenticated');
