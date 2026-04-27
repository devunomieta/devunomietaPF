'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/requireAdmin'

export async function saveAcademic(formData: FormData, id?: string) {
  const supabase = await requireAdmin()

  const academicData = {
    category: formData.get('category') as string,
    title: formData.get('title') as string,
    subtitle: formData.get('subtitle') as string,
    description: formData.get('description') as string,
    icon_name: formData.get('icon_name') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('academic').update(academicData).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('academic').insert([academicData])
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/manage/academic')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAcademic(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('academic').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/academic')
  return { success: true }
}
