'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function updateSettings(formData: FormData) {
  const { supabase } = await getUser()
  const keys = ['site_name', 'site_tagline', 'site_description', 'og_image_url']

  for (const key of keys) {
    const value = formData.get(key) as string
    await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
  }

  revalidatePath('/')
  revalidatePath('/manage/settings')
  return { success: true }
}

export async function uploadAsset(formData: FormData, type: 'logo' | 'favicon' | 'avatar') {
  const { supabase, user } = await getUser()
  const adminStorage = createAdminClient()

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()
  const path = type === 'avatar' 
    ? `avatar-${Date.now()}.${ext}`
    : `${type}-${Date.now()}.${ext}`
  const bucket = type === 'avatar' ? 'avatars' : 'assets'

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await adminStorage.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminStorage.storage.from(bucket).getPublicUrl(path)

  if (type === 'avatar') {
    // Save to profile table
    const { data: profile } = await supabase.from('profile').select('id').limit(1).single()
    if (profile) {
      await supabase.from('profile').update({ avatar_url: publicUrl }).eq('id', profile.id)
    }
    revalidatePath('/')
    revalidatePath('/manage/profile')
  } else {
    // Save to site_settings
    const key = type === 'logo' ? 'logo_url' : 'favicon_url'
    await supabase.from('site_settings').upsert({ key, value: publicUrl }, { onConflict: 'key' })
    revalidatePath('/')
    revalidatePath('/manage/settings')
  }

  return { success: true, url: publicUrl }
}

export async function changePassword(formData: FormData) {
  const { supabase } = await getUser()
  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (newPassword !== confirmPassword) return { error: 'Passwords do not match' }
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
