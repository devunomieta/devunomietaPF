import { createClient } from '@/utils/supabase/server'
import ExperienceManager from './ExperienceManager'

export default async function ManageExperience() {
  const supabase = await createClient()
  
  const { data: experience } = await supabase
    .from('experience')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Experience</h1>
        <p className="text-muted text-sm">Manage your professional work history.</p>
      </div>
      
      <ExperienceManager initialExperience={experience || []} />
    </div>
  )
}
