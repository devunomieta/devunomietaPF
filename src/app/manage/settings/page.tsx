import { createClient } from '@/utils/supabase/server'
import SettingsForm from './SettingsForm'

export default async function ManageSettings() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('site_settings')
    .select('key, value')

  // Convert rows to a key→value map
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
