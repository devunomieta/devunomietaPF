'use server'

import { createClient } from '@/utils/supabase/server'
import { sendEmail } from '@/lib/brevo'
import { welcomeEmailTemplate } from '@/lib/email-templates'

export async function subscribeAction(email: string, name?: string) {
  const supabase = await createClient()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || email.length > 254 || !emailRegex.test(email)) {
    return { error: 'Invalid email format.' }
  }

  if (name && name.length > 100) {
    return { error: 'Name is too long.' }
  }

  const cleanEmail = email.toLowerCase()
  const displayName = name || cleanEmail.split('@')[0]
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`

  const { createAdminClient } = await import('@/utils/supabase/admin')
  const adminDb = createAdminClient()

  // Use a more robust upsert/insert logic
  const { error } = await adminDb.from('subscribers').upsert([
    { 
      email: cleanEmail, 
      name: name || displayName,
      display_name: displayName,
      avatar_url: avatarUrl,
      status: 'active' 
    }
  ], { onConflict: 'email' })

  if (error) {
    console.error('Subscription error:', error)
    return { error: 'Failed to subscribe. Please try again.' }
  }

  // Send welcome email asynchronously
  sendEmail({
    to: [{ email: cleanEmail, name: name || displayName }],
    subject: 'Welcome to the Journey! 🚀 | Joseph Unomieta',
    htmlContent: welcomeEmailTemplate(name || displayName)
  }).catch(err => console.error('Failed to send welcome email:', err))

  return { success: true }
}
