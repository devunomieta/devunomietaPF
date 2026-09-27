import { createClient } from '@/utils/supabase/server'
import InquiryList from './InquiryList'

export default async function ManageInquiries({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  const resolvedSearchParams = await Promise.resolve(searchParams)
  
  const query = typeof resolvedSearchParams.query === 'string' ? resolvedSearchParams.query : ''
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1
  const limit = 10
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
  const { data: rawInquiries, error } = await dbQuery
  let allInquiries = rawInquiries

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
  interface InquiryItem {
    id: string
    name: string
    email: string
    message: string
    purpose?: string
    metadata?: Record<string, string>
    is_read: boolean
    replied_at?: string
    created_at: string
    inquiry_replies?: Array<{
      id: string
      message: string
      created_at: string
    }>
  }

  interface ConversationGroup {
    email: string
    name: string
    latest_at: string
    is_read: boolean
    inquiries: InquiryItem[]
  }

  const conversationsMap: Record<string, ConversationGroup> = {}
  
  allInquiries?.forEach((inquiry: InquiryItem) => {
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
