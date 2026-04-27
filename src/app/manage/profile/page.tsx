import { createClient } from '@/utils/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ManageProfile() {
  const supabase = await createClient()
  
  // Get the first profile (usually there's only one)
  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Management</h1>
        <p className="text-muted text-sm">Update your public identity and contact information.</p>
      </div>
      
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <ProfileForm initialData={profile} />
      </div>
    </div>
  )
}
