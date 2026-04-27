import { createClient } from '@/utils/supabase/server'
import InquiryList from './InquiryList'

export default async function ManageInquiries() {
  const supabase = await createClient()
  
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inquiries</h1>
        <p className="text-muted text-sm">Messages from your portfolio visitors.</p>
      </div>
      
      <InquiryList initialInquiries={inquiries || []} />
    </div>
  )
}
