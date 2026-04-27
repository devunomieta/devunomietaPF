import { createClient } from '@/utils/supabase/server'
import { FileText, FolderGit2, MessageSquare, Send } from 'lucide-react'

export default async function ManageDashboard() {
  const supabase = await createClient()
  
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true })
  const { count: inquiryCount } = await supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('is_read', false)
  const { count: subscriberCount } = await supabase.from('subscribers').select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>
      <p className="text-muted text-sm -mt-4">Welcome back to your command center.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats cards */}
        <div className="bg-header/30 border border-border rounded-xl p-5 flex flex-col gap-2 transition-all hover:border-accent-blue">
          <div className="flex items-center gap-2 text-accent-blue">
            <FileText size={20} />
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Blog Posts</h3>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground mt-2">{postCount || 0}</p>
        </div>
        
        <div className="bg-header/30 border border-border rounded-xl p-5 flex flex-col gap-2 transition-all hover:border-accent-blue">
          <div className="flex items-center gap-2 text-accent-blue">
            <FolderGit2 size={20} />
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Projects</h3>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground mt-2">{projectCount || 0}</p>
        </div>

        <div className="bg-header/30 border border-border rounded-xl p-5 flex flex-col gap-2 transition-all hover:border-accent-blue">
          <div className="flex items-center gap-2 text-accent-green">
            <MessageSquare size={20} />
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Unread Inquiries</h3>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground mt-2">{inquiryCount || 0}</p>
        </div>

        <div className="bg-header/30 border border-border rounded-xl p-5 flex flex-col gap-2 transition-all hover:border-accent-blue">
          <div className="flex items-center gap-2 text-purple-400">
            <Send size={20} />
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Subscribers</h3>
          </div>
          <p className="text-3xl font-bold font-mono text-foreground mt-2">{subscriberCount || 0}</p>
        </div>
      </div>
      
      <div className="mt-8 border-t border-border pt-6 text-sm text-muted">
        Use the sidebar to navigate to specific sections to add, update, or delete your portfolio and blog contents.
      </div>
    </div>
  )
}
