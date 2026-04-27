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

export async function markAsRead(id: string, isRead: boolean) {
  const supabase = await checkAdmin()
  const { error } = await supabase.from('inquiries').update({ is_read: isRead }).eq('id', id)

  if (error) {
    console.error('Mark as read error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/inquiries')
  revalidatePath('/manage')
  return { success: true }
}

export async function deleteInquiry(id: string) {
  const supabase = await checkAdmin()
  const { error } = await supabase.from('inquiries').delete().eq('id', id)

  if (error) {
    console.error('Delete inquiry error:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/inquiries')
  revalidatePath('/manage')
  return { success: true }
}
