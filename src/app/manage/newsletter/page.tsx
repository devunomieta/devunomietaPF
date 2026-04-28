import { createAdminClient } from '@/utils/supabase/admin'
import NewsletterManager from './NewsletterManager'

export default async function ManageNewsletter() {
  const supabase = createAdminClient()
  
  const { data: subscribers, error: subError } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: campaigns, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (subError || campError) {
    console.error('Newsletter Fetch Error:', subError || campError)
  }

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
