-- ============================================================
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Add avatar_url to profile table (safe - adds only if missing)
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add site_settings table for the Settings page
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'Joseph Unomieta'),
  ('site_tagline', 'Senior Software Engineer & Architect'),
  ('site_description', 'Personal website of Joseph Unomieta (@DevUnomieta). Building web products that work and helping them grow.'),
  ('og_image_url', ''),
  ('logo_url', ''),
  ('favicon_url', '')
ON CONFLICT (key) DO NOTHING;

-- RLS for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.email()));

-- Grant service_role access to site_settings
GRANT ALL ON public.site_settings TO service_role;

-- 3. Ensure service_role can access all admin tables
GRANT ALL ON public.admins TO service_role;
GRANT ALL ON public.subscribers TO service_role;
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.profile TO service_role;

-- 4. Create avatars storage bucket (run separately if bucket already exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'assets') AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'assets'));

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('avatars', 'assets') AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
  FOR DELETE USING (bucket_id IN ('avatars', 'assets') AND auth.role() = 'authenticated');


-- ============================================================
-- 5. SEED CONTENT FROM CV
-- ============================================================

-- ---- PROJECTS ----
INSERT INTO public.projects (name, description, language, language_color, stars, forks, visibility, link, sort_order)
VALUES
  ('Trazen', 'Web3 SocialFi product — Co-Founded and led technical strategy, dev team, and R&D. Managed product delivery within timeline and budget.', 'Solidity / TypeScript', '#3178c6', 0, 0, 'public', 'https://linktr.ee/devunomieta', 1),
  ('HachStacks', 'EdTech startup at AKSU — Co-founded. Manage software development, community engagement, and stakeholder relations to build ed-tech solutions.', 'JavaScript', '#f1e05a', 0, 0, 'public', 'https://linktr.ee/devunomieta', 2),
  ('Doxa ProTech', 'Logistics startup — Supervised R&D in the transportation sector. Managed dev team resources, budget, app feature prioritisation and marketing.', 'TypeScript', '#3178c6', 0, 0, 'public', 'https://linktr.ee/devunomieta', 3),
  ('Learn to Earn', 'Virtual training hub for tertiary students in Nigeria — Planned and executed training program, achieving 130% of success criteria.', 'JavaScript', '#f1e05a', 0, 0, 'public', 'https://linktr.ee/devunomieta', 4),
  ('TechGene HQ', 'Startup — Led dev team, implemented UIs for company projects and products, and reported progress to PO.', 'React', '#61dafb', 0, 0, 'public', 'https://linktr.ee/devunomieta', 5),
  ('AKSU NACOS Dept. Projects', 'Initialised, planned and executed software projects for the Department of Computer Science as Head of the Software Team.', 'Python', '#3572A5', 0, 0, 'public', 'https://linktr.ee/devunomieta', 6)
ON CONFLICT DO NOTHING;

