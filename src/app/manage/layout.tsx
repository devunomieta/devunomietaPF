import { logout } from '@/app/login/actions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { ManageShell } from '@/components/manage/ManageShell';

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userEmail = user.email?.toLowerCase() ?? '';

  // Use service-role client to bypass RLS
  const adminDb = createAdminClient();
  const { data: adminUser, error: adminQueryError } = await adminDb
    .from('admins')
    .select('email')
    .eq('email', userEmail)
    .maybeSingle();

  if (adminQueryError) {
    // Surface the real DB error in the login page instead of crashing
    await supabase.auth.signOut();
    redirect(`/login?error=Admin+check+failed:+${encodeURIComponent(adminQueryError.message)}`);
  }

  if (!adminUser) {
    // Check if the user is a CRM assistant trying to enter the main CMS
    const { data: crmUser } = await adminDb
      .from('crm_users')
      .select('id, is_active')
      .eq('email', userEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (crmUser) {
      redirect('/crm');
    }

    await supabase.auth.signOut();
    redirect(`/login?error=Access+denied.+${encodeURIComponent(userEmail)}+is+not+an+authorized+admin.`);
  }

  // Notification counts — default to 0 on error (non-critical)
  const [{ count: unreadInquiries }, { count: subscriberCount }] = await Promise.all([
    supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  const navLinks: { name: string; href: string; iconName: string; count?: number | null }[] = [
    { name: 'Dashboard', href: '/manage', iconName: 'LayoutDashboard' },
    { name: 'Profile', href: '/manage/profile', iconName: 'User' },
    { name: 'Posts', href: '/manage/posts', iconName: 'FileText' },
    { name: 'Projects', href: '/manage/projects', iconName: 'FolderGit2' },
    { name: 'Experience', href: '/manage/experience', iconName: 'History' },
    { name: 'Academic', href: '/manage/academic', iconName: 'GraduationCap' },
    { name: 'Ideas', href: '/manage/ideas', iconName: 'Lightbulb' },
    { name: 'Inquiries', href: '/manage/inquiries', iconName: 'MessageSquare', count: unreadInquiries },
    { name: 'Newsletter', href: '/manage/newsletter', iconName: 'Send', count: subscriberCount },
    { name: 'Settings', href: '/manage/settings', iconName: 'Settings' },
  ];

  return (
    <ManageShell
      navLinks={navLinks}
      userEmail={userEmail}
      logoutAction={logout}
    >
      {children}
    </ManageShell>
  );
}
