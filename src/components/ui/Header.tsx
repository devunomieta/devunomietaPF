import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { HeaderClient } from './HeaderClient'

export async function Header() {
  const supabase = await createClient()
  const adminDb = createAdminClient()

  const [{ data: profile }, { data: settingsRows }] = await Promise.all([
    supabase.from('profile').select('name, handle, avatar_url').limit(1).single(),
    adminDb.from('site_settings').select('key, value'),
  ])

  const settings: Record<string, string> = {}
  for (const row of settingsRows || []) {
    settings[row.key] = row.value ?? ''
  }

  return (
    <HeaderClient
      logoUrl={settings['logo_url'] || ''}
      faviconUrl={settings['favicon_url'] || ''}
      siteName={profile?.handle || settings['site_name'] || 'DevUnomieta'}
    />
  )
}