-- ---- EXPERIENCE ----
INSERT INTO public.experience (role, company, date_range, description, sort_order)
VALUES
  ('IT Specialist, Office of the Commissioner', 'State Ministry of Information & Communications (NYSC) — Jos, Plateau', 'Feb. 2025 – Dec. 2025',
   'Took up multi-IT leadership roles; introduced digital tools replacing analogue systems; conducted IT training for civil servants, NYSC staff and corp members; built and led multiple innovative solutions for NYSC Plateau State.', 1),
  ('Co-Founder & Chief Technical Officer', 'Trazen (Web3 SocialFi) — Canada', 'March 2025 – Nov. 2025',
   'Led startup strategy & operations, boosting team productivity by 45%. Managed all technical functions, the development team & led R&D sessions. Managed product delivery within timeline and budget. Achieved 80% inter-functional collaboration rate.', 2),
  ('Project Manager, Co-Team Lead', 'Learn to Earn (Virtual Hub) — Uyo, Akwa Ibom', 'June 2024 – August 2025',
   'Planned and executed a training program targeting tertiary students in Nigeria. Completed all deliverables and attained 130% success criteria.', 3),
  ('Chief Technical Officer → General Manager', 'Netisens Tech Ltd (Startup) — Uyo, Akwa Ibom', 'April 2023 – July 2024',
   'Led startup strategy & operations, boosting team productivity by 60%. Managed technical functions, delivering 4 client projects on time & within budget. Built strong client relationships, achieving 40% improved satisfaction rate. Spearheaded research for innovative tech solutions.', 4),
  ('Project/Product Management Tutor', 'Netisens ICT Academy — Hybrid', 'Oct 2023 – July 2024',
   'Tutored students in Project/Product Management. Curated learning content aligned to PMI standards. Prepped students with real-life case studies and practical sessions.', 5),
  ('Project Manager', 'Doxa ProTech (Logistics Startup) — Abuja/South Africa', 'Nov 2021 – Current',
   'Supervised outfield experts for R&D in transportation. Collaborated with dev, marketing and product teams to prioritise app features. Managed dev resources, budget, and stakeholder communications.', 6),
  ('Project Manager & Frontend Web Developer', 'TechGene HQ (Startup) — Lagos', 'April 2022 – April 2023',
   'Managed a team of developers. Collaborated to implement and execute projects. Implemented UIs for company products. Reported project progress to supervisors and PO.', 7),
  ('Co-Founder & Operations Manager', 'HachStacks (EdTech) — Akwa Ibom State University', 'Oct 2021 – Current',
   'Planned, managed and implemented all software development. Oversaw community engagement efforts. Worked with all stakeholders and masterminded research and surveys to build ed-tech solutions.', 8),
  ('Team Lead', 'Zuri FMA Start.ng (Learning Platform) — Remote, Nigeria', 'Mar 2020 – Jun 2020',
   'Led a team of software interns to build a solution for poultry farmers.', 9)
ON CONFLICT DO NOTHING;

-- ---- ACADEMIC ----
INSERT INTO public.academic (category, title, subtitle, description, icon_name, sort_order)
VALUES
  ('degree', 'Masters in Information Technology (In View)', 'MIVA Open University, Abuja — Expected Sept. 2025',
   'Major in Software Engineering. Coursework: Artificial Intelligence, Information Management Systems, Software Engineering, Networking & Architecture, Ethics, Database Management Systems, DevOps.', 'GraduationCap', 1),
  ('degree', 'Bachelor of Science in Computer Science', 'Akwa Ibom State University — May 2022',
   'Major in Computer Science. Coursework: Data Analysis, Software Engineering, Operating Systems, Algorithms, Artificial Intelligence, Project Management.', 'GraduationCap', 2),
  ('certification', 'Professional Certification in Project Management', 'Google Coursera Scholarship Program — Dec 2021–May 2022',
   'Coursework: Project Initialisation, Planning & Execution; Methodologies; Stakeholder Management; Organisational Culture; Change Management; Risk Management; Business Writing.', 'Award', 3),
  ('certification', 'CAPM Certification', 'Skill Up by Simplilearn — Nov 2022',
   'Coursework: Project Manager Knowledge Areas & Processes, Project Integration Management, Stakeholder Management, Organisational Theories & Leadership Styles.', 'Award', 4),
  ('certification', 'Professional Certification in Project Management (MTRI)', 'MTRI — Nigeria',
   'Professional Certification in Project Management issued by MTRI.', 'Award', 5),
  ('certification', 'Frontend Web Development', 'Zuri & Side-Hustle — Nigeria',
   'Certification in Frontend Web Development covering modern JavaScript and React.', 'Code', 6),
  ('certification', 'HSE 1, 2 & 3, CRM, HRM', 'Various — Nigeria',
   'Health, Safety & Environment (HSE levels 1–3), Customer Relationship Management (CRM), Human Resource Management (HRM) certifications.', 'Shield', 7)
ON CONFLICT DO NOTHING;
