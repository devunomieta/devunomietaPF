import { createClient } from '@/utils/supabase/server'
import InquiryList from './InquiryList'

export default async function ManageInquiries({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  
  const query = typeof searchParams.query === 'string' ? searchParams.query : ''
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
  const limit = 5
  const start = (page - 1) * limit

  // Prepare the joined query
  const dbQuery = supabase
    .from('inquiries')
    .select('*, inquiry_replies(*)')
    .order('created_at', { ascending: false })

  if (query) {
    dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
  }

  // Fetch inquiries
  let { data: allInquiries, error } = await dbQuery

  // Fallback: If the joined query fails (e.g. inquiry_replies table missing), try fetching just inquiries
  if (error || !allInquiries) {
    const fallbackQuery = supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (query) {
      fallbackQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    }
    
    const fallback = await fallbackQuery
    allInquiries = fallback.data || []
  }

  // Group by email
  const conversationsMap: Record<string, any> = {}
  
  allInquiries?.forEach(inquiry => {
    if (!conversationsMap[inquiry.email]) {
      conversationsMap[inquiry.email] = {
        email: inquiry.email,
        name: inquiry.name,
        latest_at: inquiry.created_at,
        is_read: inquiry.is_read, 
        inquiries: []
      }
    }
    
    conversationsMap[inquiry.email].inquiries.push(inquiry)
    
    if (!inquiry.is_read) {
      conversationsMap[inquiry.email].is_read = false
    }
  })

  // Convert to array and sort by latest activity
  const sortedConversations = Object.values(conversationsMap).sort((a, b) => {
    return new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
  })

  const totalPages = Math.ceil(sortedConversations.length / limit)
  const paginatedConversations = sortedConversations.slice(start, start + limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
        <p className="text-muted text-sm">Grouped by email address.</p>
      </div>
      
      <InquiryList 
        initialConversations={paginatedConversations} 
        totalPages={totalPages} 
        currentPage={page} 
        initialQuery={query}
      />
    </div>
  )
}
