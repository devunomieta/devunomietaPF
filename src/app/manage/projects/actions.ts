'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/requireAdmin'

export async function saveProject(formData: FormData, id?: string) {
  const supabase = await requireAdmin()
  
  const projectData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    language: formData.get('language') as string,
    language_color: formData.get('language_color') as string,
    stars: parseInt(formData.get('stars') as string) || 0,
    forks: parseInt(formData.get('forks') as string) || 0,
    visibility: formData.get('visibility') as string,
    link: formData.get('link') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
    is_featured: formData.get('is_featured') === 'on',
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('projects').update(projectData).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('projects').insert([projectData])
    error = err
  }

  if (error) return { error: error.message }

  revalidatePath('/manage/projects')
  revalidatePath('/projects')
  revalidatePath('/')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/manage/projects')
  revalidatePath('/projects')
  return { success: true }
}
