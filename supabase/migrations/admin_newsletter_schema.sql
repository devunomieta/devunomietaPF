-- Admin Table
create table if not exists public.admins (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Seed initial admins
insert into public.admins (email) 
values ('lionelunomieta@gmail.com'), ('devunomieta@gmail.com')
on conflict (email) do nothing;

-- Newsletter Subscribers
create table if not exists public.subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  status text default 'active', -- 'active', 'unsubscribed'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Newsletter Campaigns
create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text not null,
  content text not null, -- Markdown or HTML
  status text default 'draft', -- 'draft', 'sent'
  sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Admins
alter table public.admins enable row level security;
create policy "Only authenticated admins can see admin list" on public.admins for select using (auth.role() = 'authenticated');

-- RLS for Subscribers
alter table public.subscribers enable row level security;
create policy "Public can subscribe" on public.subscribers for insert with check (true);
create policy "Admins can manage subscribers" on public.subscribers for all using (
  exists (select 1 from public.admins where email = auth.email())
);

-- RLS for Campaigns
alter table public.campaigns enable row level security;
create policy "Admins can manage campaigns" on public.campaigns for all using (
  exists (select 1 from public.admins where email = auth.email())
);
