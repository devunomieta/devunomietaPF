import { createClient } from '@/utils/supabase/server'
import NewsletterManager from './NewsletterManager'

export default async function ManageNewsletter() {
  const supabase = await createClient()
  
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
        <p className="text-muted text-sm">Manage your audience and send email campaigns.</p>
      </div>
      
      <NewsletterManager 
        subscribers={subscribers || []} 
        campaigns={campaigns || []} 
      />
    </div>
  )
}
