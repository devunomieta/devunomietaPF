'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function submitInquiry(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string
  const purpose = formData.get('purpose') as string
  const budget = formData.get('budget') as string
  const timeline = formData.get('timeline') as string

  if (!name || !email || !message) {
    return redirect('/contact?error=All fields are required')
  }

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
    await supabase.from('subscribers').upsert([
      { email, name, status: 'active' }
    ], { onConflict: 'email' })
  }

  if (error) {
    console.error('Inquiry submission error:', error)
    return redirect(`/contact?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/contact?success=true')
}
