import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/brevo'
import { weeklyEmailTemplate } from '@/lib/email-templates'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 1. Basic security check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 2. Fetch all active subscribers
  const { data: subscribers, error: subError } = await supabase
    .from('subscribers')
    .select('email, name')
    .eq('status', 'active')

  if (subError || !subscribers) {
    console.error('Failed to fetch subscribers:', subError)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  // 3. Fetch the latest published post
  const { data: latestPost } = await supabase
    .from('posts')
    .select('title, content, slug')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const postData = latestPost ? {
    title: latestPost.title,
    snippet: latestPost.content.substring(0, 150).replace(/[#*_`\[\]()\-!]/g, "").trim() + '...',
    slug: latestPost.slug
  } : undefined

  // 4. Send emails (using batch or individual sends)
  // For Brevo, we can send to multiple recipients in one call if it's the same content
  // But we want to personalize the name, so we'll send individually or use templates.
  // To keep it simple for now, we'll send individually.
  
  const results = await Promise.allSettled(
    subscribers.map(sub => 
      sendEmail({
        to: [{ email: sub.email, name: sub.name }],
        subject: 'Weekly Tech Insights: Building for Scale 🛠️',
        htmlContent: weeklyEmailTemplate(sub.name || sub.email.split('@')[0], postData)
      })
    )
  )

  const successCount = results.filter(r => r.status === 'fulfilled').length
  const failureCount = results.length - successCount

  return NextResponse.json({
    message: 'Weekly newsletter process completed',
    total: subscribers.length,
    success: successCount,
    failures: failureCount
  })
}
