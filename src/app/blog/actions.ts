'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sanitizeText, isValidEmail } from '@/lib/sanitize'

export async function subscribeAction(formData: FormData) {
  const name = sanitizeText(formData.get('name') as string)
  const display_name = sanitizeText(formData.get('display_name') as string)
  const email = sanitizeText(formData.get('email') as string).toLowerCase()

  if (!name || !display_name || !email) return { error: 'All fields are required.' }

  if (name.length < 2 || name.length > 100 || display_name.length < 2 || display_name.length > 100) {
    return { error: 'Name and display name must be between 2 and 100 characters.' }
  }

  if (!isValidEmail(email)) {
    return { error: 'Invalid email format.' }
  }

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

export async function postCommentAction(postId: string, rawContent: string, parentId?: string) {
  const cookieStore = await cookies()
  const subscriberId = cookieStore.get('subscriber_id')?.value

  if (!subscriberId) return { error: 'You must join the newsletter to comment.' }
  
  const content = sanitizeText(rawContent)
  if (!content || content.length < 3) return { error: 'Comment must be at least 3 characters.' }
  if (content.length > 1000) return { error: 'Comment is too long (maximum 1000 characters).' }

  const supabase = await createClient()

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    subscriber_id: subscriberId,
    parent_id: parentId || null,
    content: content
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

export async function reactToCommentAction(commentId: string, type: 'like' | 'dislike') {
  const supabase = await createClient()
  
  const { data: comment } = await supabase.from('comments').select('likes, dislikes').eq('id', commentId).single()
  if (!comment) return { error: 'Comment not found' }
  
  const updateData = type === 'like' 
    ? { likes: (comment.likes || 0) + 1 }
    : { dislikes: (comment.dislikes || 0) + 1 }

  const { error } = await supabase.from('comments').update(updateData).eq('id', commentId)
  
  if (error) return { error: 'Failed to add reaction' }
  
  revalidatePath('/blog/[slug]', 'page')
  return { success: true }
}

export async function deleteCommentAction(commentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: 'Failed to delete comment' }
  revalidatePath('/blog/[slug]', 'page')
  return { success: true }
}
