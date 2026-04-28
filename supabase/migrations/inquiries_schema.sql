-- Table: inquiries
create table public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on Row Level Security (RLS)
alter table public.inquiries enable row level security;

-- Public can insert (submit contact form)
create policy "Public can insert inquiries" on public.inquiries for insert with check (true);

-- Only admin can read/update/delete inquiries
create policy "Admin can manage inquiries" on public.inquiries for select using (auth.role() = 'authenticated');
create policy "Admin can update inquiries" on public.inquiries for update using (auth.role() = 'authenticated');
create policy "Admin can delete inquiries" on public.inquiries for delete using (auth.role() = 'authenticated');
