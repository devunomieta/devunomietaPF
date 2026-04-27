'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/requireAdmin'

export async function saveExperience(formData: FormData, id?: string) {
  const supabase = await requireAdmin()

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

  if (error) return { error: error.message }
  revalidatePath('/manage/experience')
  revalidatePath('/')
  return { success: true }
}

export async function deleteExperience(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('experience').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/experience')
  return { success: true }
}
