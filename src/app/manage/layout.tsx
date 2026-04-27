import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { LayoutDashboard, FileText, FolderGit2, History, GraduationCap, User, MessageSquare, LogOut, Send } from 'lucide-react';

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userEmail = user.email?.toLowerCase() ?? '';

  // Use the service-role client to bypass RLS and read the admins table directly
  const adminDb = createAdminClient();
  const { data: adminUser } = await adminDb
    .from('admins')
    .select('email')
    .eq('email', userEmail)
    .maybeSingle();

  if (!adminUser) {
    await supabase.auth.signOut();
    redirect(`/login?error=Access denied. ${userEmail} is not an authorized admin.`);
  }

  // Fetch notification counts (use normal client — RLS protects these correctly)
  const { count: unreadInquiries } = await supabase
    .from('inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  const { count: subscriberCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true });

  const navLinks = [
    { name: 'Dashboard', href: '/manage', icon: LayoutDashboard },
    { name: 'Profile', href: '/manage/profile', icon: User },
    { name: 'Posts', href: '/manage/posts', icon: FileText },
    { name: 'Projects', href: '/manage/projects', icon: FolderGit2 },
    { name: 'Experience', href: '/manage/experience', icon: History },
    { name: 'Academic', href: '/manage/academic', icon: GraduationCap },
    { 
      name: 'Inquiries', 
      href: '/manage/inquiries', 
      icon: MessageSquare, 
      count: unreadInquiries 
    },
    { 
      name: 'Newsletter', 
      href: '/manage/newsletter', 
      icon: Send, 
      count: subscriberCount 
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[70vh] gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-header/50 border border-border rounded-xl p-4 sticky top-24">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 px-3">Admin Panel</h2>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="flex items-center justify-between px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-accent-blue/10 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <link.icon size={16} />
                  {link.name}
                </div>
                {link.count !== undefined && link.count !== null && link.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-accent-blue text-white text-[10px] font-bold">
                    {link.count}
                  </span>
                )}
              </Link>
            ))}
            
            <div className="my-2 border-t border-border"></div>
            
            <form action={logout}>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left">
                <LogOut size={16} />
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 bg-background border border-border rounded-xl p-6">
        {children}
      </div>
    </div>
  );
}
