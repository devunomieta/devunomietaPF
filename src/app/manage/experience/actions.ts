'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: admin } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email?.toLowerCase())
    .single()
  if (!admin) throw new Error('Unauthorized')
  return supabase
}

export async function saveExperience(formData: FormData, id?: string) {
  const supabase = await checkAdmin()
  
  const experienceData = {
    role: formData.get('role') as string,
    company: formData.get('company') as string,
    date_range: formData.get('date_range') as string,
    description: formData.get('description') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('experience').update(experienceData).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('experience').insert([experienceData])
    error = err
  }

  if (error) {
    console.error('Save experience error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/experience')
  revalidatePath('/')
  return { success: true }
}

export async function deleteExperience(id: string) {
  const supabase = await checkAdmin()
  const { error } = await supabase.from('experience').delete().eq('id', id)

  if (error) {
    console.error('Delete experience error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/experience')
  return { success: true }
}
