'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { sanitizeText, isValidEmail, detectSpam } from '@/lib/sanitize'

export async function submitInquiry(formData: FormData) {
  const honeypot = formData.get('website_url_hp') as string
  const rawName = formData.get('name') as string
  const rawEmail = formData.get('email') as string
  const rawMessage = formData.get('message') as string
  const rawPurpose = formData.get('purpose') as string
  const rawBudget = formData.get('budget') as string
  const rawTimeline = formData.get('timeline') as string

  // Honeypot check: silently redirect if bot filled hidden field
  if (honeypot && honeypot.trim().length > 0) {
    console.warn('Spam bot trapped via honeypot field')
    return redirect('/contact?success=true')
  }

  // Sanitization
  const name = sanitizeText(rawName)
  const email = sanitizeText(rawEmail).toLowerCase()
  const message = sanitizeText(rawMessage)
  const purpose = sanitizeText(rawPurpose) || 'inquiry'
  const budget = sanitizeText(rawBudget)
  const timeline = sanitizeText(rawTimeline)

  // Validation
  if (!name || !email || !message) {
    return redirect('/contact?error=Name, email, and message are required')
  }

  if (name.length < 2 || name.length > 100) {
    return redirect('/contact?error=Name must be between 2 and 100 characters')
  }

  if (!isValidEmail(email)) {
    return redirect('/contact?error=Please enter a valid email address')
  }

  if (message.length < 5 || message.length > 5000) {
    return redirect('/contact?error=Message must be between 5 and 5000 characters')
  }

  // Anti-spam detection
  const spamCheck = detectSpam({ name, email, message, honeypot })
  if (spamCheck.isSpam) {
    console.warn('Rejected spam inquiry:', { name, email, reason: spamCheck.reason })
    // Return error or pretend success to not educate spammer bots
    return redirect('/contact?error=' + encodeURIComponent('Your message could not be sent. Please check your message content or contact directly.'))
  }

  const supabase = await createClient()

  const metadata: Record<string, string> = {}
  if (budget) metadata.budget = budget
  if (timeline) metadata.timeline = timeline

  const subscribe = formData.get('subscribe') === 'on'

  const { error } = await supabase.from('inquiries').insert([
    { 
      name, 
      email, 
      message, 
      purpose, 
      metadata 
    }
  ])

  // Optionally subscribe to newsletter
  if (subscribe && !error) {
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin')
      const adminDb = createAdminClient()
      await adminDb.from('subscribers').upsert([
        { email, name, status: 'active' }
      ], { onConflict: 'email' })
    } catch (e) {
      console.error('Subscriber upsert error:', e)
    }
  }

  if (error) {
    console.error('Inquiry submission error:', error)
    return redirect(`/contact?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/contact?success=true')
}
