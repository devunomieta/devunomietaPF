import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ManageProfile() {
  const supabase = await createClient()
  const adminDb = createAdminClient()
  
  // Fetch profile and site_settings for links
  const [{ data: profile }, { data: settingsRows }] = await Promise.all([
    supabase.from('profile').select('*').limit(1).single(),
    adminDb.from('site_settings').select('key, value')
  ])

  const settings: Record<string, string> = {}
  for (const row of settingsRows || []) {
    settings[row.key] = row.value ?? ''
  }

  const profileWithLinks = {
    ...profile,
    twitter_url: settings['twitter_url'] || 'https://x.com/DevUnomieta',
    linkedin_url: settings['linkedin_url'] || 'https://linkedin.com/in/joseph-unomieta',
    resume_url: settings['resume_url'] || '/resume.pdf',
    hire_me_url: settings['hire_me_url'] || '/contact?purpose=hiring',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Management</h1>
        <p className="text-muted text-sm">Update your public identity and contact information.</p>
      </div>
      
      <div className="bg-header/20 border border-border rounded-xl p-6">
        <ProfileForm initialData={profileWithLinks} />
      </div>
    </div>
  )
}
