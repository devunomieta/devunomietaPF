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

export async function saveAcademic(formData: FormData, id?: string) {
  const supabase = await checkAdmin()
  
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

  if (error) {
    console.error('Save academic error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/academic')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAcademic(id: string) {
  const supabase = await checkAdmin()
  const { error } = await supabase.from('academic').delete().eq('id', id)

  if (error) {
    console.error('Delete academic error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/academic')
  return { success: true }
}
