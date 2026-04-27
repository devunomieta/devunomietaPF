'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'



export async function subscribeAction(formData: FormData) {
  const name = formData.get('name') as string
  const display_name = formData.get('display_name') as string
  const email = formData.get('email') as string

  if (!name || !display_name || !email) return { error: 'All fields are required.' }

  const supabase = await createClient()

  // Generate random avatar using DiceBear bottts style
  const avatar_url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(display_name)}`

  // Upsert subscriber based on email
  let subscriberId;
  const { data: existing } = await supabase.from('subscribers').select('id').eq('email', email).single()

  if (existing) {
    subscriberId = existing.id;
  } else {
    const { data, error } = await supabase
      .from('subscribers')
      .insert({ email, name, display_name, avatar_url })
      .select('id')
      .single()
      
    if (error) return { error: 'Failed to subscribe.' }
    subscriberId = data.id;
  }

  // Set cookie to remember subscriber
  const cookieStore = await cookies()
  cookieStore.set('subscriber_id', subscriberId, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/'
  })

  return { success: true }
}

export async function postCommentAction(postId: string, content: string, parentId?: string) {
  const cookieStore = await cookies()
  const subscriberId = cookieStore.get('subscriber_id')?.value

  if (!subscriberId) return { error: 'You must join the newsletter to comment.' }
  if (!content.trim()) return { error: 'Comment cannot be empty.' }

  const supabase = await createClient()

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    subscriber_id: subscriberId,
    parent_id: parentId || null,
    content: content.trim()
  })

  if (error) return { error: 'Failed to post comment.' }

  revalidatePath('/blog/[slug]', 'page')
  return { success: true }
}

export async function reactToPostAction(postId: string, type: 'like' | 'dislike') {
  const supabase = await createClient()
  
  // Fetch current post counts
  const { data: post } = await supabase.from('posts').select('likes, dislikes').eq('id', postId).single()
  if (!post) return { error: 'Post not found' }
  
  const updateData = type === 'like' 
    ? { likes: (post.likes || 0) + 1 }
    : { dislikes: (post.dislikes || 0) + 1 }

  const { error } = await supabase.from('posts').update(updateData).eq('id', postId)
  
  if (error) return { error: 'Failed to add reaction' }
  
  revalidatePath('/blog/[slug]', 'page')
  return { success: true }
}
