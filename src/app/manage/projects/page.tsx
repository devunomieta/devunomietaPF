import { createClient } from '@/utils/supabase/server'
import ProjectManager from './ProjectManager'

export default async function ManageProjects() {
  const supabase = await createClient()
  
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="text-muted text-sm">Manage your showcase projects and repositories.</p>
      </div>
      
      <ProjectManager initialProjects={projects || []} />
    </div>
  )
}
