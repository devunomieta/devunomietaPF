import { createAdminClient } from '@/utils/supabase/admin'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function ManageSettings() {
  // Use admin client so we always get fresh data regardless of RLS or cache
  const adminDb = createAdminClient()

  const { data: rows } = await adminDb
    .from('site_settings')
    .select('key, value')

  console.log('DEBUG: Site Settings Rows:', rows)

  const settings: Record<string, string> = {}
  for (const row of rows || []) {
    settings[row.key] = row.value ?? ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted text-sm">Manage your site configuration, assets, and account security.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
