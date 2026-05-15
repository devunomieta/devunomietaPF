'use server'

import { createClient } from '@/utils/supabase/server'

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

  // Use a more robust upsert/insert logic
  const { error } = await supabase.from('subscribers').upsert([
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

  return { success: true }
}
