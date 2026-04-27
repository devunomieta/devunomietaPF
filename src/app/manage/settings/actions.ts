'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getVerifiedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function updateSettings(formData: FormData) {
  await getVerifiedUser()
  // Use admin client to bypass RLS on site_settings writes
  const adminDb = createAdminClient()
  const keys = ['site_name', 'site_tagline', 'site_description', 'og_image_url']

  for (const key of keys) {
    const value = formData.get(key) as string
    const { error } = await adminDb
      .from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' })
    if (error) return { error: `Failed to save ${key}: ${error.message}` }
  }

  revalidatePath('/')
  revalidatePath('/manage/settings')
  return { success: true }
}

export async function uploadAsset(formData: FormData, type: 'logo' | 'favicon' | 'avatar') {
  await getVerifiedUser()
  const adminDb = createAdminClient()

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()
  const path = `${type}-${Date.now()}.${ext}`
  const bucket = type === 'avatar' ? 'avatars' : 'assets'

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await adminDb.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminDb.storage.from(bucket).getPublicUrl(path)

  if (type === 'avatar') {
    const { data: profile } = await adminDb
      .from('profile')
      .select('id')
      .limit(1)
      .single()

    if (profile) {
      const { error } = await adminDb
        .from('profile')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      if (error) return { error: `Avatar saved to storage but DB update failed: ${error.message}` }
    }
    revalidatePath('/')
    revalidatePath('/manage/profile')
  } else {
    const key = type === 'logo' ? 'logo_url' : 'favicon_url'
    const { error } = await adminDb
      .from('site_settings')
      .upsert({ key, value: publicUrl }, { onConflict: 'key' })
    if (error) return { error: `File uploaded but settings not saved: ${error.message}` }
    revalidatePath('/')
    revalidatePath('/manage/settings')
  }

  return { success: true, url: publicUrl }
}

export async function changePassword(formData: FormData) {
  const { supabase } = await getVerifiedUser()
  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (newPassword !== confirmPassword) return { error: 'Passwords do not match' }
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
