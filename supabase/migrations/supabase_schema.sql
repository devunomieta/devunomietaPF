-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: profile (Single row table for global data)
create table public.profile (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  handle text not null,
  avatar_url text,
  bio text,
  about_me text,
  titles text[],
  followers_count integer default 0,
  following_count integer default 0,
  location text,
  email text,
  website text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: posts (Blog)
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  language text,
  language_color text,
  stars integer default 0,
  forks integer default 0,
  visibility text default 'Public',
  link text,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: experience
create table public.experience (
  id uuid primary key default uuid_generate_v4(),
  role text not null,
  company text not null,
  date_range text not null,
  description text, -- Markdown string
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: academic
create table public.academic (
  id uuid primary key default uuid_generate_v4(),
  category text not null, -- 'profile', 'coursework', 'research'
  title text not null,
  subtitle text,
  description text,
  icon_name text, -- e.g. 'GraduationCap', 'Zap'
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on Row Level Security (RLS) for all tables
alter table public.profile enable row level security;
alter table public.posts enable row level security;
alter table public.projects enable row level security;
alter table public.experience enable row level security;
alter table public.academic enable row level security;

-- Create Policies for Public Read Access
create policy "Public can read profile" on public.profile for select using (true);
create policy "Public can read published posts" on public.posts for select using (is_published = true);
create policy "Public can read projects" on public.projects for select using (true);
create policy "Public can read experience" on public.experience for select using (true);
create policy "Public can read academic" on public.academic for select using (true);

-- Create Policies for Admin Full Access (assuming authenticated user is the admin)
create policy "Admin can insert profile" on public.profile for insert with check (auth.role() = 'authenticated');
create policy "Admin can update profile" on public.profile for update using (auth.role() = 'authenticated');
create policy "Admin can delete profile" on public.profile for delete using (auth.role() = 'authenticated');

create policy "Admin can manage posts" on public.posts for all using (auth.role() = 'authenticated');
create policy "Admin can manage projects" on public.projects for all using (auth.role() = 'authenticated');
create policy "Admin can manage experience" on public.experience for all using (auth.role() = 'authenticated');
create policy "Admin can manage academic" on public.academic for all using (auth.role() = 'authenticated');

-- Insert initial dummy profile data
insert into public.profile (name, handle, bio, about_me, titles, followers_count, following_count, location, email, website)
values (
  'Joseph Unomieta', 
  '@DevUnomieta', 
  'Building web products that work and helping them grow. Strategist, architect, and hands-on builder.',
  'I am a Senior Software Engineer, CTO, and Product Growth Manager. I specialize in architecting scalable web applications, optimizing engineering workflows, and driving product success.\n\n- 🔭 I’m currently working on high-performance web products.\n- 🌱 I’m deeply interested in **Web3 (Solana/EVM)** and **Sustainable Energy infrastructure**.\n- 💬 Ask me about React, Next.js, System Architecture, and Team Leadership.\n- ⚡ Fun fact: I boost team productivity by 60% using tailored CI/CD pipelines.',
  ARRAY['Senior Software Engineer & Architect', 'CTO', 'Product Growth Manager'],
  1200, 
  42, 
  'Global / Remote', 
  'hello@devunomieta.xyz', 
  'https://devunomieta.xyz'
);
