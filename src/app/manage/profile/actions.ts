'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const adminDb = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Use service-role to bypass RLS when checking admin status
  const { data: admin } = await adminDb
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase() ?? '')
    .maybeSingle()
  if (!admin) return { error: 'Unauthorized: not in admin list' }

  // Fetch the profile row to get its ID (don't rely on email matching)
  const { data: existing, error: fetchError } = await supabase
    .from('profile')
    .select('id')
    .limit(1)
    .single()

  if (fetchError || !existing) {
    return { error: 'Could not find profile row to update' }
  }

  const titlesRaw = (formData.get('titles') as string) || ''
  const avatarUrl = formData.get('avatar_url') as string

  const profileData: Record<string, unknown> = {
    name: formData.get('name') as string,
    handle: formData.get('handle') as string,
    bio: formData.get('bio') as string,
    about_me: formData.get('about_me') as string,
    location: formData.get('location') as string,
    email: formData.get('email') as string,
    website: formData.get('website') as string,
    titles: titlesRaw ? titlesRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    updated_at: new Date().toISOString(),
  }

  // Only update avatar_url if a new one was uploaded
  if (avatarUrl) {
    profileData.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('profile')
    .update(profileData)
    .eq('id', existing.id)

  if (error) {
    console.error('Update profile error:', error)
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/manage/profile')
  return { success: true }
}
