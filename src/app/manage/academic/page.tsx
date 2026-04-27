import { createClient } from '@/utils/supabase/server'
import AcademicManager from './AcademicManager'

export default async function ManageAcademic() {
  const supabase = await createClient()
  
  const { data: academic } = await supabase
    .from('academic')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Academic Records</h1>
        <p className="text-muted text-sm">Manage your education and academic achievements.</p>
      </div>
      
      <AcademicManager initialAcademic={academic || []} />
    </div>
  )
}
