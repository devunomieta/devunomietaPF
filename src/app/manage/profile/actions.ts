'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Basic admin check
  const { data: admin } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase())
    .single()
  if (!admin) throw new Error('Unauthorized')

  const profileData = {
    name: formData.get('name') as string,
    handle: formData.get('handle') as string,
    bio: formData.get('bio') as string,
    about_me: formData.get('about_me') as string,
    location: formData.get('location') as string,
    email: formData.get('email') as string,
    website: formData.get('website') as string,
    avatar_url: formData.get('avatar_url') as string || undefined,
    titles: (formData.get('titles') as string).split(',').map(t => t.trim()),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profile')
    .update(profileData)
    .eq('email', profileData.email) // Or use a specific ID if known, but email is in the schema

  if (error) {
    console.error('Update profile error:', error)
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/manage/profile')
  return { success: true }
}
