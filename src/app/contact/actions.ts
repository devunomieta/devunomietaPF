'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function submitInquiry(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string

  if (!name || !email || !message) {
    return redirect('/contact?error=All fields are required')
  }

  const { error } = await supabase.from('inquiries').insert([
    { name, email, message }
  ])

  if (error) {
    return redirect('/contact?error=Failed to send message. Try again later.')
  }

  redirect('/contact?success=true')
}
