'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function savePost(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const content = formData.get('content') as string
  const is_published = formData.get('is_published') === 'on'
  const post_type = formData.get('post_type') as string || 'markdown'

  // Calculate read time
  const wordCount = content.trim().split(/\s+/).length;
  const read_time = Math.max(1, Math.ceil(wordCount / 200));

  let audio_url = formData.get('existing_audio_url') as string || null;
  let pdf_url = formData.get('existing_pdf_url') as string || null;

  const audioFile = formData.get('audio_file') as File | null;
  const pdfFile = formData.get('pdf_file') as File | null;

  // Supabase Storage Uploads
  if (audioFile && audioFile.size > 0) {
    const fileExt = audioFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { data, error } = await supabase.storage.from('media').upload(`audio/${fileName}`, audioFile)
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(`audio/${fileName}`)
      audio_url = urlData.publicUrl
    }
  }

  if (pdfFile && pdfFile.size > 0) {
    const fileExt = pdfFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { data, error } = await supabase.storage.from('media').upload(`pdf/${fileName}`, pdfFile)
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(`pdf/${fileName}`)
      pdf_url = urlData.publicUrl
    }
  }

  const postData = {
    title,
    slug,
    content,
    is_published,
    post_type,
    audio_url,
    pdf_url,
    read_time,
    updated_at: new Date().toISOString()
  }

  if (id) {
    await supabase.from('posts').update(postData).eq('id', id)
  } else {
    await supabase.from('posts').insert([postData])
  }

  revalidatePath('/blog')
  revalidatePath('/manage/posts')
  redirect('/manage/posts')
}

export async function deletePost(id: string) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', id)
  revalidatePath('/blog')
  revalidatePath('/manage/posts')
}
