'use server'

import { createClient } from '@/utils/supabase/server'

export async function subscribeAction(email: string, name?: string) {
  const supabase = await createClient()

  if (!email || !email.includes('@')) {
    return { error: 'Invalid email address' }
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
